"""Fan a normalized event out to Kafka and Postgres.

Kafka carries it to detection in near real time; Postgres keeps it for the
investigation timeline and for training the Stage 3 models. Postgres failure
must not stop the live path, so it is caught and logged rather than raised.
"""

from __future__ import annotations

import json
import logging
import threading

import psycopg
from confluent_kafka import Producer

import config
from schemas import NormalizedEvent

try:
    from security.redactor import redact_event as _redact_event
except ImportError:
    def _redact_event(e): return e  # graceful fallback if security module missing

log = logging.getLogger("eios.sink")

_INSERT = """
INSERT INTO events (
    event_id, schema_version, domain, source, observed_at, ingested_at,
    entity_kind, entity_id, entity_service, metrics, attributes,
    trace_id, raw_ref
) VALUES (
    %(event_id)s, %(schema_version)s, %(domain)s, %(source)s, %(observed_at)s,
    %(ingested_at)s, %(entity_kind)s, %(entity_id)s, %(entity_service)s,
    %(metrics)s, %(attributes)s, %(trace_id)s, %(raw_ref)s
)
ON CONFLICT (event_id) DO NOTHING
"""


class Sink:
    def __init__(self) -> None:
        self._producer = Producer({"bootstrap.servers": config.KAFKA_ADDR})
        self._lock = threading.Lock()
        self._conn = psycopg.connect(config.POSTGRES_DSN, autocommit=True)

    def emit(self, event: NormalizedEvent) -> None:
        safe = _redact_event(event)
        if safe.attributes != event.attributes:
            log.warning("PII redacted from event %s", event.event_id)
        payload = safe.model_dump_json()
        self._producer.produce(
            config.EVENTS_TOPIC,
            key=safe.entity.key().encode(),
            value=payload.encode(),
        )
        self._producer.poll(0)

        row = {
            "event_id": str(safe.event_id),
            "schema_version": safe.schema_version,
            "domain": safe.domain.value,
            "source": safe.source,
            "observed_at": safe.observed_at,
            "ingested_at": safe.ingested_at,
            "entity_kind": safe.entity.kind.value,
            "entity_id": safe.entity.id,
            "entity_service": safe.entity.service,
            "metrics": json.dumps(safe.metrics),
            "attributes": json.dumps(safe.attributes),
            "trace_id": safe.trace_id,
            "raw_ref": safe.raw_ref,
        }
        try:
            with self._lock, self._conn.cursor() as cur:
                cur.execute(_INSERT, row)
        except Exception:
            log.exception("postgres insert failed, event still went to kafka")

    def close(self) -> None:
        self._producer.flush(5)
        self._conn.close()
