import { useMemo } from "react";
import { useGameStateContext } from "@/contexts/GameStateContext";
import { Heart, Coins, FlaskConical } from "lucide-react";
import EnergyIcon, { characterToClass } from "@/components/EnergyIcon";
import PotionPill from "@/components/PotionPill";

interface PlayerStatusProps {
  /** Show gold with larger, emphasized styling (e.g. in shop). */
  goldEmphasis?: boolean;
  /** Show held potion count alongside potions (e.g. in shop). */
  showPotionCount?: boolean;
}

export default function PlayerStatus({ goldEmphasis = false, showPotionCount = false }: PlayerStatusProps) {
  const { extended, gameState } = useGameStateContext();
  const playerClass = characterToClass(extended.character);
  const hpPercent = extended.maxHp > 0 ? (extended.currentHp / extended.maxHp) * 100 : 100;
  const sortedPotions = useMemo(
    () => [...extended.potions].sort((a, b) => a.slot - b.slot),
    [extended.potions]
  );

  const hpColor =
    hpPercent > 50 ? "bg-emerald-500" : hpPercent > 25 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="px-3 py-2 border-b border-sidebar-border space-y-2">
      {/* Character & HP */}
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-bold text-foreground">
          {extended.character || "Player"}
        </span>
        <div className="flex items-center gap-1.5">
          <Heart size={11} className="text-red-400" />
          <span className="text-[11px] font-bold text-foreground">
            {extended.currentHp}/{extended.maxHp}
          </span>
        </div>
      </div>

      {/* HP Bar */}
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${hpColor}`}
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      {/* Energy, Gold, Potions */}
      <div className="flex items-center gap-4">
        {/* Energy */}
        <div className="flex items-center gap-1">
          <span className="relative flex h-5 w-5 items-center justify-center">
            <span className="absolute"><EnergyIcon size={18} playerClass={playerClass} /></span>
            <span className="relative text-[10px] font-bold font-display text-white">
              {gameState.energy}
            </span>
          </span>
          <span className="text-[10px] text-muted-foreground">/ {gameState.maxEnergy}</span>
        </div>

        {/* Gold */}
        <div className="flex items-center gap-1">
          <Coins size={goldEmphasis ? 16 : 12} className="text-amber-400" />
          <span className={goldEmphasis
            ? "text-base font-bold font-display text-amber-400"
            : "text-[11px] font-bold text-amber-400"
          }>
            {extended.gold}
          </span>
          {goldEmphasis && (
            <span className="text-[10px] text-muted-foreground">gold</span>
          )}
        </div>

      </div>

      {/* Potions */}
      {sortedPotions.length > 0 && (
        <div className="space-y-1">
          {showPotionCount && (
            <div className="flex items-center gap-1.5">
              <FlaskConical size={11} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Potions
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {sortedPotions.length} held
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {sortedPotions.map((potion) => (
              <PotionPill key={potion.id} potion={potion} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
