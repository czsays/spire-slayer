import { useGameStateContext } from "@/contexts/GameStateContext";
import { Shield, Swords, Heart } from "lucide-react";

export default function EnemyStatusList() {
  const { gameState, extended } = useGameStateContext();

  if (gameState.enemies.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-sidebar-border space-y-2">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        Enemies
      </span>

      {gameState.enemies.map((enemy) => {
        const hpPercent = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0;
        const hpColor =
          hpPercent > 50 ? "bg-red-500" : hpPercent > 25 ? "bg-orange-500" : "bg-red-800";

        // Get intents from extended data
        const intents = extended.enemyIntents.get(enemy.id) || [];

        return (
          <div key={enemy.id} className="space-y-1">
            {/* Name + HP */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground truncate">
                {enemy.name}
              </span>
              <div className="flex items-center gap-1">
                <Heart size={10} className="text-red-400" />
                <span className="text-[10px] font-bold text-foreground">
                  {enemy.hp}/{enemy.maxHp}
                </span>
              </div>
            </div>

            {/* HP Bar */}
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${hpColor}`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {enemy.block > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                  style={{ color: "#4895ef", borderColor: "#4895ef", background: "rgba(72,149,239,0.15)" }}
                >
                  <Shield size={9} /> {enemy.block}
                </span>
              )}
              {enemy.vulnerable > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                  style={{ color: "#e63946", borderColor: "#e63946", background: "rgba(230,57,70,0.15)" }}
                >
                  Vuln {enemy.vulnerable}
                </span>
              )}
              {enemy.weak > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                  style={{ color: "#57cc99", borderColor: "#57cc99", background: "rgba(87,204,153,0.15)" }}
                >
                  Weak {enemy.weak}
                </span>
              )}
              {enemy.strength > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                  style={{ color: "#e63946", borderColor: "#e63946", background: "rgba(230,57,70,0.15)" }}
                >
                  STR +{enemy.strength}
                </span>
              )}

              {/* Intents */}
              {intents.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground ml-auto">
                  <Swords size={9} />
                  {intents.map((i) => i.label || i.intentType).join(", ")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
