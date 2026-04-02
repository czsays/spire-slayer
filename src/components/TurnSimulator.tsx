import { useMemo, useState } from "react";
import { generateTurnPlans, type TurnPlan, type CardPlay } from "@/data/turnSimulator";
import type { DeckCard } from "@/data/deckData";
import type { GameState } from "@/data/gameState";
import { Swords, Shield, Sparkles, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function EnergyHexagon({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      <polygon
        points="12,2 22,7 22,17 12,22 2,17 2,7"
        fill="hsl(330, 80%, 55%)"
        stroke="hsl(330, 90%, 70%)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CardPlayRow({ play }: { play: CardPlay }) {
  const borderClass =
    play.cardType === "attack"
      ? "border-card-attack/40"
      : play.cardType === "skill"
      ? "border-card-skill/40"
      : "border-card-power/40";

  return (
    <div className={cn("flex items-start gap-2 py-1.5 px-2 rounded border-l-2", borderClass, "bg-muted/30")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="relative w-4 h-4 flex items-center justify-center flex-shrink-0">
            <EnergyHexagon size={14} />
            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white">{play.cost}</span>
          </span>
          <span className="text-[11px] font-semibold text-foreground truncate">{play.cardName}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {play.damage > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-card-attack font-medium">
              {play.damage} <Swords size={9} />
            </span>
          )}
          {play.block > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-card-skill font-medium">
              {play.block} <Shield size={9} />
            </span>
          )}
          {play.draws > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-pile-draw font-medium">
              +{play.draws} <Layers size={9} />
            </span>
          )}
          {play.buffs.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-accent font-medium">
              <Sparkles size={9} /> {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TurnPlanCard({ plan, index, expanded, onToggle, maxEnergy }: { plan: TurnPlan; index: number; expanded: boolean; onToggle: () => void; maxEnergy: number }) {
  const labelColors: Record<string, string> = {
    "All-out Attack": "text-card-attack border-card-attack/30 bg-card-attack/5",
    "Full Defense": "text-card-skill border-card-skill/30 bg-card-skill/5",
    "Balanced": "text-accent border-accent/30 bg-accent/5",
    "Setup": "text-card-power border-card-power/30 bg-card-power/5",
    "Utility": "text-muted-foreground border-muted-foreground/30 bg-muted/10",
  };

  return (
    <div className={cn("rounded-lg border overflow-hidden transition-colors", labelColors[plan.label] || labelColors["Utility"])}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors"
      >
        <span className="text-[10px] font-bold bg-current/10 rounded-full w-5 h-5 flex items-center justify-center opacity-60">
          {index + 1}
        </span>
        <span className="text-[11px] font-display font-bold tracking-wide uppercase flex-1 text-left">
          {plan.label}
        </span>

        {/* Summary badges */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium">
            {plan.totalEnergy}/{maxEnergy} <EnergyHexagon size={9} />
          </span>
          {plan.totalDamage > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-card-attack">
              {plan.totalDamage} <Swords size={9} />
            </span>
          )}
          {plan.totalBlock > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-card-skill">
              {plan.totalBlock} <Shield size={9} />
            </span>
          )}
        </div>

        {expanded ? <ChevronUp size={12} className="opacity-50" /> : <ChevronDown size={12} className="opacity-50" />}
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-1 border-t border-current/10">
          <div className="pt-1.5 space-y-1">
            {plan.cards.map((card, i) => (
              <CardPlayRow key={i} play={card} />
            ))}
          </div>

          {/* Turn totals */}
          <div className="flex items-center gap-3 pt-1.5 px-1 border-t border-current/10">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Total:</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold">
              {plan.totalEnergy}/{maxEnergy}E <EnergyHexagon size={9} />
            </span>
            {plan.totalDamage > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-card-attack">
                {plan.totalDamage} <Swords size={9} />
              </span>
            )}
            {plan.totalBlock > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-card-skill">
                {plan.totalBlock} <Shield size={9} />
              </span>
            )}
            {plan.totalDraws > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-pile-draw">
                <Layers size={9} /> +{plan.totalDraws} cards
              </span>
            )}
          </div>

          {plan.allBuffs.length > 0 && (
            <div className="flex flex-wrap gap-1 px-1">
              {plan.allBuffs.map((b, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-medium">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TurnSimulator({ deck, gameState }: { deck: DeckCard[]; gameState: GameState }) {
  const plans = useMemo(() => generateTurnPlans(deck, gameState, 5), [deck, gameState]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  if (plans.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-[11px] text-muted-foreground italic">No playable turns with current energy.</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1.5">
      <div className="flex items-center gap-2 px-1 pb-1">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider">
          Turn Options
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {gameState.energy}E available
        </span>
      </div>
      {plans.map((plan, i) => (
        <TurnPlanCard
          key={plan.id}
          plan={plan}
          index={i}
          expanded={expandedIdx === i}
          onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
          maxEnergy={gameState.energy}
        />
      ))}
    </div>
  );
}
