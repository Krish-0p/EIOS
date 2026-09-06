import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Database, Radio, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  api,
  subscribeIncidents,
  type FaultWindow,
  type Flag,
  type Incident,
  type Severity,
  type Stats,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/** Severity is carried by a stripe and a label, not colour alone. */
const SEVERITY: Record<Severity, { stripe: string; label: string }> = {
  critical: { stripe: "bg-destructive", label: "Critical" },
  high: { stripe: "bg-destructive/70", label: "High" },
  medium: { stripe: "bg-primary/70", label: "Medium" },
  low: { stripe: "bg-muted-foreground/50", label: "Low" },
  info: { stripe: "bg-muted-foreground/30", label: "Info" },
};

const DOMAIN_LABEL: Record<string, string> = {
  ecommerce: "B · E-commerce",
  infrastructure: "C · Infrastructure",
  attack: "A · Attack",
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const severity = SEVERITY[incident.severity] ?? SEVERITY.info;
  const injected = incident.labels?.injected_fault;

  return (
    <div className="relative flex gap-3 py-3 pl-4">
      <span
        className={cn("absolute left-0 top-3 h-[calc(100%-1.5rem)] w-1 rounded-full", severity.stripe)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{incident.title}</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {severity.label}
          </Badge>
          {injected ? (
            <Badge className="text-[10px]" title="A fault window was open and matched this incident">
              labelled {injected}
            </Badge>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
          <span>{DOMAIN_LABEL[incident.domain] ?? incident.domain}</span>
          <span>{incident.entity_kind}:{incident.entity_id}</span>
          <span>{incident.detector}</span>
          <span className="tabular-nums">score {incident.score.toFixed(2)}</span>
          <span>{timeAgo(incident.detected_at)}</span>
        </div>
        {Object.keys(incident.features ?? {}).length ? (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
            {Object.entries(incident.features).map(([key, value]) => (
              <span key={key} className="text-muted-foreground">
                {key}=<span className="tabular-nums text-foreground">{value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [faults, setFaults] = useState<FaultWindow[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, i, f, w] = await Promise.all([
        api.stats(),
        api.incidents(60),
        api.flags().catch(() => [] as Flag[]),
        api.faults(),
      ]);
      setStats(s);
      setIncidents(i);
      setFlags(f);
      setFaults(w);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(
    () =>
      subscribeIncidents(
        (incident) =>
          setIncidents((current) =>
            [incident, ...current.filter((c) => c.incident_id !== incident.incident_id)].slice(0, 60),
          ),
        setConnected,
      ),
    [],
  );

  const openFaults = faults.filter((f) => !f.ended_at);

  const inject = async (flag: Flag) => {
    setBusy(flag.key);
    try {
      const variant = flag.variants.find((v) => v !== "off") ?? "on";
      await api.startFault({
        flag_key: flag.key,
        variant,
        expected_domain: flag.key.toLowerCase().includes("payment") ? "ecommerce" : undefined,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const clearFault = async (windowId: string) => {
    setBusy(windowId);
    try {
      await api.stopFault(windowId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">EIOS Operations</h1>
            <p className="text-xs text-muted-foreground">
              Detection over the OpenTelemetry Demo substrate
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <Radio
              className={cn("h-3.5 w-3.5", connected ? "text-primary" : "text-muted-foreground")}
              aria-hidden
            />
            <span className={connected ? "text-foreground" : "text-muted-foreground"}>
              {connected ? "live feed connected" : "reconnecting"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {error ? (
          <Card className="border-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Could not reach the orchestrator
              </CardTitle>
              <CardDescription className="font-mono text-xs">{error}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                Check that eios-orchestrator is running, and use 127.0.0.1 rather than
                localhost.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={Database}
            label="Events ingested"
            value={stats?.totals.events ?? "—"}
            hint={stats?.events_by_domain.map((d) => `${d.domain} ${d.events}`).join(" · ")}
          />
          <StatTile
            icon={AlertTriangle}
            label="Incidents"
            value={stats?.totals.incidents ?? "—"}
            hint={
              stats?.incidents_by_severity.length
                ? stats.incidents_by_severity.map((s) => `${s.severity} ${s.incidents}`).join(" · ")
                : "none in the last 24 hours"
            }
          />
          <StatTile
            icon={Zap}
            label="Open fault windows"
            value={stats?.totals.open_faults ?? "—"}
            hint="Ground truth for scoring"
          />
          <StatTile
            icon={Activity}
            label="Detectors"
            value={new Set(incidents.map((i) => i.detector)).size}
            hint="Rules that have fired"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incident feed</CardTitle>
              <CardDescription>
                Newest first. Arrives over the WebSocket as detection fires.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No incidents yet. Inject a fault to produce one.
                </p>
              ) : (
                <ScrollArea className="h-[560px] pr-3">
                  <div className="divide-y">
                    {incidents.map((incident) => (
                      <IncidentRow key={incident.incident_id} incident={incident} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inject a fault</CardTitle>
                <CardDescription>
                  Flips the flag in flagd and records the ground-truth window in one action.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {openFaults.length > 0 ? (
                  <div className="space-y-2">
                    {openFaults.map((fault) => (
                      <div
                        key={fault.window_id}
                        className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-mono text-xs font-medium">
                            {fault.flag_key}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            open since {timeAgo(fault.started_at)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === fault.window_id}
                          onClick={() => clearFault(fault.window_id)}
                        >
                          Stop
                        </Button>
                      </div>
                    ))}
                    <Separator />
                  </div>
                ) : null}

                <ScrollArea className="h-[280px] pr-3">
                  <div className="space-y-1.5">
                    {flags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        flagd config is not mounted, so faults must be toggled in the flagd UI.
                      </p>
                    ) : (
                      flags.map((flag) => (
                        <div
                          key={flag.key}
                          className="flex items-center justify-between gap-2 py-1"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-mono text-xs">{flag.key}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {flag.description}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={flag.on ? "secondary" : "outline"}
                            disabled={busy === flag.key || flag.on}
                            onClick={() => inject(flag)}
                          >
                            {flag.on ? "On" : "Inject"}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent fault windows</CardTitle>
                <CardDescription>What the Stage 3 harness will score against.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faults.slice(0, 6).map((fault) => (
                      <TableRow key={fault.window_id}>
                        <TableCell className="font-mono text-xs">{fault.flag_key}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeAgo(fault.started_at)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {fault.ended_at ? "closed" : "open"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {faults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                          No faults recorded yet
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
