import { useMemo, useState } from "react";
import { generateTurnPlans, type TurnPlan, type CardPlay } from "@/data/turnSimulator";
import type { DeckCard } from "@/data/deckData";
import type { GameState } from "@/data/gameState";
import { Swords, Shield, Sparkles, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import EnergyIcon from "@/components/EnergyIcon";

function CardPlayRow({ play }: { play: CardPlay }) {
  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded border-l-2 border-current/30 bg-muted/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="relative w-4 h-4 flex items-center justify-center flex-shrink-0">
            <EnergyIcon size={14} />
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
  // Interpolate between attack red and defense blue based on attackRatio
  const r = plan.attackRatio;
  const hue = Math.round(0 * r + 220 * (1 - r)); // 0 = red, 220 = blue
  const borderColor = `hsl(${hue}, 70%, 50%)`;
  const bgColor = `hsl(${hue}, 70%, 50%, 0.08)`;
  const textColor = `hsl(${hue}, 80%, 65%)`;

  return (
    <div
      className="overflow-hidden rounded-lg border transition-colors"
      style={{ borderColor, backgroundColor: bgColor, color: textColor }}
    >
      <button
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[10px] font-bold opacity-60">
          {index + 1}
        </span>
        <span className="truncate text-left text-[11px] font-display font-bold tracking-wide uppercase">
          {plan.label}
        </span>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium whitespace-nowrap">
            {plan.totalEnergy}/{maxEnergy} <EnergyIcon size={9} />
          </span>
          {plan.totalDamage > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-card-attack whitespace-nowrap">
              {plan.totalDamage} <Swords size={9} />
            </span>
          )}
          {plan.totalBlock > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-card-skill whitespace-nowrap">
              {plan.totalBlock} <Shield size={9} />
            </span>
          )}
        </div>

        <span className="flex shrink-0 items-center justify-center opacity-50">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-current/10 px-2 pb-2">
          <div className="space-y-1 pt-1.5">
            {plan.cards.map((card, i) => (
              <CardPlayRow key={i} play={card} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-current/10 px-1 pt-1.5">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Total:</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold whitespace-nowrap">
              {plan.totalEnergy}/{maxEnergy}E <EnergyIcon size={9} />
            </span>
            {plan.totalDamage > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-card-attack whitespace-nowrap">
                {plan.totalDamage} <Swords size={9} />
              </span>
            )}
            {plan.totalBlock > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-card-skill whitespace-nowrap">
                {plan.totalBlock} <Shield size={9} />
              </span>
            )}
            {plan.totalDraws > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-pile-draw whitespace-nowrap">
                <Layers size={9} /> +{plan.totalDraws}
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
  const plans = useMemo(() => generateTurnPlans(deck, gameState), [deck, gameState]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  if (plans.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-[11px] text-muted-foreground italic">No playable turns with current energy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 p-2 pr-6">
      <div className="flex items-center gap-2 px-1 pb-1">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider">
          Turn Options
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground ml-auto flex-shrink-0 whitespace-nowrap">
          {gameState.energy} <EnergyIcon size={10} />
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
