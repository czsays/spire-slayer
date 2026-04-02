import { useGameStateContext } from "@/contexts/GameStateContext";
import { Wifi, WifiOff, Monitor } from "lucide-react";

export default function ConnectionStatus() {
  const { connected, dataSource, extended } = useGameStateContext();

  const statusConfig = connected
    ? { color: "bg-emerald-500", icon: Wifi, label: "STS2MCP", textColor: "text-emerald-400" }
    : dataSource === "sample"
      ? { color: "bg-amber-500", icon: Monitor, label: "Sample Data", textColor: "text-amber-400" }
      : { color: "bg-red-500", icon: WifiOff, label: "Disconnected", textColor: "text-red-400" };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${statusConfig.color} animate-pulse`} />
        <StatusIcon size={11} className={statusConfig.textColor} />
        <span className={`text-[10px] font-medium ${statusConfig.textColor}`}>
          {statusConfig.label}
        </span>
      </div>
      {connected && extended.floor > 0 && (
        <span className="text-[10px] text-muted-foreground">
          Act {extended.act} · Floor {extended.floor}
        </span>
      )}
    </div>
  );
}
