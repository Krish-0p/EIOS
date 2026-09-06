"""Domain B: e-commerce signals from the substrate's own order stream.

Joins the `orders` topic as a third consumer group alongside accounting and
fraud-detection. Messages are protobuf-encoded OrderResult, produced by the
checkout service.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from confluent_kafka import Consumer, KafkaError

import config
from demo_pb2 import OrderResult
from schemas import Domain, Entity, EntityKind, NormalizedEvent
from sink import Sink

log = logging.getLogger("eios.kafka")


def _money(m) -> float:
    """Protobuf Money to a float. nanos are 10^-9 units and may be negative."""
    return float(m.units) + m.nanos / 1_000_000_000


def to_event(order: OrderResult) -> NormalizedEvent:
    item_total = sum(_money(i.cost) * i.item.quantity for i in order.items)
    shipping = _money(order.shipping_cost)
    quantity = sum(i.item.quantity for i in order.items)
    currencies = {i.cost.currency_code for i in order.items if i.cost.currency_code}

    return NormalizedEvent(
        domain=Domain.ECOMMERCE,
        source=f"kafka:{config.ORDERS_TOPIC}",
        observed_at=datetime.now(timezone.utc),
        entity=Entity(kind=EntityKind.ORDER, id=order.order_id, service="checkout"),
        metrics={
            "order_total": round(item_total + shipping, 6),
            "item_total": round(item_total, 6),
            "shipping_cost": round(shipping, 6),
            "item_quantity": float(quantity),
            "distinct_products": float(len(order.items)),
        },
        attributes={
            "currency": order.shipping_cost.currency_code,
            "item_currencies": ",".join(sorted(currencies)),
            "country": order.shipping_address.country,
            "city": order.shipping_address.city,
            "state": order.shipping_address.state,
            "tracking_id": order.shipping_tracking_id,
        },
        raw_ref=f"order:{order.order_id}",
    )


def run(sink: Sink, stop: object) -> None:
    consumer = Consumer(
        {
            "bootstrap.servers": config.KAFKA_ADDR,
            "group.id": config.CONSUMER_GROUP,
            "auto.offset.reset": "latest",
            "enable.auto.commit": True,
        }
    )
    consumer.subscribe([config.ORDERS_TOPIC])
    log.info("consuming %s as group %s", config.ORDERS_TOPIC, config.CONSUMER_GROUP)

    try:
        while not stop.is_set():
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    log.error("kafka error: %s", msg.error())
                continue

            order = OrderResult()
            try:
                order.ParseFromString(msg.value())
            except Exception:
                log.exception("could not decode OrderResult, skipping")
                continue

            sink.emit(to_event(order))
            log.info("order %s ingested", order.order_id)
    finally:
        consumer.close()
