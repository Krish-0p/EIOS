"""eios-orchestrator: the API and live feed the dashboard reads.

Stage 2 scope. It serves incidents, events and stats, records fault windows,
and pushes new incidents to connected clients over a WebSocket.

Coordinating the investigation, correlation and threat-intel agents is Stage 4;
this is the process those agents will live in.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import threading
from typing import Any

from confluent_kafka import Consumer, KafkaError
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import db
import flags

logging.basicConfig(
    level=config.LOG_LEVEL,
    format="%(asctime)s %(levelname)-7s %(name)s %(message)s",
)
log = logging.getLogger("eios.orchestrator")


class Hub:
    """Fans incidents out to every connected dashboard.

    The Kafka consumer runs in a plain thread, so it hands messages to the
    event loop with call_soon_threadsafe rather than touching sockets itself.
    """

    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self.loop: asyncio.AbstractEventLoop | None = None

    async def join(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)
        log.info("dashboard connected, %d total", len(self._clients))

    async def leave(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def _broadcast(self, payload: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._clients)
        dead = []
        for ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._clients.discard(ws)

    def publish_threadsafe(self, payload: dict[str, Any]) -> None:
        if self.loop is None:
            return
        asyncio.run_coroutine_threadsafe(self._broadcast(payload), self.loop)


hub = Hub()
_stop = threading.Event()


def consume_incidents() -> None:
    consumer = Consumer(
        {
            "bootstrap.servers": config.KAFKA_ADDR,
            "group.id": config.CONSUMER_GROUP,
            "auto.offset.reset": "latest",
            "enable.auto.commit": True,
        }
    )
    consumer.subscribe([config.INCIDENTS_TOPIC])
    log.info("consuming %s", config.INCIDENTS_TOPIC)
    try:
        while not _stop.is_set():
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    log.error("kafka error: %s", msg.error())
                continue
            try:
                incident = json.loads(msg.value())
            except Exception:
                log.exception("bad incident payload")
                continue
            hub.publish_threadsafe({"type": "incident", "data": incident})
    finally:
        consumer.close()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    db.pool.open()
    hub.loop = asyncio.get_running_loop()
    worker = threading.Thread(target=consume_incidents, name="incidents", daemon=True)
    worker.start()
    log.info("orchestrator ready")
    yield
    _stop.set()
    worker.join(timeout=5)
    db.pool.close()


app = FastAPI(title="EIOS Orchestrator", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartFault(BaseModel):
    flag_key: str
    variant: str = "on"
    expected_domain: str | None = None
    expected_entity: str | None = None
    notes: str | None = None
    apply: bool = True
    """Flip the flag in flagd as well as recording the window."""


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/stats")
def get_stats() -> dict:
    return db.stats()


@app.get("/api/incidents")
def get_incidents(
    limit: int = Query(50, ge=1, le=500),
    domain: str | None = None,
) -> list[dict]:
    return db.incidents(limit=limit, domain=domain)


@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str) -> dict:
    found = db.incident(incident_id)
    if not found:
        raise HTTPException(status_code=404, detail="No incident with that id")
    found["evidence"] = db.evidence_events(incident_id)
    return found


@app.get("/api/events")
def get_events(
    limit: int = Query(100, ge=1, le=1000),
    domain: str | None = None,
) -> list[dict]:
    return db.events(limit=limit, domain=domain)


@app.get("/api/faults")
def get_faults() -> list[dict]:
    return db.fault_windows()


@app.post("/api/faults/start")
def post_fault_start(body: StartFault) -> dict:
    """Record that a fault is being injected.

    This writes the ground-truth window only. Toggle the flag itself in the
    flagd UI - an unrecorded fault cannot be scored later.
    """
    applied = None
    if body.apply:
        if not flags.available():
            raise HTTPException(
                status_code=503,
                detail="flagd config is not mounted; toggle in the flagd UI instead",
            )
        try:
            applied = flags.set_variant(body.flag_key, body.variant)
        except flags.FlagError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Fall back to the known expectation for this flag, so a window recorded
    # from the dashboard is still scoped enough to attribute incidents.
    default_domain, default_entity = flags.expectation(body.flag_key)
    row = db.start_fault(
        body.flag_key,
        body.variant,
        body.expected_domain or default_domain,
        body.expected_entity or default_entity,
        body.notes,
    )
    return {**row, "applied": applied, "toggle_at": config.FLAGD_UI_URL}


@app.post("/api/faults/{window_id}/stop")
def post_fault_stop(window_id: str) -> dict:
    row = db.stop_fault(window_id)
    if not row:
        raise HTTPException(status_code=404, detail="No open fault window with that id")

    cleared = None
    if flags.available():
        try:
            cleared = flags.turn_off(row["flag_key"])
        except flags.FlagError:
            log.exception("could not turn off %s", row["flag_key"])
    return {**row, "cleared": cleared}


@app.get("/api/flags")
def get_flags() -> list[dict]:
    if not flags.available():
        raise HTTPException(status_code=503, detail="flagd config is not mounted")
    return flags.list_flags()


@app.get("/api/scoreboard")
def get_scoreboard() -> list[dict]:
    return db.scoreboard()


@app.websocket("/ws")
async def websocket(ws: WebSocket) -> None:
    await hub.join(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(ws)
