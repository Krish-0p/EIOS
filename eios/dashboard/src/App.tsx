import { useState } from "react";
import { EIOSBootScreen } from "./components/os/EIOSBootScreen";
import { EIOSLoginScreen } from "./components/os/EIOSLoginScreen";
import { EIOSDesktop } from "./components/os/EIOSDesktop";
import { ThemeToggle } from "./components/ThemeToggle";

type OSStage = "boot" | "login" | "desktop";

export default function App() {
  const [stage, setStage] = useState<OSStage>("boot");
  const [adminUser, setAdminUser] = useState("admin");

  return (
    <div className="w-screen h-screen overflow-hidden bg-[rgb(var(--eios-01040a))] text-[rgb(var(--eios-text-slate-100))]">
      <ThemeToggle />
      {stage === "boot" && (
        <EIOSBootScreen onBootComplete={() => setStage("login")} />
      )}

      {stage === "login" && (
        <EIOSLoginScreen
          onLoginSuccess={(user, key) => {
            setAdminUser(user);
            if (key) sessionStorage.setItem("eios_api_key", key);
            setStage("desktop");
          }}
        />
      )}

      {stage === "desktop" && (
        <EIOSDesktop
          initialOnboardingOpen={true}
          adminUser={adminUser}
          onLockScreen={() => setStage("login")}
          onReboot={() => setStage("boot")}
        />
      )}
    </div>
  );
}
