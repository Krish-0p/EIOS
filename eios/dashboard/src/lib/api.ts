const BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
import type { IntelligenceStatus, FeatureWindow, IntelligenceInsight, IntelligenceForecast, IntelligenceModel } from "./intelligence";

function intelligenceQuery(service: string, extra: Record<string, string> = {}) {
  const query = new URLSearchParams(extra);
  if (service) query.set("service", service);
  return `?${query}`;
}

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Incident {
  incident_id: string;
  domain: string;
  entity_kind: string;
  entity_id: string;
  entity_service: string | null;
  detected_at: string;
  window_start: string;
  window_end: string;
  detector: string;
  score: number;
  severity: Severity;
  title: string;
  features: Record<string, number>;
  labels: Record<string, string>;
  status: string;
  evidence_count?: number;
}

export interface Stats {
  totals: { events: number; incidents: number; open_faults: number };
  events_by_domain: { domain: string; events: number; latest: string }[];
  incidents_by_severity: { severity: Severity; incidents: number }[];
}

export interface Flag {
  key: string;
  defaultVariant: string;
  variants: string[];
  description: string;
  on: boolean;
}

export interface FaultWindow {
  window_id: string;
  flag_key: string;
  variant: string | null;
  started_at: string;
  ended_at: string | null;
  expected_domain: string | null;
  expected_entity: string | null;
  notes: string | null;
}

export type ServiceStatus =
  | "healthy"
  | "degraded"
  | "critical"
  | "idle"
  | "unknown";

/** An open fault window, as attached to the service it targets. */
export interface InjectedFault {
  window_id: string;
  flag_key: string;
  variant: string | null;
  started_at: string;
  expected_domain: string | null;
  expected_entity: string | null;
}

export interface ServiceHealth {
  service: string;
  status: ServiceStatus;
  reason: string;
  rate_per_sec: number | null;
  error_rate_per_sec: number | null;
  error_ratio: number | null;
  latency_p95_ms: number | null;
  latency_p99_ms: number | null;
  cpu_ratio: number | null;
  memory_ratio: number | null;
  sources: string[];
  incidents_24h: number;
  /** Set when a fault window is open against this service. */
  injected_fault: InjectedFault | null;
}

export interface ServicesView {
  window: string;
  services: ServiceHealth[];
  degraded_sources: string[];
  jaeger_ui: string;
  open_faults: InjectedFault[];
}

export interface ServiceEdge {
  source: string;
  target: string;
  calls: number;
}

export interface ServiceGraph {
  edges: ServiceEdge[];
  nodes: string[];
  available: boolean;
  reason: string | null;
}

export interface Operation {
  span_name: string;
  rate_per_sec: number;
  error_rate_per_sec: number;
  error_ratio: number | null;
  latency_p95_ms: number | null;
}

export type ServiceIncident = Pick<
  Incident,
  | "incident_id"
  | "domain"
  | "entity_kind"
  | "entity_id"
  | "entity_service"
  | "detected_at"
  | "detector"
  | "score"
  | "severity"
  | "title"
  | "labels"
  | "status"
>;

export interface ServiceDetail {
  service: ServiceHealth;
  window: string;
  operations: Operation[];
  upstreams: string[];
  downstreams: string[];
  incidents: ServiceIncident[];
  traces_url: string;
}

export interface SecurityStatus {
  security_enabled: boolean;
  rate_limiting?: {
    requests_per_window: number;
    window_seconds: number;
  };
  redaction_enabled?: boolean;
  audit_integrity?: boolean;
  cors_origins?: string[];
  version?: string;
}

export interface SecurityAuditEntry {
  entry_id?: number;
  at: string;
  actor: string;
  action: string;
  subject_kind?: string;
  subject_id?: string;
  detail?: Record<string, any>;
  tenant_id?: string;
  ip?: string;
  request_id?: string;
  integrity_hash?: string;
}

export interface SecurityAlert {
  alert_id?: string;
  at: string;
  action: string;
  actor: string;
  ip: string;
  detail?: Record<string, any>;
  severity?: Severity;
}

