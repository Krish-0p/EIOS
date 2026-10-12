"""Persist events and their Kafka delivery intent in one PostgreSQL transaction."""
from __future__ import annotations
import json
import logging
import threading
import uuid

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from confluent_kafka import Producer
import config
from schemas import NormalizedEvent
from security.redactor import redact_event
from intelligence.migrate import migrate

log = logging.getLogger("eios.sink")

class Sink:
    def __init__(self):
        self._producer = Producer({"bootstrap.servers":config.KAFKA_ADDR,
            "enable.idempotence":True,"message.timeout.ms":10000})
        self._lock = threading.Lock()
        self._conn = psycopg.connect(config.POSTGRES_DSN,autocommit=True,row_factory=dict_row)
        migrate(self._conn)

    def _reconnect(self):
        if self._conn.closed:
            self._conn = psycopg.connect(config.POSTGRES_DSN,autocommit=True,row_factory=dict_row)

    def emit(self,event: NormalizedEvent):
        safe = redact_event(event)
        payload = safe.model_dump(mode="json")
        with self._lock:
            self._reconnect()
            with self._conn.transaction():
                self._conn.execute("""INSERT INTO events(event_id,schema_version,domain,source,observed_at,ingested_at,
                    entity_kind,entity_id,entity_service,metrics,attributes,trace_id,raw_ref)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""",(
                    safe.event_id,safe.schema_version,safe.domain.value,safe.source,safe.observed_at,safe.ingested_at,
                    safe.entity.kind.value,safe.entity.id,safe.entity.service,Jsonb(safe.metrics),Jsonb(safe.attributes),
                    safe.trace_id,safe.raw_ref))
                message_id = uuid.uuid5(uuid.NAMESPACE_URL,f"{config.EVENTS_TOPIC}:{safe.event_id}")
                self._conn.execute("""INSERT INTO intelligence_outbox(message_id,topic,message_key,payload)
                    VALUES(%s,%s,%s,%s) ON CONFLICT DO NOTHING""",(
                    message_id,config.EVENTS_TOPIC,safe.entity.key(),Jsonb(payload)))

    def publish_pending(self,limit=200):
        with self._lock:
            self._reconnect()
            messages = self._conn.execute("""SELECT * FROM intelligence_outbox
                WHERE topic=%s AND published_at IS NULL ORDER BY created_at LIMIT %s""",(config.EVENTS_TOPIC,limit)).fetchall()
        for message in messages:
            acknowledged = []
            self._producer.produce(message["topic"],key=message["message_key"].encode(),
                value=json.dumps(message["payload"],allow_nan=False).encode(),
                on_delivery=lambda error,result,target=acknowledged:target.append(error))
            self._producer.flush(2)
            error = str(acknowledged[0]) if acknowledged and acknowledged[0] else None
            if not acknowledged:
                error = "delivery acknowledgement timed out"
            with self._lock:
                self._conn.execute("""UPDATE intelligence_outbox SET attempts=attempts+1,last_error=%s,
                    published_at=CASE WHEN %s::text IS NULL THEN NOW() ELSE NULL END WHERE message_id=%s""",
                    (error,error,message["message_id"]))
            if error:
                break

    def close(self):
        self._producer.flush(3)
        self._conn.close()
