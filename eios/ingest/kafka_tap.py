"""Domain B: e-commerce signals from the substrate's own order stream.

Joins the `orders` topic as a third consumer group alongside accounting and
fraud-detection. Messages are protobuf-encoded OrderResult, produced by the
checkout service.
"""

from __future__ import annotations

import logging
import time
import uuid
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


def to_event(order: OrderResult, observed_at=None, message_key=None) -> NormalizedEvent:
    item_total = sum(_money(i.cost) * i.item.quantity for i in order.items)
    shipping = _money(order.shipping_cost)
    quantity = sum(i.item.quantity for i in order.items)
    currencies = {i.cost.currency_code for i in order.items if i.cost.currency_code}

    return NormalizedEvent(
        domain=Domain.ECOMMERCE,
        source=f"kafka:{config.ORDERS_TOPIC}",
        event_id=uuid.uuid5(uuid.NAMESPACE_URL,message_key or f"order:{order.order_id}"),
        observed_at=observed_at or datetime.now(timezone.utc),
        entity=Entity(kind=EntityKind.ORDER, id=order.order_id, service="checkout"),
        metrics={
            "order_total": round(item_total + shipping, 6),
            "item_total": round(item_total, 6),
            "shipping_cost": round(shipping, 6),
            "item_quantity": float(quantity),
            "distinct_products": float(len(order.items)),
        },
        attributes={
            "observation_clock": "kafka_message_timestamp" if observed_at else "ingestion_time",
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
            "enable.auto.commit": False,
            "enable.auto.offset.store": False,
        }
    )
    consumer.subscribe([config.ORDERS_TOPIC])
    log.info("consuming %s as group %s", config.ORDERS_TOPIC, config.CONSUMER_GROUP)
    last_health = 0.0

    try:
        while not stop.is_set():
            msg = consumer.poll(1.0)
            if time.monotonic() - last_health >= 30:
                last_health = time.monotonic()
                assignment = consumer.assignment()
                if assignment:
                    try:
                        # A fresh broker request, not a silent poll, establishes
                        # source health for zero-order throughput windows.
                        watermarks = [consumer.get_watermark_offsets(p, timeout=2, cached=False) for p in assignment]
                        positions = consumer.position(assignment)
                        caught_up = all(p.offset >= high for p, (_, high) in zip(positions, watermarks))
                        if caught_up:
                            sink.emit(NormalizedEvent(
                                domain=Domain.ECOMMERCE, source="kafka:orders:health",
                                observed_at=datetime.now(timezone.utc),
                                entity=Entity(kind=EntityKind.SERVICE,id="checkout",service="checkout"),
                                metrics={"orders_source_healthy":1.0},
                                attributes={"collector":"eios-ingest","feature_version":"2.0"},
                            ))
                    except Exception:
                        log.warning("orders source health unavailable")
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
                consumer.commit(message=msg,asynchronous=False)
                continue

            _, timestamp_ms = msg.timestamp()
            observed_at = datetime.fromtimestamp(timestamp_ms/1000,timezone.utc) if timestamp_ms and timestamp_ms > 0 else None
            event = to_event(order,observed_at,f"kafka:{msg.topic()}:{msg.partition()}:{msg.offset()}")
            while not stop.is_set():
                try:
                    sink.emit(event)
                    consumer.commit(message=msg,asynchronous=False)
                    break
                except Exception:
                    log.exception("order persistence unavailable; retrying before offset commit")
                    stop.wait(2)
            log.info("order %s ingested", order.order_id)
    finally:
        consumer.close()
