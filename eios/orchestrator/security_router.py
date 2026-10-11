"""Security API endpoints."""
from __future__ import annotations
import os
from fastapi import APIRouter
import db

router = APIRouter(prefix="/api/security", tags=["security"])


@router.get("/status")
def security_status() -> dict:
    return {
        "security_enabled": bool(os.getenv("EIOS_API_KEY")),
        "rate_limiting": {
            "requests_per_window": int(os.getenv("EIOS_RATE_LIMIT_REQUESTS", 200)),
            "window_seconds": int(os.getenv("EIOS_RATE_LIMIT_WINDOW", 60)),
        },
        "redaction_enabled": os.getenv("EIOS_REDACTION_ENABLED", "true").lower() == "true",
        "audit_integrity": os.getenv("EIOS_AUDIT_INTEGRITY_ENABLED", "true").lower() == "true",
        "cors_origins": os.getenv("EIOS_CORS_ORIGINS", "http://localhost:5173").split(","),
        "version": "1.0.0",
    }


@router.get("/audit")
def security_audit() -> list[dict]:
    return db.audit_entries()


@router.get("/alerts")
def security_alerts() -> list[dict]:
    return db.security_alerts()