async function get<T>(path: string): Promise<T> {
  const apiKey = sessionStorage.getItem("eios_api_key");
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const apiKey = sessionStorage.getItem("eios_api_key");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Docker Container types ─────────────────────────────────────────────────
export interface DockerContainer {
  id: string;
  full_id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "paused" | "restarting" | "dead" | "created" | string;
  state: string;
  ports: string;
  created: number;
  uptime: string;
  compose_service: string;
  compose_project: string;
  labels: Record<string, string>;
  otlp_connected: boolean;
  category: "app" | "infra" | "database" | string;
}

export interface ContainerStats {
  id: string;
  cpu_pct: number;
  memory_bytes: number;
  memory_mb: number;
  memory_limit_mb: number;
  memory_pct: number;
  networks: Record<string, { rx_bytes: number; tx_bytes: number }>;
}

export interface DockerInfo {
  containers: number;
  containers_running: number;
  containers_paused: number;
  containers_stopped: number;
  images: number;
  server_version: string;
  os: string;
  architecture: string;
  mem_total_gb: number;
  cpus: number;
}

// ── System Metrics types ───────────────────────────────────────────────────
export interface SystemMetrics {
  cpu: {
    percent: number;
    per_core: number[];
    count_logical: number;
    count_physical: number;
    freq_mhz: number | null;
    freq_max_mhz: number | null;
  };
  memory: {
    total_gb: number;
    available_gb: number;
    used_gb: number;
    percent: number;
    cached_gb: number;
    buffers_gb: number;
  };
  swap: { total_gb: number; used_gb: number; percent: number };
  disk: {
    device: string;
    mountpoint: string;
    fstype: string;
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  }[];
  network: {
    rx_kbps: number;
    tx_kbps: number;
    interfaces: {
      interface: string;
      bytes_sent: number;
      bytes_recv: number;
    }[];
  };
  platform: {
    system: string;
    node: string;
    release: string;
    machine: string;
    python: string;
  };
}

export interface SystemProcess {
  pid: number;
  name: string;
  cpu_pct: number;
  mem_pct: number;
  mem_mb: number;
  status: string;
  user: string;
}

// ── K8s types ─────────────────────────────────────────────────────────────
export interface K8sWorkloads {
  available: boolean;
  reason?: string;
  namespace?: string;
  pods: {
    name: string; namespace: string; phase: string;
    ready: number; total_containers: number; node: string;
    images: string[]; restart_count: number; pod_ip: string;
  }[];
  deployments: {
    name: string; namespace: string; replicas: number;
    ready_replicas: number; available_replicas: number; image: string;
  }[];
  services: {
    name: string; namespace: string; type: string;
    cluster_ip: string; ports: string;
  }[];
}

// ── FS types ──────────────────────────────────────────────────────────────
export interface FSEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number | null;
  size_human: string | null;
  modified: number;
  extension: string;
  mime: string;
  is_text: boolean;
}

export interface FSListing {
  path: string;
  entries: FSEntry[];
  total: number;
}

export interface FSFile {
  path: string;
  name: string;
  content: string;
  size: number;
  size_human: string;
  mime: string;
  extension: string;
  modified: number;
}

// ── Terminal types ─────────────────────────────────────────────────────────
export interface TerminalResult {
  command: string;
  output: string;
  exit_code: number;
  timestamp: string;
  duration_ms: number;
}

