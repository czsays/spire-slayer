import { Shield } from "lucide-react";
import type { EnemyState } from "@/data/gameState";
import enemyJawworm from "@/assets/enemy-jawworm.png";

interface EnemyOverlayProps {
  enemies: EnemyState[];
}

/** Game-style circular buff/debuff icon */
function GameBadge({
  icon,
  count,
  bgColor,
  borderColor,
}: {
  icon: React.ReactNode;
  count: number;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-md shadow-black/30"
        style={{ background: bgColor, borderColor }}
      >
        {icon}
      </div>
      <span
        className="text-[11px] font-bold mt-[-4px] px-1 rounded-sm"
        style={{ color: borderColor, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
      >
        {count}
      </span>
    </div>
  );
}

/** Vulnerable icon — broken heart */
function VulnerableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9"
        fill="#e63946"
        stroke="#ff6b6b"
        strokeWidth="1"
      />
      <path
        d="M12 21s8-5.5 8-11a4.5 4.5 0 0 0-8-2.9"
        fill="#c1121f"
        stroke="#ff6b6b"
        strokeWidth="1"
      />
      {/* Crack line */}
      <path d="M12 6L10 11L14 13L11 19" stroke="#ffd166" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Weak icon — dripping droplet */
function WeakIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C12 3 5 11 5 15.5C5 19.09 8.13 22 12 22C15.87 22 19 19.09 19 15.5C19 11 12 3 12 3Z"
        fill="#57cc99"
        stroke="#80ed99"
        strokeWidth="1"
      />
      <path d="M9 17c0-2 3-5 3-5" stroke="#c7f9cc" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** Block/Shield icon */
function BlockIcon() {
  return (
    <Shield size={16} fill="#4895ef" stroke="#90e0ef" strokeWidth={1.5} />
  );
}

function EnemyHpBar({ enemy }: { enemy: EnemyState }) {
  const pct = (enemy.hp / enemy.maxHp) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Game-style badge row */}
      <div className="flex items-end gap-1.5 mb-2">
        {enemy.block > 0 && (
          <GameBadge
            icon={<BlockIcon />}
            count={enemy.block}
            bgColor="rgba(72, 149, 239, 0.25)"
            borderColor="#4895ef"
          />
        )}
        {enemy.vulnerable > 0 && (
          <GameBadge
            icon={<VulnerableIcon />}
            count={enemy.vulnerable}
            bgColor="rgba(230, 57, 70, 0.25)"
            borderColor="#e63946"
          />
        )}
        {enemy.weak > 0 && (
          <GameBadge
            icon={<WeakIcon />}
            count={enemy.weak}
            bgColor="rgba(87, 204, 153, 0.25)"
            borderColor="#57cc99"
          />
        )}
      </div>

      {/* HP bar — game style */}
      <div className="w-28 h-3.5 rounded-full overflow-hidden border border-black/40 relative"
        style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct > 50
              ? "linear-gradient(180deg, #e63946 0%, #a4161a 100%)"
              : pct > 25
              ? "linear-gradient(180deg, #f77f00 0%, #e36414 100%)"
              : "linear-gradient(180deg, #dc2f02 0%, #9d0208 100%)",
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
          style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          {enemy.hp}/{enemy.maxHp}
        </span>
      </div>
      <span className="text-[11px] text-foreground/70 font-display mt-1 tracking-wide">{enemy.name}</span>
    </div>
  );
}

export default function EnemyOverlay({ enemies }: EnemyOverlayProps) {
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

export { GameBadge, VulnerableIcon, WeakIcon, BlockIcon };
