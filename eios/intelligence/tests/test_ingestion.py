"""Raw event outbox persists before source offsets may advance."""
from datetime import datetime, timezone
import importlib.util
import os
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

import psycopg
from schemas import Domain, Entity, EntityKind, NormalizedEvent

DSN = os.getenv("EIOS_TEST_DSN")


class FakeProducer:
    def __init__(self,*args):
        self.error = None
    def produce(self,topic,key,value,on_delivery):
        on_delivery(self.error,None)
    def flush(self,seconds):
        return 0


@unittest.skipUnless(DSN,"EIOS_TEST_DSN must point to a disposable database")
class IngestionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[2]
        with psycopg.connect(DSN,autocommit=True) as conn:
            if not conn.execute("SELECT current_database()").fetchone()[0].endswith("_test"):
                raise RuntimeError("Integration database name must end with _test")
            conn.execute((root/"db/init.sql").read_text(),prepare=False)
        spec = importlib.util.spec_from_file_location("tested_durable_sink",root/"ingest/sink.py")
        cls.module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = cls.module
        with patch.dict(sys.modules,{"config":types.SimpleNamespace(POSTGRES_DSN=DSN,KAFKA_ADDR="unused",EVENTS_TOPIC="eios.events")}):
            spec.loader.exec_module(cls.module)
        cls.module.Producer = FakeProducer

    def setUp(self):
        self.sink = self.module.Sink()
        self.transaction = self.sink._conn.transaction(force_rollback=True)
        self.transaction.__enter__()

    def tearDown(self):
        self.transaction.__exit__(None,None,None)
        self.sink.close()

    def test_event_and_delivery_intent_deduplicate_together(self):
        event = NormalizedEvent(domain=Domain.INFRASTRUCTURE,source="test",observed_at=datetime.now(timezone.utc),
            entity=Entity(kind=EntityKind.CONTAINER,id="ingestion-test"),attributes={"message":"password=secret"})
        self.sink.emit(event)
        self.sink.emit(event)
        conn = self.sink._conn
        self.assertEqual(conn.execute("SELECT count(*) AS count FROM events WHERE event_id=%s",(event.event_id,)).fetchone()["count"],1)
        messages = conn.execute("SELECT * FROM intelligence_outbox WHERE payload->>'event_id'=%s",(str(event.event_id),)).fetchall()
        self.assertEqual(len(messages),1)
        self.assertNotIn("secret",messages[0]["payload"]["attributes"]["message"])
        self.sink._producer.error = "broker unavailable"
        self.sink.publish_pending()
        self.assertIsNone(conn.execute("SELECT published_at FROM intelligence_outbox WHERE message_id=%s",(messages[0]["message_id"],)).fetchone()["published_at"])
        self.sink._producer.error = None
        self.sink.publish_pending()
        self.assertIsNotNone(conn.execute("SELECT published_at FROM intelligence_outbox WHERE message_id=%s",(messages[0]["message_id"],)).fetchone()["published_at"])
