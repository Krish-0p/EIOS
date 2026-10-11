import { useEffect, useState } from "react";
import {
  Cloud,
  Wifi,
  Volume2,
  Battery,
  Zap,
  ShieldCheck,
  Box,
} from "lucide-react";

interface OSHeaderProps {
  ecoMode: boolean;
  onToggleEco: () => void;
  systemHealth?: number;
  onOpenSecurity?: () => void;
  onOpenOnboarding?: () => void;
}

export function OSHeader({
  ecoMode,
  onToggleEco,
  systemHealth = 94,
  onOpenSecurity,
  onOpenOnboarding,
}: OSHeaderProps) {
  const [timeStr, setTimeStr] = useState("10:42 AM");
  const [dateStr, setDateStr] = useState("25 May 2025");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      setDateStr(
        now.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative z-30 flex h-10 w-full items-center justify-between border-b border-[#0d2e49] bg-[#010814] px-4 select-none">
      {/* Brand & Kernel identity */}
      <div className="flex items-center gap-3">
        {/* Solid EIOS Hex Logo (Zero glow) */}
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#02243d] border border-[#26658C]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#54ACBF]" fill="currentColor">
            <polygon
              points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <circle cx="12" cy="12" r="3" fill="#A7EBF2" />
          </svg>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold tracking-wider text-white">
            EIOS
          </span>
          <span className="hidden text-xs font-medium text-slate-300 sm:inline">
            Enterprise Intelligent Operating System
          </span>
          <span className="hidden text-[10px] font-mono text-[#54ACBF] md:inline">
            v1.0.0 | Kernel 1.0.0-enterprise
          </span>
        </div>
      </div>

      {/* Center Status & RAM Saver Toggle (Solid Palette, No Glow) */}
      <div className="hidden items-center gap-2 sm:flex">
        <button
          onClick={onToggleEco}
          title="Click to toggle Eco RAM Saver mode (keeps PC responsive and cool)"
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
            ecoMode
              ? "border-[#1C5147] bg-[#0B302C] text-[#B5E3C8]"
              : "border-[#26658C] bg-[#02243d] text-[#A7EBF2]"
          }`}
        >
          <Zap className={`h-3 w-3 ${ecoMode ? "fill-[#B5E3C8] text-[#B5E3C8]" : "text-[#54ACBF]"}`} />
          <span>{ecoMode ? "RAM Saver: Active (3.8GB Cap)" : "Eco Mode: Available"}</span>
        </button>

        <div className="flex items-center gap-1.5 rounded-full border border-[#1C5147] bg-[#051F1C] px-2.5 py-0.5 text-[11px] text-[#D1F7DE]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6EAA90]" />
          <span>Health: {systemHealth}%</span>
        </div>

        <button
          onClick={onOpenSecurity}
          title="Open EIOS Zero-Trust Security Center (Rehan Module)"
          className="flex items-center gap-1.5 rounded-full border border-[#26658C] bg-[#02243d] px-2.5 py-0.5 text-[11px] text-[#A7EBF2] hover:bg-[#033457] hover:border-[#54ACBF] transition-colors"
        >
          <ShieldCheck className="h-3 w-3 text-[#54ACBF]" />
          <span>Zero-Trust: Enforced</span>
        </button>

        <button
          onClick={onOpenOnboarding}
          title="Click to view discovered containers and OTel pipeline"
          className="flex items-center gap-1.5 rounded-full border border-[#26658C] bg-[#02243d] px-2.5 py-0.5 text-[11px] text-[#A7EBF2] hover:bg-[#033457] hover:border-[#54ACBF] transition-colors"
        >
          <Box className="h-3 w-3 text-[#54ACBF]" />
          <span>Workload: Online Boutique (34 Pods)</span>
        </button>
      </div>

      {/* Right System Indicators & Clock */}
      <div className="flex items-center gap-3 text-slate-300">
        <div className="flex items-center gap-2.5 pr-2 border-r border-[#0d2e49]">
          <span title="Cloud Sync: Connected">
            <Cloud className="h-3.5 w-3.5 text-[#54ACBF] hover:text-[#A7EBF2] cursor-pointer" />
          </span>
          <span title="Enterprise Mesh: 5 GHz">
            <Wifi className="h-3.5 w-3.5 text-slate-300 hover:text-white cursor-pointer" />
          </span>
          <span title="Volume: 80%">
            <Volume2 className="h-3.5 w-3.5 text-slate-300 hover:text-white cursor-pointer" />
          </span>
          <div className="flex items-center gap-1 text-[11px] text-[#B5E3C8]">
            <Battery className="h-3.5 w-3.5 text-[#6EAA90]" />
            <span className="font-mono text-[10px]">100%</span>
          </div>
        </div>

        {/* Live Clock & Date */}
        <div className="flex flex-col items-end leading-none">
          <span className="font-mono text-xs font-semibold text-slate-200">
            {timeStr}
          </span>
          <span className="text-[9px] text-[#54ACBF] tracking-wider font-mono">
            {dateStr}
          </span>
        </div>
      </div>
    </header>
  );
}
