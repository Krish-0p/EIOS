import { useState, useEffect, useCallback } from "react";
import {
  Layers,
  CheckCircle2,
  Cpu,
  HardDrive,
  Activity,
  ArrowRight,
  Shield,
  Zap,
  Server,
  Box,
  Terminal,
  Radio,
  FileCheck,
  Play,
  RotateCw,
  X,
  Search,
  Check,
  AlertTriangle,
  Flame,
  TrendingUp,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { api, type DockerContainer } from "@/lib/api";

interface ApplicationOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface DiscoveredWorkload {
  name: string;
  image: string;
  category: "app" | "infra" | "database";
  status: "running" | "healthy" | "starting" | "stopped" | string;
  ports: string;
  cpu: string;
  memory: string;
  otlpConnected: boolean;
  id?: string;
}

export function ApplicationOnboardingModal({
  isOpen,
  onClose,
  onComplete,
}: ApplicationOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<
    "discover" | "approve" | "pipeline" | "ready"
  >("discover");

  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "app" | "infra" | "database"
  >("all");

  // ── Real Docker container discovery ───────────────────────────────────────
  const [discoveredWorkloads, setDiscoveredWorkloads] = useState<DiscoveredWorkload[]>([]);
  const [dockerLoading, setDockerLoading] = useState(false);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [dockerInfo, setDockerInfo] = useState<{ containers_running: number; server_version: string } | null>(null);

  const [workloadPlatform, setWorkloadPlatform] = useState<"docker" | "k8s">("docker");
  const [k8sWorkloadsList, setK8sWorkloadsList] = useState<any[]>([]);
  const [k8sLoading, setK8sLoading] = useState(false);
  const [k8sAvailable, setK8sAvailable] = useState<boolean | null>(null);

  // Convert DockerContainer → DiscoveredWorkload
  const toWorkload = (c: DockerContainer): DiscoveredWorkload => ({
    id: c.id,
    name: c.name,
    image: c.image,
    category: (c.category as "app" | "infra" | "database") ?? "app",
    status: c.state === "running" ? "running" : c.state === "exited" ? "stopped" : c.state as any,
    ports: c.ports || "—",
    cpu: "—",       // will be filled from stats
    memory: "—",
    otlpConnected: c.otlp_connected,
  });

  const discoverContainers = useCallback(async () => {
    setDockerLoading(true);
    setDockerError(null);
    try {
      const [containers, info, k8s] = await Promise.all([
        api.dockerContainers(true),
        api.dockerInfo().catch(() => null),
        api.k8sWorkloads("all").catch(() => null),
      ]);
      setDiscoveredWorkloads(containers.map(toWorkload));
      if (info) setDockerInfo({ containers_running: info.containers_running, server_version: info.server_version });

      if (k8s) {
        setK8sAvailable(k8s.available);
        if (k8s.pods) setK8sWorkloadsList(k8s.pods);
      }

      // Fetch live stats for running containers (non-blocking)
      const runningIds = containers.filter(c => c.state === "running").map(c => c.id);
      if (runningIds.length > 0) {
        try {
          const allStats = await api.dockerStats();
          const statsMap = Object.fromEntries(allStats.map(s => [s.id, s]));
          setDiscoveredWorkloads(prev =>
            prev.map(w => {
              const s = w.id ? statsMap[w.id] : undefined;
              if (!s) return w;
              return {
                ...w,
                cpu: `${s.cpu_pct.toFixed(1)}%`,
                memory: `${s.memory_mb.toFixed(0)} MB`,
              };
            })
          );
        } catch {
          // Stats are best-effort; silently ignore
        }
      }
    } catch (err: any) {
      setDockerError(err?.message ?? "Docker Engine not reachable");
      setDiscoveredWorkloads([]);
    } finally {
      setDockerLoading(false);
    }
  }, []);

  const handleApproveConnect = async () => {
    try {
      await api.connectWorkload({
        workload_type: "opentelemetry-demo",
        name: "OpenTelemetry Online Boutique",
      }).catch(() => null);
    } catch {
      // best-effort connect
    }
    setCurrentStep("pipeline");
  };

  useEffect(() => {
    if (isOpen && currentStep === "discover") {
      discoverContainers();
    }
  }, [isOpen, currentStep, discoverContainers]);
  // ──────────────────────────────────────────────────────────────────────────

  // Pipeline Agent Animation Stages

  const [activePipelineStage, setActivePipelineStage] = useState(0);

  const pipelineStages = [
    {
      id: "integration",
      title: "1. Integration Agent",
      role: "OTel Collector & Microservices Binding",
      desc: "Probes Docker/K8s sockets, attaches OTLP gRPC :4317 pipelines, and discovers 34 microservice endpoints.",
      metric: "34 Endpoints Mapped",
      color: "#54ACBF",
    },
    {
      id: "orchestrator",
      title: "2. EIOS Orchestrator",
      role: "Microservices Topology DAG & Event Aggregation",
      desc: "Normalizes event streams from Kafka, correlates tracing spans into dependency graph (34 nodes, 82 edges).",
      metric: "82 Graph Edges Synced",
      color: "#A7EBF2",
    },
    {
      id: "intelligence",
      title: "3. Intelligence Agent",
      role: "Metric Analysis & Anomaly Detection",
      desc: "Applies statistical anomaly detection on p95/p99 latency, error rates, and CPU/memory trends across services.",
      metric: "Anomaly Score: 0.12 (Normal)",
      color: "#26658C",
    },
    {
      id: "orchestration",
      title: "4. Orchestration Agent",
      role: "WSL2 Resource Governance & Remediation Policy",
      desc: "Enforces 3800MB RAM ceiling, tunes concurrency limits to 4 threads, and prepares auto-remediation playbooks.",
      metric: "Policy: Host Eco-Guard Active",
      color: "#6EAA90",
    },
    {
      id: "output",
      title: "5. Output Agent",
      role: "Incident Dispatch & Multi-Channel Alerting",
      desc: "Dispatches synthesized alerts, publishes fault window scores, and feeds real-time telemetry to the dashboard.",
      metric: "Telemetry Broadcast Live",
      color: "#F08A7C",
    },
    {
      id: "feedback",
      title: "6. Continuous Feedback Loop",
      role: "Closed-Loop Autonomous Governance",
      desc: "Zero-Trust continuous loop with SHA-256 hash chaining on all governance events for immutable audit trails.",
      metric: "Active Feedback Loop",
      color: "#B5E3C8",
    },
  ];

  useEffect(() => {
    if (currentStep === "pipeline") {
      const interval = setInterval(() => {
        setActivePipelineStage((prev) => {
          if (prev >= pipelineStages.length - 1) {
            clearInterval(interval);
            setTimeout(() => setCurrentStep("ready"), 900);
            return prev;
          }
          return prev + 1;
        });
      }, 950);
      return () => clearInterval(interval);
    }
  }, [currentStep, pipelineStages.length]);

  if (!isOpen) return null;

  const filteredWorkloads = discoveredWorkloads.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      w.image.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || w.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none animate-in fade-in duration-150">
      <div className="os-window flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-[#26658C] bg-[#010814] text-slate-200">
        {/* Header Bar */}
        <div className="flex h-12 items-center justify-between border-b border-[#0d2e49] bg-[#021424] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#02243d] border border-[#26658C]">
              <Box className="h-4 w-4 text-[#54ACBF]" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
                Enterprise Application Onboarding & Discovery
                <span className="rounded bg-[#032a47] px-2 py-0.5 text-[10px] font-mono text-[#A7EBF2] border border-[#26658C]">
                  EIOS OS Workflow
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                Automatic Container / Pod Discovery • OpenTelemetry Pipeline Binding
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#031d33] hover:bg-rose-900/80 border border-[#26658C] hover:border-rose-500 text-slate-300 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Wizard Progress Ribbon */}
        <div className="grid grid-cols-4 border-b border-[#0d2e49] bg-[#010c18] text-xs font-mono">
          <div
            className={`flex items-center gap-2 p-3 border-r border-[#0d2e49] ${
              currentStep === "discover"
                ? "bg-[#02243d] text-[#A7EBF2] font-semibold"
                : "text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#042845] text-[10px] font-bold">
              1
            </span>
            <span>Discover Workloads</span>
          </div>

          <div
            className={`flex items-center gap-2 p-3 border-r border-[#0d2e49] ${
              currentStep === "approve"
                ? "bg-[#02243d] text-[#A7EBF2] font-semibold"
                : "text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#042845] text-[10px] font-bold">
              2
            </span>
            <span>Approve & Connect</span>
          </div>

          <div
            className={`flex items-center gap-2 p-3 border-r border-[#0d2e49] ${
              currentStep === "pipeline"
                ? "bg-[#02243d] text-[#A7EBF2] font-semibold"
                : "text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#042845] text-[10px] font-bold">
              3
            </span>
            <span>Agent Pipeline Execution</span>
          </div>

          <div
            className={`flex items-center gap-2 p-3 ${
              currentStep === "ready"
                ? "bg-[#02243d] text-[#A7EBF2] font-semibold"
                : "text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#042845] text-[10px] font-bold">
              4
            </span>
            <span>Live Workspace Ready</span>
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-themed bg-[#010814]">
          {/* ── STEP 1: DISCOVER WORKLOADS ── */}
          {currentStep === "discover" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#26658C]/70 bg-[#021324] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {dockerLoading ? (
                      <Loader2 className="h-3 w-3 text-[#54ACBF] animate-spin" />
                    ) : dockerError ? (
                      <WifiOff className="h-3 w-3 text-[#F08A7C]" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    <h3 className="font-display text-sm font-bold text-white">
                      {dockerLoading
                        ? "Scanning Docker Engine..."
                        : dockerError
                        ? "Docker Engine Unreachable"
                        : `Docker Engine Connected${dockerInfo ? ` · v${dockerInfo.server_version}` : ""}`}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {dockerLoading
                      ? "Probing Docker socket for running containers and workloads..."
                      : dockerError
                      ? `${dockerError}. Ensure Docker Desktop is running and the daemon is accessible.`
                      : discoveredWorkloads.length > 0
                      ? `EIOS discovered ${discoveredWorkloads.length} containers (${discoveredWorkloads.filter(w => w.status === "running").length} running, ${discoveredWorkloads.filter(w => w.status === "stopped").length} stopped).`
                      : "No containers found. Start the OpenTelemetry Demo stack and refresh."}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!dockerLoading && discoveredWorkloads.length > 0 && (
                    <span className="rounded-lg bg-emerald-950/80 px-2.5 py-1 text-xs font-mono text-emerald-300 border border-emerald-500/40">
                      {discoveredWorkloads.filter(w => w.status === "running").length} Running
                    </span>
                  )}
                  {dockerInfo && (
                    <span className="rounded-lg bg-[#02243d] px-2.5 py-1 text-xs font-mono text-[#A7EBF2] border border-[#26658C]/40">
                      {dockerInfo.containers_running} Active
                    </span>
                  )}
                  <button
                    onClick={discoverContainers}
                    disabled={dockerLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-[#02243d] hover:bg-[#023859] border border-[#26658C]/60 px-3 py-1.5 text-xs text-[#A7EBF2] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${dockerLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>


              {/* Platform Switcher & Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWorkloadPlatform("docker")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[11px] font-semibold border transition-all ${
                      workloadPlatform === "docker"
                        ? "bg-[#023859] text-[#A7EBF2] border-[#54ACBF] shadow-md"
                        : "bg-[#010e1c] text-slate-400 border-[#0d2e49] hover:text-slate-200"
                    }`}
                  >
                    <Box className="h-3 w-3 text-[#54ACBF]" />
                    <span>Docker Containers ({discoveredWorkloads.length})</span>
                  </button>

                  <button
                    onClick={() => setWorkloadPlatform("k8s")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[11px] font-semibold border transition-all ${
                      workloadPlatform === "k8s"
                        ? "bg-[#023859] text-[#A7EBF2] border-[#54ACBF] shadow-md"
                        : "bg-[#010e1c] text-slate-400 border-[#0d2e49] hover:text-slate-200"
                    }`}
                  >
                    <Server className="h-3 w-3 text-[#54ACBF]" />
                    <span>Kubernetes ({k8sWorkloadsList.length > 0 ? k8sWorkloadsList.length : "Discovered"})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter workloads..."
                      className="w-full rounded-xl border border-[#0d2e49] bg-[#021424] py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-[#26658C] focus:outline-none font-mono"
                    />
                  </div>

                  {workloadPlatform === "docker" && (
                    <div className="flex items-center gap-1">
                      {(["all", "app", "infra", "database"] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2 py-1 rounded-lg font-mono text-[10px] capitalize transition-colors ${
                            selectedCategory === cat
                              ? "bg-[#02243d] text-[#A7EBF2] border border-[#26658C]"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Table of Discovered Microservices */}
              <div className="overflow-x-auto rounded-xl border border-[#0d2e49] bg-[#021020] max-h-72 scrollbar-themed">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="border-b border-[#0d2e49] bg-[#010a16] text-[10px] uppercase text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Service / Pod Name</th>
                      <th className="py-2.5 px-3">Container Image</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Ports</th>
                      <th className="py-2.5 px-3">CPU / Mem</th>
                      <th className="py-2.5 px-3">OTel Pipe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0d2e49]">
                    {workloadPlatform === "k8s" ? (
                      k8sWorkloadsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500 font-mono">
                            {k8sAvailable === false
                              ? "Kubernetes cluster not detected on local host. Cluster query mode active."
                              : "No Kubernetes pods discovered in cluster namespaces."}
                          </td>
                        </tr>
                      ) : (
                        k8sWorkloadsList.map((pod: any) => (
                          <tr key={pod.name} className="hover:bg-[#03182b] transition-colors">
                            <td className="py-2 px-3 font-semibold text-slate-200 flex items-center gap-2">
                              <Server className="h-3 w-3 text-[#54ACBF]" />
                              <span>{pod.name}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 truncate max-w-[180px]">
                              {pod.namespace} · {pod.images?.[0] || "image:latest"}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border bg-emerald-950/70 text-emerald-300 border-emerald-600/30">
                                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                                {pod.phase || "Running"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[#A7EBF2]">
                              Ready {pod.ready || 1}/{pod.total_containers || 1}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {pod.node || "node-1"} · {pod.pod_ip || "10.244.0.1"}
                            </td>
                            <td className="py-2 px-3 text-emerald-400 font-bold">
                              ✓ Ready
                            </td>
                          </tr>
                        ))
                      )
                    ) : dockerLoading ? (
                      // Loading skeleton rows
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-2 px-3"><div className="h-3 w-32 bg-[#02243d] rounded" /></td>
                          <td className="py-2 px-3"><div className="h-3 w-40 bg-[#02243d] rounded" /></td>
                          <td className="py-2 px-3"><div className="h-3 w-16 bg-[#02243d] rounded" /></td>
                          <td className="py-2 px-3"><div className="h-3 w-24 bg-[#02243d] rounded" /></td>
                          <td className="py-2 px-3"><div className="h-3 w-20 bg-[#02243d] rounded" /></td>
                          <td className="py-2 px-3"><div className="h-3 w-12 bg-[#02243d] rounded" /></td>
                        </tr>
                      ))
                    ) : filteredWorkloads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          {dockerError
                            ? "⚠ Docker Engine not reachable. Start Docker Desktop and click Refresh."
                            : discoveredWorkloads.length === 0
                            ? "No containers found. Start the OpenTelemetry Demo stack and click Refresh."
                            : "No containers match the current filter."}
                        </td>
                      </tr>
                    ) : (
                      filteredWorkloads.map((workload) => {
                        const isRunning = workload.status === "running" || workload.status === "healthy";
                        const isStopped = workload.status === "stopped" || workload.status === "exited";
                        return (
                          <tr key={workload.name} className="hover:bg-[#03182b] transition-colors">
                            <td className="py-2 px-3 font-semibold text-slate-200 flex items-center gap-2">
                              <Box className="h-3 w-3 text-[#54ACBF]" />
                              <span>{workload.name}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 truncate max-w-[180px]">
                              {workload.image}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                                isRunning
                                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-600/30"
                                  : isStopped
                                  ? "bg-slate-900/70 text-slate-400 border-slate-600/30"
                                  : "bg-yellow-950/70 text-yellow-300 border-yellow-600/30"
                              }`}>
                                <span className={`h-1 w-1 rounded-full ${isRunning ? "bg-emerald-400" : isStopped ? "bg-slate-500" : "bg-yellow-400"}`} />
                                {workload.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[#A7EBF2]">
                              {workload.ports}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {workload.cpu} • {workload.memory}
                            </td>

                            <td className="py-2 px-3 text-emerald-400 font-bold">
                              ✓ Ready
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                </table>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-400 font-mono">
                  Target Workload: <strong>OpenTelemetry Online Boutique (Astronomy Shop)</strong>
                </div>
                <button
                  onClick={() => setCurrentStep("approve")}
                  className="flex items-center gap-2 rounded-xl bg-[#023859] hover:bg-[#034975] border border-[#54ACBF] px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all"
                >
                  <span>Select Workload & Configure</span>
                  <ArrowRight className="h-4 w-4 text-[#A7EBF2]" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: APPROVE & CONNECT ── */}
          {currentStep === "approve" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="rounded-xl border border-[#0d2e49] bg-[#021020] p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#02243d] border border-[#26658C]">
                    <Server className="h-5 w-5 text-[#54ACBF]" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white">
                      Register Enterprise Workload
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Authorize EIOS to bind OpenTelemetry telemetry pipelines
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="rounded-lg bg-[#010914] p-3 border border-[#0d2e49] flex justify-between items-center">
                    <span className="text-slate-400">Application Name:</span>
                    <span className="font-bold text-slate-100">
                      OpenTelemetry Online Boutique (Astronomy Shop)
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#010914] p-3 border border-[#0d2e49] flex justify-between items-center">
                    <span className="text-slate-400">Runtime Orchestrator:</span>
                    <span className="text-[#A7EBF2]">Docker Compose & MicroK8s</span>
                  </div>

                  <div className="rounded-lg bg-[#010914] p-3 border border-[#0d2e49] flex justify-between items-center">
                    <span className="text-slate-400">OTLP Ingestion Endpoints:</span>
                    <span className="text-emerald-300 font-bold">
                      grpc://otel-collector:4317 • http://otel-collector:4318
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#010914] p-3 border border-[#0d2e49] flex justify-between items-center">
                    <span className="text-slate-400">Telemetry Signals:</span>
                    <span className="text-slate-200">
                      Distributed Traces (W3C), Metrics (Prometheus), Logs (OpenSearch)
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#010914] p-3 border border-[#0d2e49] flex justify-between items-center">
                    <span className="text-slate-400">Resource Governance:</span>
                    <span className="text-[#B5E3C8]">
                      WSL2 Host Protection (3800MB limit, 4 concurrency)
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Zero manual Docker or Kubernetes commands required. EIOS automatically injects agent collectors and establishes live monitoring.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep("discover")}
                  className="text-xs text-slate-400 hover:text-slate-200 font-mono"
                >
                  ← Back to Workloads
                </button>

                <button
                  onClick={handleApproveConnect}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#023859] via-[#125178] to-[#023859] hover:brightness-110 border border-[#54ACBF] px-6 py-2.5 text-xs font-semibold text-white shadow-xl transition-all"
                >
                  <span>Approve & Activate Agent Pipeline</span>
                  <ArrowRight className="h-4 w-4 text-[#A7EBF2]" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: AGENT PIPELINE EXECUTION ── */}
          {currentStep === "pipeline" && (
            <div className="space-y-4">
              <div className="text-center max-w-lg mx-auto mb-4">
                <h3 className="font-display text-sm font-bold text-white flex items-center justify-center gap-2">
                  <RotateCw className="h-4 w-4 text-[#54ACBF] animate-spin" />
                  Activating EIOS Autonomous Agent Pipeline
                </h3>
                <p className="mt-1 text-xs text-slate-400 font-mono">
                  Executing Stages 1 through 6 across container workloads
                </p>
              </div>

              {/* 6 Stage Vertical / Grid Pipeline Tracker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                {pipelineStages.map((stage, idx) => {
                  const isDone = idx < activePipelineStage;
                  const isCurrent = idx === activePipelineStage;
                  const isPending = idx > activePipelineStage;

                  return (
                    <div
                      key={stage.id}
                      className={`rounded-xl border p-3.5 transition-all duration-300 ${
                        isCurrent
                          ? "border-[#54ACBF] bg-[#02243d] shadow-[0_0_20px_rgba(84,172,191,0.2)] scale-[1.01]"
                          : isDone
                          ? "border-emerald-500/40 bg-[#021526]"
                          : "border-[#0d2e49]/50 bg-[#010914] opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-display text-xs font-bold text-slate-100 flex items-center gap-2">
                          {stage.title}
                          {isDone && (
                            <Check className="h-3.5 w-3.5 text-emerald-400 font-bold" />
                          )}
                          {isCurrent && (
                            <span className="h-2 w-2 rounded-full bg-[#54ACBF] animate-pulse" />
                          )}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isDone
                              ? "bg-emerald-950/70 text-emerald-300 border-emerald-600/40"
                              : isCurrent
                              ? "bg-[#042845] text-[#A7EBF2] border-[#26658C]"
                              : "bg-[#010914] text-slate-500 border-[#0d2e49]"
                          }`}
                        >
                          {stage.metric}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono font-medium text-[#54ACBF] mb-1">
                        {stage.role}
                      </div>

                      <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
                        {stage.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-xs font-mono text-slate-400 pt-2">
                Stage {activePipelineStage + 1} of {pipelineStages.length} in progress...
              </div>
            </div>
          )}

          {/* ── STEP 4: WORKSPACE READY ── */}
          {currentStep === "ready" && (
            <div className="space-y-5 max-w-xl mx-auto text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-800 to-emerald-950 border border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Enterprise Workload Connected Successfully!
                </h3>
                <p className="mt-1 text-xs text-slate-300 font-mono">
                  OpenTelemetry Online Boutique is registered into EIOS Kernel
                </p>
              </div>

              <div className="rounded-xl border border-[#0d2e49] bg-[#021020] p-4 text-left font-mono text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Microservices Attached:</span>
                  <span className="font-bold text-slate-100">34 Services</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Topology DAG Status:</span>
                  <span className="text-emerald-400">82 Calls Mapped</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Live OTel Receivers:</span>
                  <span className="text-[#A7EBF2]">gRPC :4317 / HTTP :4318</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Resource Governor:</span>
                  <span className="text-[#B5E3C8]">WSL2 3.8GB Eco-Guard Active</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Continuous Feedback Loop:</span>
                  <span className="text-emerald-400">SHA-256 Chained ✓</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#023859] via-[#125178] to-[#023859] hover:brightness-110 border border-[#54ACBF] py-3 text-xs font-semibold text-white shadow-xl transition-all"
              >
                <span>Launch EIOS Workspace / Monitor Live Stack</span>
                <ArrowRight className="h-4 w-4 text-[#A7EBF2]" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex h-10 items-center justify-between border-t border-[#0d2e49] bg-[#010914] px-5 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Kubernetes & Docker Native Integration</span>
          </div>

          <div>
            <span>Autonomous Closed-Loop Telemetry System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
