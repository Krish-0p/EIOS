"""FastAPI security middleware for EIOS orchestrator."""
from __future__ import annotations
import ipaddress, logging, os, time, uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

log = logging.getLogger("eios.security")
_API_KEY = os.getenv("EIOS_API_KEY", "")
_SKIP_AUTH = {"/health", "/ws", "/api/security/status", "/api/auth/login", "/api/auth/register"}
_MAX_BYTES = int(os.getenv("EIOS_MAX_REQUEST_BYTES", 1_048_576))


def get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")
    try:
        ipaddress.ip_address(ip)
        return ip
    except ValueError:
        return "unknown"


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = str(uuid.uuid4())
        request.state.request_id = rid
        request.state.client_ip = get_client_ip(request)

        # API key guard
        if _API_KEY and request.url.path.startswith("/api/") and request.url.path not in _SKIP_AUTH:
            if request.headers.get("x-api-key", "") != _API_KEY:
                return JSONResponse({"error": "Unauthorized", "request_id": rid}, status_code=401)

        t0 = time.monotonic()
        response = await call_next(request)
        ms = int((time.monotonic() - t0) * 1000)

        response.headers["x-request-id"] = rid
        response.headers["x-content-type-options"] = "nosniff"
        response.headers["x-frame-options"] = "DENY"
        response.headers["referrer-policy"] = "strict-origin-when-cross-origin"

        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            log.info("%s %s %dms rid=%s ip=%s", request.method, request.url.path, ms, rid, request.state.client_ip)

        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > _MAX_BYTES:
            return JSONResponse({"error": "Request too large"}, status_code=413)
        return await call_next(request)
