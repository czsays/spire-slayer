import { useState, useMemo } from "react";
import { sampleDeck, type DeckCard, type PileLocation, type CardType } from "@/data/deckData";
import { ChevronLeft, ChevronRight, Layers, Archive, Trash2, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const pileConfig: Record<PileLocation, { label: string; icon: typeof Layers; colorClass: string }> = {
  draw: { label: "Draw Pile", icon: Layers, colorClass: "text-pile-draw" },
  hand: { label: "In Hand", icon: Hand, colorClass: "text-pile-hand" },
  discard: { label: "Discard", icon: Archive, colorClass: "text-pile-discard" },
  exhaust: { label: "Exhausted", icon: Trash2, colorClass: "text-pile-exhaust" },
};

const typeColors: Record<CardType, string> = {
  attack: "border-card-attack bg-card-attack/10",
  skill: "border-card-skill bg-card-skill/10",
  power: "border-card-power bg-card-power/10",
  status: "border-card-status bg-card-status/10",
  curse: "border-card-curse bg-card-curse/10",
};

const typeBadgeColors: Record<CardType, string> = {
  attack: "bg-card-attack/80 text-foreground",
  skill: "bg-card-skill/80 text-foreground",
  power: "bg-card-power/80 text-foreground",
  status: "bg-card-status/80 text-foreground",
  curse: "bg-card-curse/80 text-foreground",
};

interface CardGroupEntry {
  name: string;
  type: CardType;
  cost: number;
  description: string;
  upgraded: boolean;
  totalCount: number;
  piles: Record<PileLocation, number>;
  drawOdds: number;
}

function groupCards(deck: DeckCard[]): CardGroupEntry[] {
  const drawPileSize = deck.filter((c) => c.pile === "draw").length;
  const groups = new Map<string, CardGroupEntry>();

  for (const card of deck) {
    const key = `${card.name}${card.upgraded ? "+" : ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        name: card.upgraded ? `${card.name}+` : card.name,
        type: card.type,
        cost: card.cost,
        description: card.description,
        upgraded: card.upgraded,
        totalCount: 0,
        piles: { draw: 0, hand: 0, discard: 0, exhaust: 0 },
        drawOdds: 0,
      });
    }
    const g = groups.get(key)!;
    g.totalCount++;
    g.piles[card.pile]++;
  }

  // Calculate draw odds
  for (const g of groups.values()) {
    g.drawOdds = drawPileSize > 0 ? g.piles.draw / drawPileSize : 0;
  }

  return Array.from(groups.values()).sort((a, b) => {
    const typeOrder: CardType[] = ["attack", "skill", "power", "status", "curse"];
    const diff = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

function MiniCard({ card }: { card: CardGroupEntry }) {
  return (
    <div className={cn("rounded-md border-l-4 px-3 py-2 transition-colors hover:brightness-125", typeColors[card.type])}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Cost gem */}
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center text-xs font-bold font-display text-primary-foreground">
            {card.cost}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-sm font-semibold text-foreground truncate">
                {card.name}
              </span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold", typeBadgeColors[card.type])}>
                {card.type}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{card.description}</p>
          </div>
        </div>

        {/* Draw odds */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xs font-bold font-display text-accent">
            {card.drawOdds > 0 ? `${(card.drawOdds * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Pile breakdown */}
      <div className="flex items-center gap-3 mt-1.5">
        {(Object.entries(card.piles) as [PileLocation, number][]).map(([pile, count]) => {
          if (count === 0) return null;
          const config = pileConfig[pile];
          const Icon = config.icon;
          return (
            <span key={pile} className={cn("flex items-center gap-0.5 text-[11px]", config.colorClass)}>
              <Icon size={11} />
              <span className="font-medium">{count}</span>
            </span>
          );
        })}
        <span className="text-[11px] text-muted-foreground ml-auto">×{card.totalCount}</span>
      </div>
    </div>
  );
}

export default function DeckTracker() {
  const [collapsed, setCollapsed] = useState(false);
  const deck = sampleDeck;
  const grouped = useMemo(() => groupCards(deck), [deck]);

  const pileCounts = useMemo(() => {
    const counts: Record<PileLocation, number> = { draw: 0, hand: 0, discard: 0, exhaust: 0 };
    for (const c of deck) counts[c.pile]++;
    return counts;
  }, [deck]);

  return (
    <div
      className={cn(
        "h-screen flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col relative",
        collapsed ? "w-10" : "w-80"
      )}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 z-10 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight size={14} className="text-foreground" /> : <ChevronLeft size={14} className="text-foreground" />}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center pt-12 gap-2">
          <Layers size={16} className="text-pile-draw" />
          <span className="text-[10px] text-muted-foreground">{pileCounts.draw}</span>
          <Archive size={16} className="text-pile-discard" />
          <span className="text-[10px] text-muted-foreground">{pileCounts.discard}</span>
          <Trash2 size={16} className="text-pile-exhaust" />
          <span className="text-[10px] text-muted-foreground">{pileCounts.exhaust}</span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-3 border-b border-sidebar-border">
            <h1 className="font-display text-sm font-bold text-foreground tracking-wide uppercase">Deck Tracker</h1>
            <div className="flex items-center gap-3 mt-2">
              {(Object.entries(pileCounts) as [PileLocation, number][]).map(([pile, count]) => {
                const config = pileConfig[pile];
                const Icon = config.icon;
                return (
                  <div key={pile} className="flex items-center gap-1">
                    <Icon size={13} className={config.colorClass} />
                    <span className={cn("text-xs font-semibold", config.colorClass)}>{count}</span>
                  </div>
                );
              })}
              <span className="text-xs text-muted-foreground ml-auto">{deck.length} total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="px-3 py-1.5 border-b border-sidebar-border flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="text-pile-draw flex items-center gap-0.5"><Layers size={9} /> Draw</span>
            <span className="text-pile-hand flex items-center gap-0.5"><Hand size={9} /> Hand</span>
            <span className="text-pile-discard flex items-center gap-0.5"><Archive size={9} /> Disc</span>
            <span className="text-pile-exhaust flex items-center gap-0.5"><Trash2 size={9} /> Exh</span>
            <span className="ml-auto text-accent font-bold">% = Draw Odds</span>
          </div>

          {/* Card list */}
          <ScrollArea className="flex-1">
            <div className="p-2 flex flex-col gap-1.5">
              {grouped.map((card) => (
                <MiniCard key={card.name} card={card} />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
