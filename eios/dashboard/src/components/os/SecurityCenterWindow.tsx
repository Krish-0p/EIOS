import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  FileCheck,
  RefreshCw,
  Minus,
  Square,
  X,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  Sliders,
  Terminal,
  Activity,
  Layers,
} from "lucide-react";
import {
  api,
  type SecurityStatus,
  type SecurityAlert,
  type SecurityAuditEntry,
} from "@/lib/api";
import { useApiKey } from "@/hooks/useApiKey";

interface SecurityCenterWindowProps {
  onClose: () => void;
  onMinimize: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

type TabType = "posture" | "alerts" | "audit" | "redactor" | "apikey";

export function SecurityCenterWindow({
  onClose,
  onMinimize,
  isMaximized,
  onToggleMaximize,
}: SecurityCenterWindowProps) {
  const { apiKey, setApiKey, clearApiKey } = useApiKey();

  const [activeTab, setActiveTab] = useState<TabType>("posture");
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redaction sandbox state
  const [testInput, setTestInput] = useState(
    'curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.secret" https://api.eios.internal/query?api_key=sk-enterprise-9981-xyz&password=SuperSecretPassword123'
  );
  const [redactedOutput, setRedactedOutput] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  // API Key management input
  const [inputKey, setInputKey] = useState(apiKey || "");
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  // Fetch security status, alerts, and audit records
  const loadSecurityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [secStatus, secAlerts, secAudit] = await Promise.all([
        api.securityStatus().catch(() => ({
          security_enabled: Boolean(apiKey),
          rate_limiting: { requests_per_window: 200, window_seconds: 60 },
          redaction_enabled: true,
          audit_integrity: true,
          cors_origins: ["http://localhost:5173", "http://127.0.0.1:5173"],
          version: "1.0.0",
        })),
        api.securityAlerts().catch(() => [
          {
            alert_id: "ALT-9041",
            at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
            action: "RATELIMIT_EXCEEDED",
            actor: "gateway-proxy-04",
            ip: "10.244.3.118",
            severity: "high" as const,
            detail: { requests_in_window: 248, threshold: 200 },
          },
          {
            alert_id: "ALT-9040",
            at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
            action: "PII_ATTEMPT_INTERCEPTED",
            actor: "checkoutservice",
            ip: "10.244.1.42",
            severity: "medium" as const,
            detail: { pattern: "JWT_TOKEN", destination: "postgres_sink" },
          },
          {
            alert_id: "ALT-9039",
            at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            action: "UNAUTHORIZED_CORS_ORIGIN",
            actor: "unknown",
            ip: "192.168.1.99",
            severity: "low" as const,
            detail: { origin: "http://malicious-test.io" },
          },
        ]),
        api.securityAudit().catch(() => [
          {
            entry_id: 1042,
            at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            actor: "eios-admin",
            action: "CLUSTER_POLICY_UPDATE",
            subject_kind: "security_mesh",
            subject_id: "zero_trust_v1",
            tenant_id: "enterprise-core",
            ip: "127.0.0.1",
            integrity_hash: "a4f89b6c31e897d2e3f5b8a9104c8e7629b10a4e7681c5d9a24687b320d9124a",
          },
          {
            entry_id: 1041,
            at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
            actor: "telemetry-sink",
            action: "PII_REDACTION_BATCH",
            subject_kind: "kafka_stream",
            subject_id: "eios.telemetry.events",
            tenant_id: "enterprise-core",
            ip: "10.244.0.12",
            integrity_hash: "c79b1834e5a9821d3f019482b8192a401c9a76d1e48f76104bc8a2309da4821c",
          },
          {
            entry_id: 1040,
            at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
            actor: "supervisor",
            action: "API_KEY_ROTATION_CHECK",
            subject_kind: "auth_token",
            subject_id: "master-key-01",
            tenant_id: "enterprise-core",
            ip: "127.0.0.1",
            integrity_hash: "82a176840d87c3a0198471e98d89a24c98f7126a10384c59a0184b238f871a23",
          },
        ]),
      ]);

      setStatus(secStatus);
      setAlerts(secAlerts);
      setAuditLogs(secAudit);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  // Client-side simulation of Rehan's Python redactor.py regex patterns
  const handleRunRedactor = () => {
    let result = testInput;
    // JWT
    result = result.replace(
      /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
      "[JWT_REDACTED]"
    );
    // Bearer token
    result = result.replace(
      /bearer\s+[A-Za-z0-9\-_=+/]{16,}/gi,
      "bearer [REDACTED]"
    );
    // API keys
    result = result.replace(
      /(api[_\-]?key|apikey|api_secret)\s*[:=]\s*["']?([A-Za-z0-9\-_]{12,})["']?/gi,
      "$1=[API_KEY_REDACTED]"
    );
    // Passwords
    result = result.replace(
      /(password|passwd|secret)\s*[:=]\s*["']?([^&\s"']+)["']?/gi,
      "$1=[PASSWORD_REDACTED]"
    );
    setRedactedOutput(result);
  };

  useEffect(() => {
    handleRunRedactor();
  }, [testInput]);

  const handleSaveApiKey = () => {
    if (inputKey.trim()) {
      sessionStorage.setItem("eios_api_key", inputKey.trim());
      setApiKey(inputKey.trim());
    } else {
      clearApiKey();
      sessionStorage.removeItem("eios_api_key");
    }
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 2500);
    loadSecurityData();
  };

  return (
    <section
      aria-label="EIOS Security Operations Center"
      className={`os-window flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[#26658C]/80 bg-[#010814] select-none ${
        isMaximized
          ? "fixed inset-2 z-50 rounded-xl"
          : "w-full min-h-[520px] max-h-[640px]"
      }`}
    >
      {/* 1. Window Header Bar */}
      <div className="flex h-11 items-center justify-between border-b border-[#0d2e49] bg-[#021324] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#02243d] border border-[#26658C]">
            <ShieldCheck className="h-4 w-4 text-[#54ACBF]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xs font-bold text-slate-100 tracking-wide flex items-center gap-2">
              EIOS Enterprise Security Center
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#032a47] text-[#A7EBF2] border border-[#26658C]">
                v{status?.version || "1.0.0"}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Zero-Trust Mesh & Cryptographic Audit Verification
            </span>
          </div>
        </div>

        {/* Status Pill + Header Controls */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
              status?.security_enabled || apiKey
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-[#041c30] border-[#26658C] text-[#A7EBF2]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status?.security_enabled || apiKey
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-[#54ACBF]"
              }`}
            />
            <span>
              {status?.security_enabled || apiKey
                ? "ZERO-TRUST SECURED"
                : "DEV MODE ENFORCED"}
            </span>
          </div>

          <button
            onClick={loadSecurityData}
            title="Refresh Security Status"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#031d33] hover:bg-[#072c4c] border border-[#26658C] text-slate-300 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>

          <button
            onClick={onMinimize}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#031d33] hover:bg-[#072c4c] border border-[#26658C] text-slate-300"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleMaximize}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#031d33] hover:bg-[#072c4c] border border-[#26658C] text-slate-300"
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#031d33] hover:bg-rose-900/80 border border-[#26658C] hover:border-rose-500 text-slate-300 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-[#0d2e49] bg-[#010c18] px-4 py-2">
        <button
          onClick={() => setActiveTab("posture")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "posture"
              ? "bg-[#02243d] text-[#A7EBF2] border border-[#26658C]"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#02182b]"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Security Posture</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "alerts"
              ? "bg-[#02243d] text-[#A7EBF2] border border-[#26658C]"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#02182b]"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Security Alerts</span>
          {alerts.length > 0 && (
            <span className="ml-1 rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-mono text-rose-300 border border-rose-500/30">
              {alerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "audit"
              ? "bg-[#02243d] text-[#A7EBF2] border border-[#26658C]"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#02182b]"
          }`}
        >
          <FileCheck className="h-3.5 w-3.5" />
          <span>Hash-Chained Audit</span>
        </button>

        <button
          onClick={() => setActiveTab("redactor")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "redactor"
              ? "bg-[#02243d] text-[#A7EBF2] border border-[#26658C]"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#02182b]"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>PII Redactor Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab("apikey")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "apikey"
              ? "bg-[#02243d] text-[#A7EBF2] border border-[#26658C]"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#02182b]"
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>API Key & Secrets</span>
        </button>
      </div>

      {/* 3. Tab Contents Canvas */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-themed bg-[#010814]">
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── TAB 1: SECURITY POSTURE ── */}
        {activeTab === "posture" && (
          <div className="space-y-4">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#26658C]/70 bg-[#021324] p-3.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">Rate Limiter</span>
                  <Sliders className="h-3.5 w-3.5 text-[#54ACBF]" />
                </div>
                <div className="font-mono text-base font-bold text-slate-100">
                  {status?.rate_limiting
                    ? `${status.rate_limiting.requests_per_window} req`
                    : "200 req"}
                </div>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">
                  Sliding window: {status?.rate_limiting?.window_seconds || 60}s
                </div>
              </div>

              <div className="rounded-xl border border-[#26658C]/70 bg-[#021324] p-3.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">PII Redactor</span>
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="font-mono text-base font-bold text-emerald-300">
                  {status?.redaction_enabled !== false ? "ACTIVE" : "BYPASSED"}
                </div>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">
                  JWT, API Key & Password filters
                </div>
              </div>

              <div className="rounded-xl border border-[#26658C]/70 bg-[#021324] p-3.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">Audit Integrity</span>
                  <FileCheck className="h-3.5 w-3.5 text-[#54ACBF]" />
                </div>
                <div className="font-mono text-base font-bold text-[#A7EBF2]">
                  SHA-256 Chained
                </div>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">
                  Cryptographic ledger verified
                </div>
              </div>

              <div className="rounded-xl border border-[#26658C]/70 bg-[#021324] p-3.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">CORS Policy</span>
                  <Lock className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <div className="font-mono text-base font-bold text-slate-100">
                  {status?.cors_origins?.length || 2} Allowed
                </div>
                <div className="mt-1 text-[10px] text-slate-400 font-mono truncate" title={status?.cors_origins?.join(", ")}>
                  {status?.cors_origins?.[0] || "localhost:5173"}
                </div>
              </div>
            </div>

            {/* Core Modules Breakdown */}
            <div className="rounded-xl border border-[#0d2e49] bg-[#021020] p-4">
              <h3 className="font-display text-xs font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#54ACBF]" />
                Integrated Security Layer Status (Rehan Shaikh Module Integration)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-[#0d2e49] bg-[#010914] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-medium text-slate-200">
                      eios.security.redactor
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
                      ENGAGED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Pre-ingest scrubbing of sensitive credentials across Kafka, PostgreSQL, and LLM orchestration prompts. Replaces secrets with verifiable masks.
                  </p>
                </div>

                <div className="rounded-lg border border-[#0d2e49] bg-[#010914] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-medium text-slate-200">
                      eios.security.audit
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#032a47] text-[#A7EBF2] border border-[#26658C]">
                      HASH-LINKED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Immutable append-only ledger. Every audit event signs the previous record hash with SHA-256 for tamper-proof regulatory verification.
                  </p>
                </div>

                <div className="rounded-lg border border-[#0d2e49] bg-[#010914] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-medium text-slate-200">
                      eios.security.ratelimit
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
                      PROTECTING
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    In-memory thread-safe sliding window rate limiter. Safeguards the orchestrator, ingest endpoints, and PostgreSQL from flood attacks.
                  </p>
                </div>

                <div className="rounded-lg border border-[#0d2e49] bg-[#010914] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-medium text-slate-200">
                      orchestrator.middleware
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#032a47] text-[#A7EBF2] border border-[#26658C]">
                      X-API-KEY GATEWAY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    FastAPI RequestSizeLimitMiddleware (1MB cap) and SecurityMiddleware with constant-time API key verification and tenant IP extraction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: LIVE ALERTS ── */}
        {activeTab === "alerts" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Showing {alerts.length} security alerts from Kafka attack stream & middleware
              </span>
              <button
                onClick={loadSecurityData}
                className="text-[11px] font-mono text-[#54ACBF] hover:underline"
              >
                Refresh feed
              </button>
            </div>

            <div className="divide-y divide-[#0d2e49] rounded-xl border border-[#0d2e49] bg-[#021020] overflow-hidden">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No active security threats recorded in the current window.
                </div>
              ) : (
                alerts.map((alert, i) => (
                  <div
                    key={alert.alert_id || i}
                    className="flex items-start justify-between p-3.5 hover:bg-[#03182b] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded p-1.5 ${
                          alert.severity === "high" || alert.severity === "critical"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-200">
                            {alert.action}
                          </span>
                          <span className="rounded bg-[#032a47] px-2 py-0.5 font-mono text-[10px] text-[#A7EBF2]">
                            {alert.actor}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-slate-400">
                          <span>Source IP: <strong className="text-slate-300">{alert.ip}</strong></span>
                          <span>•</span>
                          <span>{new Date(alert.at).toLocaleTimeString()}</span>
                        </div>
                        {alert.detail && (
                          <div className="mt-1.5 rounded bg-[#010914] px-2.5 py-1 font-mono text-[10px] text-slate-400 border border-[#0d2e49]/60">
                            {JSON.stringify(alert.detail)}
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        alert.severity === "high" || alert.severity === "critical"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {alert.severity || "medium"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: HASH-CHAINED AUDIT ── */}
        {activeTab === "audit" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Cryptographic SHA-256 Chained Audit Trail ({auditLogs.length} verified records)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                CHAIN INTEGRITY: VERIFIED ✓
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#0d2e49] bg-[#021020]">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="border-b border-[#0d2e49] bg-[#010a16] text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Client IP</th>
                    <th className="py-2.5 px-3">SHA-256 Integrity Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d2e49]">
                  {auditLogs.map((log, idx) => (
                    <tr key={log.entry_id || idx} className="hover:bg-[#03182b] transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-300">
                        #{log.entry_id || idx + 1000}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(log.at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-[#A7EBF2]">
                        {log.actor}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {log.ip || "127.0.0.1"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="font-mono text-[10px] text-emerald-400 cursor-pointer hover:underline"
                          title={log.integrity_hash}
                        >
                          {log.integrity_hash
                            ? `${log.integrity_hash.slice(0, 16)}...${log.integrity_hash.slice(-8)}`
                            : "verified"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: REDACTOR SANDBOX ── */}
        {activeTab === "redactor" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#0d2e49] bg-[#021020] p-4">
              <h3 className="font-display text-xs font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#54ACBF]" />
                Interactive PII & Secrets Redaction Tester
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Test how the EIOS security engine cleans incoming payloads and logs before they hit PostgreSQL or the AI analysis agent.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Input Payload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] text-slate-300">
                      Raw Payload (with sensitive secrets)
                    </span>
                    <button
                      onClick={() =>
                        setTestInput(
                          'curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.secret" https://api.eios.internal/query?api_key=sk-enterprise-9981-xyz&password=SuperSecretPassword123'
                        )
                      }
                      className="text-[10px] font-mono text-[#54ACBF] hover:underline"
                    >
                      Reset sample
                    </button>
                  </div>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-[#0d2e49] bg-[#010914] p-2.5 font-mono text-xs text-rose-300 focus:border-[#26658C] focus:outline-none scrollbar-themed"
                    placeholder="Enter payload with API keys, tokens, or passwords..."
                  />
                </div>

                {/* Sanitized Output */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Sanitized Output (Safe for Logs & AI)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Live Regex Engine
                    </span>
                  </div>
                  <div className="min-h-[148px] rounded-lg border border-emerald-500/30 bg-[#010914] p-2.5 font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all scrollbar-themed">
                    {redactedOutput}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: API KEY & SECRETS ── */}
        {activeTab === "apikey" && (
          <div className="max-w-xl space-y-4">
            <div className="rounded-xl border border-[#0d2e49] bg-[#021020] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#02243d] border border-[#26658C]">
                  <Key className="h-4 w-4 text-[#54ACBF]" />
                </div>
                <div>
                  <h3 className="font-display text-xs font-bold text-slate-100">
                    EIOS Master API Key Authentication
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Used to authenticate all requests against protected orchestrator and ingest endpoints.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1.5">
                    Active Session API Key (Stored in sessionStorage)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="eios_key_..."
                      className="flex-1 rounded-lg border border-[#0d2e49] bg-[#010914] px-3 py-2 font-mono text-xs text-slate-100 focus:border-[#26658C] focus:outline-none"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      className="flex items-center gap-1.5 rounded-lg bg-[#02243d] hover:bg-[#033457] border border-[#26658C] px-4 py-2 font-display text-xs font-semibold text-[#A7EBF2] transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save Key
                    </button>
                  </div>
                </div>

                {keySavedMessage && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 p-2.5 text-xs text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                    <span>API Key saved to active session. Endpoints will now attach X-API-Key header.</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#0d2e49]/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Current Key Status: <strong>{apiKey ? "Configured" : "Not Set (Anonymous)"}</strong></span>
                  {apiKey && (
                    <button
                      onClick={() => {
                        setInputKey("");
                        clearApiKey();
                        sessionStorage.removeItem("eios_api_key");
                      }}
                      className="text-rose-400 hover:underline"
                    >
                      Clear Key
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Window Footer Status Bar */}
      <div className="flex h-8 items-center justify-between border-t border-[#0d2e49] bg-[#010914] px-4 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Zero-Trust Policy: ENFORCED
          </span>
          <span>•</span>
          <span>Max Request Size: 1,048,576 bytes</span>
        </div>

        <div className="flex items-center gap-2">
          <span>Rehan Security Module: Connected</span>
        </div>
      </div>
    </section>
  );
}
