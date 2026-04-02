import { Shield } from "lucide-react";
import type { EnemyState } from "@/data/gameState";
import enemyJawworm from "@/assets/enemy-jawworm.png";

interface EnemyOverlayProps {
  enemies: EnemyState[];
}

function EnemyHpBar({ enemy }: { enemy: EnemyState }) {
  const pct = (enemy.hp / enemy.maxHp) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Debuff icons */}
      <div className="flex items-center gap-1 mb-1">
        {enemy.block > 0 && (
          <span className="flex items-center gap-0.5 bg-card-skill/80 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
            <Shield size={10} /> {enemy.block}
          </span>
        )}
        {enemy.vulnerable > 0 && (
          <span className="bg-card-attack/80 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
            Vuln {enemy.vulnerable}
          </span>
        )}
        {enemy.weak > 0 && (
          <span className="bg-accent/80 text-background text-[10px] font-bold px-1.5 py-0.5 rounded">
            Weak {enemy.weak}
          </span>
        )}
      </div>

      {/* HP bar */}
      <div className="w-24 h-3 bg-muted rounded-sm overflow-hidden border border-border/50">
        <div
          className="h-full bg-destructive transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-destructive mt-0.5">
        {enemy.hp}/{enemy.maxHp}
      </span>
      <span className="text-[10px] text-foreground/70 font-display">{enemy.name}</span>
    </div>
  );
}

export default function EnemyOverlay({ enemies }: EnemyOverlayProps) {
  // Only show the second enemy (first is already in the screenshot)
  const secondEnemy = enemies[1];
  if (!secondEnemy) return null;

  return (
    <div className="absolute right-[8%] top-[15%] flex flex-col items-center pointer-events-none select-none">
      <EnemyHpBar enemy={secondEnemy} />
      <img
        src={enemyJawworm}
        alt={secondEnemy.name}
        className="w-28 h-28 object-contain mt-1 drop-shadow-lg"
      />
    </div>
  );
}