export const api = {
  // Core EIOS
  stats: () => get<Stats>("/api/stats"),
  incidents: (limit = 50) => get<Incident[]>(`/api/incidents?limit=${limit}`),
  flags: () => get<Flag[]>("/api/flags"),
  faults: () => get<FaultWindow[]>("/api/faults"),
  services: () => get<ServicesView>("/api/services"),
  serviceGraph: (hours = 1) => get<ServiceGraph>(`/api/services/graph?hours=${hours}`),
  service: (name: string) =>
    get<ServiceDetail>(`/api/services/${encodeURIComponent(name)}`),
  startFault: (body: {
    flag_key: string;
    variant: string;
    expected_domain?: string;
    expected_entity?: string;
    notes?: string;
  }) => post<{ window_id: string }>("/api/faults/start", body),
  stopFault: (windowId: string) => post(`/api/faults/${windowId}/stop`),

  // Security (Rehan)
  securityStatus: () => get<SecurityStatus>("/api/security/status"),
  securityAlerts: () => get<SecurityAlert[]>("/api/security/alerts"),
  securityAudit: () => get<SecurityAuditEntry[]>("/api/security/audit"),

  // Docker Engine — REAL container data
  dockerContainers: (all = true) =>
    get<DockerContainer[]>(`/api/docker/containers?all=${all}`),
  dockerContainerStats: (id: string) =>
    get<ContainerStats>(`/api/docker/containers/${id}/stats`),
  dockerStats: () => get<ContainerStats[]>("/api/docker/stats"),
  dockerInfo: () => get<DockerInfo>("/api/docker/info"),
  dockerNetworks: () => get<{ id: string; name: string; driver: string; containers: number }[]>("/api/docker/networks"),
  dockerStart: (id: string) => post(`/api/docker/containers/${id}/start`),
  dockerStop: (id: string) => post(`/api/docker/containers/${id}/stop`),
  dockerRestart: (id: string) => post(`/api/docker/containers/${id}/restart`),

  // System Metrics — REAL host metrics
  systemMetrics: () => get<SystemMetrics>("/api/system/metrics"),
  systemProcesses: (limit = 20) => get<SystemProcess[]>(`/api/system/processes?limit=${limit}`),

  // Kubernetes
  k8sWorkloads: (namespace = "default") =>
    get<K8sWorkloads>(`/api/k8s/workloads?namespace=${namespace}`),
  k8sNamespaces: () => get<string[]>("/api/k8s/namespaces"),

  // Terminal
  terminalExec: (command: string) =>
    post<TerminalResult>("/api/terminal/exec", { command }),
  terminalHistory: (limit = 50) =>
    get<TerminalResult[]>(`/api/terminal/history?limit=${limit}`),

  // Filesystem (real EIOS workspace)
  fsList: (path = "") => get<FSListing>(`/api/fs/list?path=${encodeURIComponent(path)}`),
  fsRead: (path: string) => get<FSFile>(`/api/fs/read?path=${encodeURIComponent(path)}`),
  fsTree: (depth = 3) => get<FSEntry>(`/api/fs/tree?depth=${depth}`),
  fsInfo: () => get<{ root: string; exists: boolean; disk: { total_gb: number; used_gb: number; free_gb: number; percent: number } }>("/api/fs/info"),

  // Intelligence & Agents
  intelligenceStatus: () => get<IntelligenceStatus>("/api/intelligence/status"),
  intelligenceKpis: (service = "") => get<FeatureWindow[]>(`/api/intelligence/kpis${intelligenceQuery(service)}`),
  intelligenceInsights: (service = "", hours = 24) => get<IntelligenceInsight[]>(`/api/intelligence/insights${intelligenceQuery(service, { since: new Date(Date.now() - hours * 3600000).toISOString(), limit: "500" })}`),
  intelligenceForecasts: (service = "") => get<IntelligenceForecast[]>(`/api/intelligence/forecasts${intelligenceQuery(service)}`),
  intelligenceModels: (service = "") => get<IntelligenceModel[]>(`/api/intelligence/models${intelligenceQuery(service)}`),
  intelligenceHistory: (service: string, minutes = 60) => get<FeatureWindow[]>(`/api/intelligence/history${intelligenceQuery(service, { minutes: String(minutes) })}`),
  intelligenceFeedback: (insight_id: string, verdict: "confirm" | "dismiss", operator: string) => post<{ message: string }>("/api/intelligence/feedback", { insight_id, verdict, operator }),
  aiChat: (query: string, context?: any) =>
    post<{ reply: string; timestamp: string; context_snapshot: any }>("/api/ai/chat", { query, context }),
  cases: () => get<any[]>("/api/cases"),
  case: (id: string) => get<any>(`/api/cases/${id}`),
  approvals: () => get<any[]>("/api/approvals"),
  executeApproval: (id: string, decision: string, notes?: string) =>
    post<any>(`/api/approvals/${id}/action`, { decision, notes }),

  // Workload Management & OTel Pipeline
  connectWorkload: (body: { workload_type?: string; name?: string; collector_endpoint?: string; prometheus_url?: string; jaeger_url?: string }) =>
    post<any>("/api/workloads/connect", body),
  workloadStatus: () => get<any>("/api/workloads/status"),

  // Administrator Authentication
  authLogin: (username: string, password: string, api_key?: string) =>
    post<{ status: string; user: string; role: string; token: string; api_key: string }>("/api/auth/login", { username, password, api_key }),
  authRegister: (username: string, password: string, role?: string) =>
    post<{ status: string; user: string; role: string; message: string }>("/api/auth/register", { username, password, role }),
  authMe: (username = "admin") =>
    get<{ username: string; role: string; status: string }>(`/api/auth/me?username=${encodeURIComponent(username)}`),
};


/** Live incident feed. Reconnects on drop so a demo survives a restart. */
export function subscribeIncidents(
  onIncident: (incident: Incident) => void,
  onState: (connected: boolean) => void,
): () => void {
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const connect = () => {
    const url = BASE.replace(/^http/, "ws") + "/ws";
    socket = new WebSocket(url);
    socket.onopen = () => onState(true);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "incident") onIncident(payload.data as Incident);
      } catch {
        // A malformed frame should not take the feed down.
      }
    };
    socket.onclose = () => {
      onState(false);
      if (!closed) retry = setTimeout(connect, 3000);
    };
    socket.onerror = () => socket?.close();
  };

  connect();
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}
