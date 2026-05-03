import React from "react";

function usePowerSyncStatus() {
  const [status, setStatus] = React.useState<{
    connected: boolean;
    uploading: boolean;
    downloading: boolean;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function tryLoad() {
      try {
        const { usePowerSyncStatus: hook } = await import("@powersync/react");
        if (!cancelled) setStatus(hook());
      } catch {
        // PowerSync not active
      }
    }
    tryLoad();
    return () => { cancelled = true; };
  }, []);

  return status;
}

export function SyncStatus() {
  const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;

  if (!powersyncUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
        <span className="text-xs text-muted-foreground">No sync</span>
      </div>
    );
  }

  return <SyncStatusInner />;
}

function SyncStatusInner() {
  const [online, setOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const label = online ? "Online" : "Offline";
  const color = online ? "bg-primary" : "bg-destructive";
  const pulse = online ? "animate-pulse" : "";

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color} ${pulse}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
