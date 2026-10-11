import { useState } from "react";
import {
  Search,
  ExternalLink,
  Power,
  Cloud,
  Wifi,
  Volume2,
  Battery,
} from "lucide-react";
import type { WindowId } from "./DesktopIcons";

interface OSTaskbarProps {
  activeWindows: Record<WindowId, boolean>;
  onToggleWindow: (id: WindowId) => void;
  onOpenSearch?: (query: string) => void;
  ecoMode?: boolean;
  onToggleEco?: () => void;
}

export function OSTaskbar({
  activeWindows,
  onToggleWindow,
  onOpenSearch,
  ecoMode,
  onToggleEco,
}: OSTaskbarProps) {
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const dockApps: {
    id: WindowId;
    label: string;
    iconSymbol: string;
    color: string;
  }[] = [
    { id: "terminal", label: "Terminal", iconSymbol: ">_", color: "#54ACBF" },
    { id: "filesystem", label: "Files", iconSymbol: "📁", color: "#A7EBF2" },
    { id: "systemmonitor", label: "System Monitor", iconSymbol: "📊", color: "#54ACBF" },
    { id: "integrations", label: "Workloads", iconSymbol: "📦", color: "#A7EBF2" },
    { id: "ai", label: "AI Copilot", iconSymbol: "🧠", color: "#A7EBF2" },
    { id: "workflows", label: "Workflows", iconSymbol: "⚙️", color: "#26658C" },
    { id: "security", label: "Security", iconSymbol: "🛡️", color: "#B5E3C8" },
    { id: "settings", label: "Settings", iconSymbol: "🔧", color: "#54ACBF" },
  ];

  return (
    <>
      {/* Start Menu Overlay */}
      {startMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setStartMenuOpen(false)}
        >
          <div
            className="os-window absolute bottom-12 left-1/2 -translate-x-1/2 w-[460px] rounded-xl p-4 shadow-2xl border border-[#0d2e49] bg-[#021424] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Search */}
            <div className="relative mb-3 flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-[#54ACBF]" />
              <input
                type="text"
                placeholder="Search apps, microservices, configs..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                autoFocus
                className="w-full rounded border border-[#0d2e49] bg-[#010e1c] py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#54ACBF]"
              />
            </div>

            {/* Pinned Applications */}
            <div className="mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#54ACBF] block mb-2 px-1">
                Enterprise Applications
              </span>
              <div className="grid grid-cols-4 gap-2">
                {dockApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onToggleWindow(app.id);
                      setStartMenuOpen(false);
                    }}
                    className="flex flex-col items-center justify-center rounded p-2 hover:bg-[#02243d] border border-transparent hover:border-[#0d2e49] transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#011428] border border-[#26658C] text-sm">
                      <span style={{ color: app.color }}>{app.iconSymbol}</span>
                    </div>
                    <span className="mt-1 text-[10px] text-slate-300 font-medium">
                      {app.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Telemetry Portals */}
            <div className="border-t border-[#0d2e49] pt-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#54ACBF] block mb-1.5 px-1">
                Telemetry Portals
              </span>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                <a
                  href="http://127.0.0.1:8080"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-1.5 rounded bg-[#010e1c] hover:bg-[#02243d] text-[#A7EBF2] border border-[#0d2e49]"
                >
                  <span>Storefront</span>
                  <ExternalLink className="h-3 w-3 text-[#54ACBF]" />
                </a>
                <a
                  href="http://127.0.0.1:8080/jaeger/ui/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-1.5 rounded bg-[#010e1c] hover:bg-[#02243d] text-[#54ACBF] border border-[#0d2e49]"
                >
                  <span>Jaeger UI</span>
                  <ExternalLink className="h-3 w-3 text-[#54ACBF]" />
                </a>
                <a
                  href="http://127.0.0.1:8080/grafana/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-1.5 rounded bg-[#010e1c] hover:bg-[#02243d] text-[#FCD2B3] border border-[#0d2e49]"
                >
                  <span>Grafana</span>
                  <ExternalLink className="h-3 w-3 text-[#F08A7C]" />
                </a>
              </div>
            </div>

            {/* User Profile in Start Menu */}
            <div className="flex items-center justify-between border-t border-[#0d2e49] pt-2 px-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-[#023859] border border-[#26658C] flex items-center justify-center font-bold text-[#A7EBF2] text-[10px]">
                  AD
                </div>
                <div>
                  <span className="text-white font-semibold block leading-tight text-[11px]">
                    Administrator
                  </span>
                  <span className="text-[9px] text-[#54ACBF]">
                    Super Admin • Kernel 1.0.0
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleEco}
                  title="Toggle RAM Saver"
                  className="px-2 py-0.5 rounded border border-[#1C5147] bg-[#051F1C] text-[#B5E3C8] text-[10px] font-mono"
                >
                  RAM SAVER
                </button>
                <button
                  onClick={() => setStartMenuOpen(false)}
                  className="p-1.5 rounded hover:bg-[#2b1216] text-[#E04A5F]"
                  title="Close"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Taskbar (Solid Dark #010814 with border #0d2e49) */}
      <footer className="relative z-30 flex h-11 w-full items-center justify-between border-t border-[#0d2e49] bg-[#010814] px-4 select-none">
        {/* Left Side: Solid Start Button & Search Bar */}
        <div className="flex items-center gap-2.5">
          {/* Solid 4-Tile Emblem Start Button (Zero glow) */}
          <button
            onClick={() => setStartMenuOpen(!startMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#02243d] border border-[#26658C] hover:bg-[#023859] transition-colors"
            title="Start Menu"
          >
            <div className="grid grid-cols-2 gap-0.5">
              <div className="h-1.5 w-1.5 rounded-[1px] bg-[#A7EBF2]" />
              <div className="h-1.5 w-1.5 rounded-[1px] bg-[#54ACBF]" />
              <div className="h-1.5 w-1.5 rounded-[1px] bg-[#26658C]" />
              <div className="h-1.5 w-1.5 rounded-[1px] bg-[#023859]" />
            </div>
          </button>

          {/* Search Input Bar */}
          <div className="relative flex w-44 sm:w-52 items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-[#54ACBF]" />
            <input
              type="text"
              placeholder="Search EIOS..."
              onClick={() => setStartMenuOpen(true)}
              className="h-7 w-full rounded border border-[#0d2e49] bg-[#021424] pl-8 pr-2 text-xs text-slate-200 placeholder-slate-500 outline-none hover:border-[#26658C] focus:border-[#54ACBF] cursor-pointer"
            />
          </div>
        </div>

        {/* Center: Running / Pinned Apps */}
        <div className="flex items-center gap-1">
          {dockApps.map((app) => {
            const isOpen = activeWindows[app.id];

            return (
              <button
                key={app.id}
                onClick={() => onToggleWindow(app.id)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isOpen
                    ? "bg-[#023859] border border-[#26658C]"
                    : "hover:bg-[#02243d] border border-transparent"
                }`}
                title={app.label}
              >
                <span className="text-xs">{app.iconSymbol}</span>
                {isOpen && (
                  <span className="absolute bottom-0.5 h-1 w-2.5 rounded-full bg-[#54ACBF]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: System Tray & Clock */}
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="flex items-center gap-2 pr-2 border-r border-[#0d2e49]">
            <span title="Cloud Sync"><Cloud className="h-3.5 w-3.5 text-[#54ACBF]" /></span>
            <span title="Network"><Wifi className="h-3.5 w-3.5 text-slate-300" /></span>
            <span title="Volume"><Volume2 className="h-3.5 w-3.5 text-slate-300" /></span>
            <span title="Battery"><Battery className="h-3.5 w-3.5 text-[#6EAA90]" /></span>
          </div>

          <div className="flex flex-col items-end leading-none font-mono text-[10px] text-slate-200">
            <span className="font-semibold">10:42 AM</span>
            <span className="text-[9px] text-[#54ACBF]">25 May 2025</span>
          </div>
        </div>
      </footer>
    </>
  );
}
