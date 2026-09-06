const BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  stats: () => get<Stats>("/api/stats"),
  incidents: (limit = 50) => get<Incident[]>(`/api/incidents?limit=${limit}`),
  flags: () => get<Flag[]>("/api/flags"),
  faults: () => get<FaultWindow[]>("/api/faults"),
  startFault: (body: {
    flag_key: string;
    variant: string;
    expected_domain?: string;
    expected_entity?: string;
    notes?: string;
  }) => post<{ window_id: string }>("/api/faults/start", body),
  stopFault: (windowId: string) => post(`/api/faults/${windowId}/stop`),
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
