import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { sampleDeck, type DeckCard, type PileLocation, type CardType } from "@/data/deckData";
import { sampleGameState, computeCardEffects, type GameState } from "@/data/gameState";
import { ChevronLeft, ChevronRight, Layers, Archive, Trash2, Hand, Swords, Shield, Zap, Info } from "lucide-react";
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

// ── Hover tooltip ────────────────────────────────────────────────

function EffectTooltip({ card, gameState }: { card: CardGroupEntry; gameState: GameState }) {
  const result = useMemo(
    () => computeCardEffects(card.name, card.description, card.type, gameState),
    [card, gameState]
  );

  const effectIcon = (label: string) => {
    if (label.toLowerCase().includes("damage")) return <Swords size={12} className="text-card-attack" />;
    if (label.toLowerCase().includes("block")) return <Shield size={12} className="text-card-skill" />;
    if (label.toLowerCase().includes("energy")) return <Zap size={12} className="text-accent" />;
    return <Info size={12} className="text-muted-foreground" />;
  };

  return (
    <div className="absolute left-full top-0 ml-2 z-50 w-64 rounded-lg border border-border bg-card shadow-xl shadow-black/40 p-3 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150">
      {/* Card name */}
      <div className="font-display text-sm font-bold text-foreground mb-1">{card.name}</div>
      <p className="text-[11px] text-muted-foreground mb-2 italic">{card.description}</p>

      {/* Computed effects */}
      <div className="space-y-1.5">
        {result.lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            {effectIcon(line.label)}
            <span className="text-xs text-muted-foreground">{line.label}:</span>
            {line.base !== null ? (
              <span className="text-xs font-bold">
                {line.changed ? (
                  <>
                    <span className="line-through text-muted-foreground/60 mr-1">{line.base}</span>
                    <span className={line.modified! > line.base! ? "text-pile-hand" : "text-destructive"}>
                      {line.modified}
                    </span>
                  </>
                ) : (
                  <span className="text-foreground">{line.base}</span>
                )}
                {line.suffix && <span className="text-muted-foreground font-normal">{line.suffix}</span>}
              </span>
            ) : (
              <span className="text-xs text-foreground">{line.suffix}</span>
            )}
          </div>
        ))}

        {/* Breakdown */}
        {result.lines.some((l) => l.bonusBreakdown) && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Modifiers</div>
            {result.lines
              .filter((l) => l.bonusBreakdown)
              .map((l, i) => (
                <div key={i} className="text-[11px] text-accent">{l.bonusBreakdown}</div>
              ))}
          </div>
        )}
      </div>

      {/* Game context notes */}
      {result.notes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
          {result.notes.map((note, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
              <span className="text-accent mt-px">•</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mini card with hover ─────────────────────────────────────────

function MiniCard({ card, gameState }: { card: CardGroupEntry; gameState: GameState }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn("relative rounded-md border-l-4 px-3 py-2 transition-colors hover:brightness-125 cursor-pointer", typeColors[card.type])}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
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

        <div className="flex-shrink-0 text-right">
          <div className="text-xs font-bold font-display text-accent">
            {card.drawOdds > 0 ? `${(card.drawOdds * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

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

      {/* Hover tooltip */}
      {hovered && <EffectTooltip card={card} gameState={gameState} />}
    </div>
  );
}

// ── Buffs bar ────────────────────────────────────────────────────

function BuffsBar({ gameState }: { gameState: GameState }) {
  const buffs = [
    { label: "STR", value: gameState.player.strength, color: "text-card-attack" },
    { label: "DEX", value: gameState.player.dexterity, color: "text-card-skill" },
  ].filter((b) => b.value !== 0);

  const debuffs = [
    { label: "Weak", value: gameState.player.weak },
    { label: "Frail", value: gameState.player.frail },
  ].filter((d) => d.value > 0);

  const enemyDebuffs = [
    { label: "Vuln", value: gameState.enemy.vulnerable },
    { label: "Weak", value: gameState.enemy.weak },
  ].filter((d) => d.value > 0);

  return (
    <div className="px-3 py-1.5 border-b border-sidebar-border space-y-1">
      {buffs.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Buffs:</span>
          {buffs.map((b) => (
            <span key={b.label} className={cn("text-[11px] font-bold", b.color)}>
              {b.label} {b.value > 0 ? "+" : ""}{b.value}
            </span>
          ))}
        </div>
      )}
      {debuffs.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Debuffs:</span>
          {debuffs.map((d) => (
            <span key={d.label} className="text-[11px] font-bold text-destructive">
              {d.label} ×{d.value}
            </span>
          ))}
        </div>
      )}
      {enemyDebuffs.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Enemy:</span>
          {enemyDebuffs.map((d) => (
            <span key={d.label} className="text-[11px] font-bold text-accent">
              {d.label} ×{d.value}
            </span>
          ))}
        </div>
      )}
      {gameState.relics.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Relics:</span>
          {gameState.relics.map((r) => (
            <span key={r.id} className="text-[10px] text-foreground bg-secondary px-1.5 py-0.5 rounded">
              {r.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function DeckTracker() {
  const [collapsed, setCollapsed] = useState(false);
  const deck = sampleDeck;
  const gameState = sampleGameState;
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

          <BuffsBar gameState={gameState} />

          <div className="px-3 py-1.5 border-b border-sidebar-border flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="text-pile-draw flex items-center gap-0.5"><Layers size={9} /> Draw</span>
            <span className="text-pile-hand flex items-center gap-0.5"><Hand size={9} /> Hand</span>
            <span className="text-pile-discard flex items-center gap-0.5"><Archive size={9} /> Disc</span>
            <span className="text-pile-exhaust flex items-center gap-0.5"><Trash2 size={9} /> Exh</span>
            <span className="ml-auto text-accent font-bold">% = Draw Odds</span>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 flex flex-col gap-1.5">
              {grouped.map((card) => (
                <MiniCard key={card.name} card={card} gameState={gameState} />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
