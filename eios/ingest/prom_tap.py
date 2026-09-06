"""Domain C: infrastructure signals from Prometheus.

The demo pushes metrics over OTLP rather than being scraped, so there is no
`up` series — absence of it is normal, not a fault. Resource attributes are
promoted to labels, which is what makes `container_name` available here.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

import config
from schemas import Domain, Entity, EntityKind, NormalizedEvent
from sink import Sink

log = logging.getLogger("eios.prom")

# Metric name in Prometheus -> feature name on the event.
QUERIES = {
    "container_cpu_utilization_ratio": "cpu_ratio",
    "container_memory_percent_ratio": "memory_ratio",
}


def _query(client: httpx.Client, expr: str) -> list[dict]:
    resp = client.get("/api/v1/query", params={"query": expr}, timeout=15.0)
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != "success":
        log.warning("query %s returned %s", expr, body.get("status"))
        return []
    return body["data"]["result"]


def collect(client: httpx.Client) -> list[NormalizedEvent]:
    """One event per container, carrying every metric we resolved for it."""
    observed_at = datetime.now(timezone.utc)
    per_container: dict[str, dict[str, float]] = {}

    for expr, feature in QUERIES.items():
        for series in _query(client, expr):
            labels = series.get("metric", {})
            name = labels.get("container_name") or labels.get("service_name")
            if not name:
                continue
            try:
                value = float(series["value"][1])
            except (KeyError, IndexError, ValueError):
                continue
            per_container.setdefault(name, {})[feature] = value

    return [
        NormalizedEvent(
            domain=Domain.INFRASTRUCTURE,
            source="prometheus",
            observed_at=observed_at,
            entity=Entity(kind=EntityKind.CONTAINER, id=name, service=name),
            metrics=metrics,
            attributes={"collector": "eios-ingest"},
        )
        for name, metrics in per_container.items()
        if metrics
    ]


def run(sink: Sink, stop: object) -> None:
    log.info("polling %s every %ss", config.PROMETHEUS_URL, config.PROM_POLL_SECONDS)
    with httpx.Client(base_url=config.PROMETHEUS_URL) as client:
        while not stop.is_set():
            try:
                events = collect(client)
                for event in events:
                    sink.emit(event)
                log.info("polled prometheus, %d container events", len(events))
            except Exception:
                log.exception("prometheus poll failed, will retry")
            stop.wait(config.PROM_POLL_SECONDS)
