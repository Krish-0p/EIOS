"""Canonical container and server-span metrics with source freshness.

Legacy cpu_ratio/memory_ratio remain percentages for compatibility.
New cpu_cores/memory_fraction use explicit units; missing data remains absent.
"""
from __future__ import annotations
import logging
import math
import os
from datetime import datetime, timezone
import httpx
import config
from schemas import Domain, Entity, EntityKind, NormalizedEvent
from sink import Sink

log = logging.getLogger("eios.prom")
CPU_SCALE = float(os.getenv("EIOS_CPU_SOURCE_SCALE", "0.01"))
MEMORY_SCALE = float(os.getenv("EIOS_MEMORY_SOURCE_SCALE", "0.01"))
FRESH_SECONDS = 180

def _query(client, expr):
    response = client.get("/api/v1/query", params={"query": expr}, timeout=15)
    response.raise_for_status()
    body = response.json()
    if body.get("status") != "success":
        raise ValueError(f"Prometheus rejected {expr}")
    return body["data"]["result"]

def _values(series, label):
    result = {}
    for item in series:
        key = item.get("metric", {}).get(label)
        try:
            timestamp, value = map(float, item["value"])
            if key and math.isfinite(value) and value >= 0:
                result[key] = (timestamp, value)
        except (KeyError, TypeError, IndexError, ValueError):
            continue
    return result

def collect(client):
    now = datetime.now(timezone.utc)
    events = []
    for expr, legacy, canonical, scale in (
        ("container_cpu_utilization_ratio", "cpu_ratio", "cpu_cores", CPU_SCALE),
        ("container_memory_percent_ratio", "memory_ratio", "memory_fraction", MEMORY_SCALE),
    ):
        try:
            samples = _values(_query(client, expr), "container_name")
            times = _values(_query(client, f"timestamp({expr})"), "container_name")
            for name, (_, value) in samples.items():
                if name not in times:
                    continue
                at = datetime.fromtimestamp(times[name][1], timezone.utc)
                if not 0 <= (now - at).total_seconds() <= FRESH_SECONDS:
                    continue
                scaled = value * scale
                if canonical == "memory_fraction" and scaled > 1.05:
                    log.warning("invalid memory unit for %s: %s", name, value)
                    continue
                events.append(NormalizedEvent(
                    domain=Domain.INFRASTRUCTURE, source="prometheus", observed_at=at,
                    entity=Entity(kind=EntityKind.CONTAINER, id=name, service=name),
                    metrics={legacy: value, canonical: scaled},
                    attributes={"collector": "eios-ingest", "feature_version": "2.0",
                                "unit": "cores" if canonical == "cpu_cores" else "fraction"},
                ))
        except Exception:
            log.exception("container metric unavailable: %s", expr)

    # Filter inbound server spans to avoid double-counting client spans.
    selector = '{span_kind="SPAN_KIND_SERVER"}'
    errored = '{span_kind="SPAN_KIND_SERVER",status_code="STATUS_CODE_ERROR"}'
    calls_expr = f"sum by(service_name)(rate(traces_span_metrics_calls_total{selector}[5m]))"
    errors_expr = f"sum by(service_name)(rate(traces_span_metrics_calls_total{errored}[5m]))"
    try:
        calls = _values(_query(client, calls_expr), "service_name")
        errors = _values(_query(client, f"({errors_expr}) or on(service_name) (({calls_expr}) * 0)"), "service_name")
        times = _values(_query(client,
            f"max by(service_name)(timestamp(traces_span_metrics_calls_total{selector}))"), "service_name")
        p95 = _values(_query(client,
            "histogram_quantile(0.95, sum by(service_name,le)(rate("
            f"traces_span_metrics_duration_milliseconds_bucket{selector}[5m])))"), "service_name")
        for name, (_, rate) in calls.items():
            if name not in times:
                continue
            source_at = datetime.fromtimestamp(times[name][1], timezone.utc)
            if not 0 <= (now - source_at).total_seconds() <= FRESH_SECONDS:
                continue
            metrics = {"request_rate_per_sec": rate}
            if name in errors:
                metrics["error_rate_per_sec"] = errors[name][1]
                if rate > 0:
                    metrics["error_fraction"] = min(1.0, errors[name][1] / rate)
            if name in p95 and rate > 0:
                metrics["latency_p95_ms"] = p95[name][1]
            events.append(NormalizedEvent(
                domain=Domain.INFRASTRUCTURE, source="prometheus:spanmetrics", observed_at=now,
                entity=Entity(kind=EntityKind.SERVICE, id=name, service=name),
                metrics=metrics, attributes={"collector": "eios-ingest", "feature_version": "2.0",
                    "source_observed_at": source_at.isoformat(), "rate_window": "5m"},
            ))
    except Exception:
        log.exception("server span metrics unavailable")
    return events

def run(sink: Sink, stop):
    log.info("polling %s every %ss", config.PROMETHEUS_URL, config.PROM_POLL_SECONDS)
    with httpx.Client(base_url=config.PROMETHEUS_URL) as client:
        while not stop.is_set():
            try:
                events = collect(client)
                for event in events:
                    sink.emit(event)
                log.info("persisted %d metric events", len(events))
            except Exception:
                log.exception("prometheus poll failed")
            stop.wait(config.PROM_POLL_SECONDS)
