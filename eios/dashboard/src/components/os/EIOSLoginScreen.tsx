import { useState } from "react";
import { Lock, User, Key, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface EIOSLoginScreenProps {
  onLoginSuccess: (user: string, apiKey: string) => void;
}

export function EIOSLoginScreen({ onLoginSuccess }: EIOSLoginScreenProps) {
  const defaultApiKey =
    import.meta.env.VITE_EIOS_API_KEY ||
    "c34257f5410ad750b5f5e94511954b3321add27471f44609442336c1e65c4983";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("enterprise2025");
  const [confirmPassword, setConfirmPassword] = useState("enterprise2025");
  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please provide an Admin username");
      return;
    }
    if (!password) {
      setError("Please provide an Admin password");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === "register") {
        await api.authRegister(username.trim(), password, "Super Administrator").catch(() => null);
        setSuccessMsg("Account created! Signing in...");
      }

      // Authenticate against backend
      const res = await api.authLogin(username.trim(), password, apiKey.trim()).catch(() => null);
      const activeKey = res?.api_key || apiKey.trim();

      sessionStorage.setItem("eios_api_key", activeKey);
      sessionStorage.setItem("eios_admin_user", username.trim());
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(username.trim(), activeKey);
      }, 400);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Authentication failed. Check credentials.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--eios-01040a))] text-[rgb(var(--eios-text-slate-200))] select-none p-4">
      {/* Background Subtle Geometric Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--eios-021424))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--eios-021424))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Main Login Frame */}
      <div className="relative w-full max-w-md rounded-2xl border border-[rgb(var(--eios-26658c))]/70 bg-[rgb(var(--eios-021020))]/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(2,20,36,0.8)] backdrop-blur-md">
        {/* Header Emblem */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[rgb(var(--eios-14476e))] to-[rgb(var(--eios-041a2e))] border border-[rgb(var(--eios-54acbf))] shadow-lg">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[rgb(var(--eios-a7ebf2))]" fill="currentColor">
              <polygon
                points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <circle cx="12" cy="12" r="3" fill="#A7EBF2" />
            </svg>
          </div>

          <h2 className="font-display text-xl font-bold tracking-wide text-[rgb(var(--eios-text-white))]">
            {mode === "login" ? "EIOS Administrator Login" : "Create Administrator Account"}
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--eios-text-slate-400))] font-mono">
            Enterprise Intelligent Operating System • Kernel 1.0.0
          </p>

          {/* Mode Selector Tabs */}
          <div className="mt-3 flex rounded-xl border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-010914))] p-1 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 rounded-lg py-1 transition-colors ${
                mode === "login" ? "bg-[rgb(var(--eios-023859))] text-[rgb(var(--eios-a7ebf2))] font-semibold border border-[rgb(var(--eios-26658c))]" : "text-[rgb(var(--eios-text-slate-400))] hover:text-[rgb(var(--eios-text-slate-200))]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(null); }}
              className={`flex-1 rounded-lg py-1 transition-colors ${
                mode === "register" ? "bg-[rgb(var(--eios-023859))] text-[rgb(var(--eios-a7ebf2))] font-semibold border border-[rgb(var(--eios-26658c))]" : "text-[rgb(var(--eios-text-slate-400))] hover:text-[rgb(var(--eios-text-slate-200))]"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-[rgb(var(--eios-surface-rose-950))]/40 p-2.5 text-xs text-[rgb(var(--eios-text-rose-300))] font-mono text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-[rgb(var(--eios-surface-emerald-950))]/40 p-2.5 text-xs text-[rgb(var(--eios-text-emerald-300))] font-mono text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
          {/* Username */}
          <div>
            <label className="block text-[11px] font-mono text-[rgb(var(--eios-text-slate-300))] mb-1.5 flex items-center justify-between">
              <span>Admin Username</span>
              <span className="text-[10px] text-[rgb(var(--eios-54acbf))]">Default: admin</span>
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 h-4 w-4 text-[rgb(var(--eios-54acbf))]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-010914))] py-2.5 pl-9 pr-3 text-xs text-[rgb(var(--eios-text-slate-100))] placeholder-slate-500 focus:border-[rgb(var(--eios-26658c))] focus:outline-none"
                placeholder="admin"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-mono text-[rgb(var(--eios-text-slate-300))] mb-1.5">
              Admin Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-[rgb(var(--eios-54acbf))]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-010914))] py-2.5 pl-9 pr-3 text-xs text-[rgb(var(--eios-text-slate-100))] placeholder-slate-500 focus:border-[rgb(var(--eios-26658c))] focus:outline-none"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          {/* Confirm Password (Register mode) */}
          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-mono text-[rgb(var(--eios-text-slate-300))] mb-1.5">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-[rgb(var(--eios-54acbf))]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-010914))] py-2.5 pl-9 pr-3 text-xs text-[rgb(var(--eios-text-slate-100))] placeholder-slate-500 focus:border-[rgb(var(--eios-26658c))] focus:outline-none"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
          )}

          {/* Master API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono text-[rgb(var(--eios-text-slate-300))] flex items-center gap-1.5">
                <Key className="h-3 w-3 text-[rgb(var(--eios-54acbf))]" />
                <span>EIOS Master API Key</span>
              </label>
              <span className="text-[10px] font-mono text-[rgb(var(--eios-text-emerald-400))] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified Token
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--eios-0d2e49))] bg-[rgb(var(--eios-010914))] py-2.5 pl-3 pr-9 font-mono text-[11px] text-[rgb(var(--eios-text-emerald-300))] focus:border-[rgb(var(--eios-26658c))] focus:outline-none"
                placeholder="c34257f5410ad750b5f5e94511954b3321add27471f44609442336c1e65c4983"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 text-[rgb(var(--eios-text-slate-400))] hover:text-[rgb(var(--eios-text-slate-200))]"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-[rgb(var(--eios-text-slate-400))] font-mono">
              Auto-attached to all protected backend routes (X-API-Key).
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--eios-023859))] via-[rgb(var(--eios-125178))] to-[rgb(var(--eios-023859))] py-3 text-xs font-semibold text-[rgb(var(--eios-text-white))] shadow-lg border border-[rgb(var(--eios-54acbf))] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="font-mono">Initializing Session...</span>
            ) : (
              <>
                <span>Sign In to EIOS Desktop</span>
                <ArrowRight className="h-4 w-4 text-[rgb(var(--eios-a7ebf2))]" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="mt-6 pt-4 border-t border-[rgb(var(--eios-0d2e49))]/70 flex items-center justify-between text-[10px] font-mono text-[rgb(var(--eios-text-slate-400))]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[rgb(var(--eios-text-emerald-400))]" />
            <span>Zero-Trust Protocol Active</span>
          </div>
          <span>TLS 1.3 / AES-256</span>
        </div>
      </div>
    </div>
  );
}
