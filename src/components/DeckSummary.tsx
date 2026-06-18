import { useDeckSummary } from "@/hooks/useDeckSummary";
import type { DeckCard } from "@/data/deckData";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

interface DeckSummaryProps {
  deck: DeckCard[];
  /** When true, the type breakdown is rendered larger/highlighted (e.g. card_reward state). */
  prominent?: boolean;
}

export default function DeckSummary({ deck, prominent = false }: DeckSummaryProps) {
  const summary = useDeckSummary(deck);

  return (
    <div className="space-y-2">
      {/* Header row: total + avg cost */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Deck
          </span>
          <span className="text-[11px] font-bold text-foreground">{summary.totalCards} cards</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Avg cost: <span className="font-bold text-foreground">{summary.averageCost}</span>
        </span>
      </div>

      {/* Type breakdown */}
      <div className={cn(
        "flex flex-wrap gap-x-3 gap-y-1",
        prominent ? "text-xs" : "text-[11px]"
      )}>
        <span className={cn("font-semibold text-card-attack", prominent && "text-sm")}>
          {summary.attacks} ATK
        </span>
        <span className={cn("font-semibold text-card-skill", prominent && "text-sm")}>
          {summary.skills} SKL
        </span>
        {summary.powers > 0 && (
          <span className={cn("font-semibold text-card-power", prominent && "text-sm")}>
            {summary.powers} PWR
          </span>
        )}
        {summary.curses > 0 && (
          <span className={cn("font-semibold text-card-curse", prominent && "text-sm")}>
            {summary.curses} CRS
          </span>
        )}
        {summary.statuses > 0 && (
          <span className={cn("font-semibold text-card-status", prominent && "text-sm")}>
            {summary.statuses} STS
          </span>
        )}
      </div>
    </div>
  );
}
