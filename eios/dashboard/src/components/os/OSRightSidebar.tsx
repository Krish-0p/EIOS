import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Lock,
  RotateCw,
  Power,
  Settings,
  TrendingUp,
  CloudLightning,
  ShieldAlert,
} from "lucide-react";
import { api, type Incident } from "@/lib/api";

interface OSRightSidebarProps {
  onOpenSettings?: () => void;
  onOpenAlerts?: () => void;
  onOpenSecurity?: () => void;
  onOpenAIInsight?: (insight: string) => void;
  onLockScreen?: () => void;
  onRestartStack?: () => void;
  servicesRunningCount?: number;
  totalServicesCount?: number;
  healthScore?: number;
}

export function OSRightSidebar({
  onOpenSettings,
  onOpenAlerts,
  onOpenSecurity,
  onOpenAIInsight,
  onLockScreen,
  onRestartStack,
  servicesRunningCount = 48,
  totalServicesCount = 52,
  healthScore = 94,
}: OSRightSidebarProps) {
  const [liveUptime, setLiveUptime] = useState("2d 08h 14m");
  const [liveIncidents, setLiveIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const [inc, upt] = await Promise.all([
          api.incidents(4).catch(() => []),
          api.terminalExec("uptime").catch(() => null),
        ]);
        if (inc && inc.length > 0) setLiveIncidents(inc);
        if (upt?.output && upt.output.includes("uptime:")) {
          setLiveUptime(upt.output.replace("System uptime: ", ""));
        }
      } catch {
        // fallback
      }
    };
    fetchSidebarData();
    const timer = setInterval(fetchSidebarData, 8000);
    return () => clearInterval(timer);
  }, []);
  return (
    <aside className="relative z-20 flex w-72 flex-col gap-2 py-2 pr-3 select-none overflow-y-auto scrollbar-themed bg-[rgb(var(--eios-010610))]/70 border-l border-[rgb(var(--eios-0d2e49))]/60">
      {/* 1. Profile Card with Realistic Solid Titanium Executive Seal (No Glow) */}
      <div className="os-glass-card rounded-xl p-3 border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-021424))]">
        <div className="flex items-center gap-2.5">
          {/* Solid Metallic Administrator Medallion */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[rgb(var(--eios-17486e))] to-[rgb(var(--eios-041a2e))] border border-[rgb(var(--eios-26658c))] shadow-md">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--eios-011428))] border border-[rgb(var(--eios-54acbf))]/50">
              <span className="font-display font-extrabold text-[rgb(var(--eios-a7ebf2))] text-[11px] tracking-wider">
                EIOS
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <span className="font-display font-bold text-base text-[rgb(var(--eios-text-white))] block leading-tight">
              EIOS Core
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[rgb(var(--eios-text-slate-300))]">
              <span>Administrator</span>
              <CheckCircle2 className="h-3 w-3 fill-[rgb(var(--eios-1c5147))] text-[rgb(var(--eios-b5e3c8))] shrink-0" />
            </div>
            <span className="text-[10px] text-[rgb(var(--eios-54acbf))] block font-mono">
              Super Administrator
            </span>
          </div>
        </div>
      </div>

      {/* 2. System Overview Card (User Green Palette: #1C5147, #B5E3C8) */}
      <div className="os-glass-card rounded-xl p-2.5 space-y-2 border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-021424))]">
        <span className="font-display text-xs font-bold text-[rgb(var(--eios-text-slate-200))] block">
          System Overview
        </span>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--eios-text-slate-400))]">Uptime</span>
            <span className="font-mono text-[rgb(var(--eios-text-slate-200))]">{liveUptime}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[rgb(var(--eios-text-slate-400))]">System Health</span>
              <span className="font-mono font-bold text-[rgb(var(--eios-b5e3c8))]">{healthScore}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--eios-051f1c))]">
              <div
                className="h-full bg-[rgb(var(--eios-1c5147))] rounded-full"
                style={{ width: `${healthScore}%`, backgroundColor: "rgb(var(--eios-6eaa90))" }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--eios-text-slate-400))]">Services Running</span>
            <span className="font-mono text-[rgb(var(--eios-a7ebf2))]">
              {servicesRunningCount} / {totalServicesCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--eios-text-slate-400))]">Pending Alerts</span>
            <span className="font-mono text-[rgb(var(--eios-f08a7c))] font-bold">{liveIncidents.length || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. AI Insights Card (Using User Palette: Teal #54ACBF & Coral #F08A7C) */}
      <div className="os-glass-card rounded-xl p-2.5 space-y-2 border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-021424))]">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs font-bold text-[rgb(var(--eios-text-slate-200))]">
            Autonomous Insights
          </span>
          <span className="text-[9px] font-mono text-[rgb(var(--eios-54acbf))] bg-[rgb(var(--eios-02243d))] px-1.5 py-0.2 rounded border border-[rgb(var(--eios-26658c))]">
            Neural
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Item 1: Inventory Reorder */}
          <div className="rounded-lg bg-[rgb(var(--eios-021b2e))] p-2 border border-[rgb(var(--eios-0a3252))] space-y-1">
            <div className="flex items-start gap-1.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[rgb(var(--eios-042845))] text-[rgb(var(--eios-54acbf))] border border-[rgb(var(--eios-26658c))]">
                <TrendingUp className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-[rgb(var(--eios-text-slate-200))] block truncate">
                  Inventory Reorder Prediction
                </span>
                <p className="text-[9.5px] text-[rgb(var(--eios-text-slate-400))] leading-tight">
                  Stock shortage predicted in 5 days.
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenAIInsight?.("inventory")}
              className="w-full rounded bg-[rgb(var(--eios-023859))] py-0.5 text-[9.5px] font-medium text-[rgb(var(--eios-a7ebf2))] hover:bg-[rgb(var(--eios-034975))] border border-[rgb(var(--eios-26658c))] transition-colors"
            >
              View Details
            </button>
          </div>

          {/* Item 2: Cloud Cost Alert */}
          <div className="rounded-lg bg-[rgb(var(--eios-021b2e))] p-2 border border-[rgb(var(--eios-0a3252))] space-y-1">
            <div className="flex items-start gap-1.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[rgb(var(--eios-2b1614))] text-[rgb(var(--eios-f08a7c))] border border-[rgb(var(--eios-e04a5f))]/40">
                <CloudLightning className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-[rgb(var(--eios-text-slate-200))] block truncate">
                  High Cloud Usage
                </span>
                <p className="text-[9.5px] text-[rgb(var(--eios-text-slate-400))] leading-tight">
                  Cloud cost +18% vs last month.
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenAIInsight?.("cloud")}
              className="w-full rounded bg-[rgb(var(--eios-2b1614))] py-0.5 text-[9.5px] font-medium text-[rgb(var(--eios-fcd2b3))] hover:bg-[rgb(var(--eios-3d1e1c))] border border-[rgb(var(--eios-f08a7c))]/40 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* 4. Recent Alerts (Using User Warm Palette: #F08A7C, #E04A5F) */}
      <div className="os-glass-card rounded-xl p-2.5 space-y-1.5 border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-021424))]">
        <span className="font-display text-xs font-bold text-[rgb(var(--eios-text-slate-200))] block">
          Recent Alerts
        </span>

        <div className="space-y-1 text-xs">
          {liveIncidents.length > 0 ? (
            liveIncidents.slice(0, 2).map((inc) => (
              <div key={inc.incident_id} className="flex items-start gap-1.5 py-0.5">
                <span className={`text-xs font-bold ${inc.severity === "critical" || inc.severity === "high" ? "text-[rgb(var(--eios-e04a5f))]" : "text-[rgb(var(--eios-f08a7c))]"}`}>▲</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10.5px] text-[rgb(var(--eios-text-slate-200))] block truncate">
                    {inc.title}
                  </span>
                  <span className="text-[8.5px] text-[rgb(var(--eios-text-slate-400))] font-mono">{inc.entity_service || "system"}</span>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-start gap-1.5 py-0.5">
                <span className="text-[rgb(var(--eios-b5e3c8))] text-xs font-bold">●</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10.5px] text-[rgb(var(--eios-text-slate-200))] block truncate">
                    All microservices within thresholds
                  </span>
                  <span className="text-[8.5px] text-[rgb(var(--eios-text-slate-400))] font-mono">Continuous</span>
                </div>
              </div>
            </>
          )}
        </div>

        {onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            className="w-full rounded bg-[rgb(var(--eios-02243d))] py-1 text-[9.5px] font-medium text-[rgb(var(--eios-a7ebf2))] hover:bg-[rgb(var(--eios-033457))] border border-[rgb(var(--eios-26658c))] transition-colors"
          >
            View All Alerts
          </button>
        )}
      </div>

      {/* 5. Zero-Trust Security Module Card (Rehan Module Integration) */}
      <div className="os-glass-card rounded-xl p-2.5 space-y-2 border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-021424))]">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs font-bold text-[rgb(var(--eios-text-slate-200))]">
            Zero-Trust Mesh
          </span>
          <span className="text-[9px] font-mono text-[rgb(var(--eios-text-emerald-300))] bg-[rgb(var(--eios-surface-emerald-950))]/70 px-1.5 py-0.2 rounded border border-emerald-600/40">
            SHA-256 Chained
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--eios-text-slate-400))] text-[11px]">PII Redactor</span>
            <span className="font-mono text-[rgb(var(--eios-text-emerald-400))] text-[11px]">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--eios-text-slate-400))] text-[11px]">Rate Limiter</span>
            <span className="font-mono text-[rgb(var(--eios-text-slate-200))] text-[11px]">200/60s</span>
          </div>
        </div>

        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className="w-full rounded bg-[rgb(var(--eios-02243d))] py-1 text-[9.5px] font-medium text-[rgb(var(--eios-a7ebf2))] hover:bg-[rgb(var(--eios-033457))] border border-[rgb(var(--eios-26658c))] transition-colors flex items-center justify-center gap-1.5"
          >
            <ShieldAlert className="h-3 w-3 text-[rgb(var(--eios-54acbf))]" />
            <span>Open Security Center</span>
          </button>
        )}
      </div>

      {/* 6. Quick Actions Power Bar (Solid Buttons) */}
      <div className="grid grid-cols-4 gap-1 pt-0.5">
        <button
          onClick={onLockScreen}
          className="flex flex-col items-center justify-center rounded-lg bg-[rgb(var(--eios-021f36))] p-1.5 text-[rgb(var(--eios-text-slate-300))] hover:bg-[rgb(var(--eios-032d4e))] hover:text-[rgb(var(--eios-a7ebf2))] border border-[rgb(var(--eios-0d3454))] transition-colors"
          title="Lock Screen"
        >
          <Lock className="h-3 w-3 mb-0.5 text-[rgb(var(--eios-54acbf))]" />
          <span className="text-[8.5px]">Lock</span>
        </button>

        <button
          onClick={onRestartStack}
          className="flex flex-col items-center justify-center rounded-lg bg-[rgb(var(--eios-021f36))] p-1.5 text-[rgb(var(--eios-text-slate-300))] hover:bg-[rgb(var(--eios-032d4e))] hover:text-[rgb(var(--eios-a7ebf2))] border border-[rgb(var(--eios-0d3454))] transition-colors"
          title="Restart Services"
        >
          <RotateCw className="h-3 w-3 mb-0.5 text-[rgb(var(--eios-54acbf))]" />
          <span className="text-[8.5px]">Restart</span>
        </button>

        <button
          onClick={onRestartStack}
          className="flex flex-col items-center justify-center rounded-lg bg-[rgb(var(--eios-021f36))] p-1.5 text-[rgb(var(--eios-text-slate-300))] hover:bg-[rgb(var(--eios-2b1216))] hover:text-[rgb(var(--eios-e04a5f))] border border-[rgb(var(--eios-0d3454))] transition-colors"
          title="Shut Down"
        >
          <Power className="h-3 w-3 mb-0.5 text-[rgb(var(--eios-e04a5f))]" />
          <span className="text-[8.5px]">Shut Down</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center rounded-lg bg-[rgb(var(--eios-021f36))] p-1.5 text-[rgb(var(--eios-text-slate-300))] hover:bg-[rgb(var(--eios-032d4e))] hover:text-[rgb(var(--eios-a7ebf2))] border border-[rgb(var(--eios-0d3454))] transition-colors"
          title="OS Settings"
        >
          <Settings className="h-3 w-3 mb-0.5 text-[rgb(var(--eios-54acbf))]" />
          <span className="text-[8.5px]">Settings</span>
        </button>
      </div>
    </aside>
  );
}
