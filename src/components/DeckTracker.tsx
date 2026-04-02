import { useState, useMemo, useRef, useEffect } from "react";
import TurnSimulator from "@/components/TurnSimulator";
import EnergyIcon from "@/components/EnergyIcon";
import { createPortal } from "react-dom";
import { sampleDeck, type DeckCard, type PileLocation, type CardType } from "@/data/deckData";
import { sampleGameState, computeCardEffects, type GameState, type Relic } from "@/data/gameState";
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
    // Primary: draw odds descending
    const oddsDiff = b.drawOdds - a.drawOdds;
    if (oddsDiff !== 0) return oddsDiff;
    // Secondary: type order
    const typeOrder: CardType[] = ["attack", "skill", "power", "status", "curse"];
    const typeDiff = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name);
  });
}

// ── Hover tooltip ────────────────────────────────────────────────

function EffectTooltip({ card, gameState, anchorRef }: { card: CardGroupEntry; gameState: GameState; anchorRef: React.RefObject<HTMLDivElement> }) {
  const result = useMemo(
    () => computeCardEffects(card.name, card.description, card.type, gameState),
    [card, gameState]
  );

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const tooltipHeight = 200; // estimate
      let top = rect.top;
      // Keep tooltip on screen
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - 8;
      }
      setPos({ top, left: rect.right + 8 });
    }
  }, [anchorRef]);

  const effectIcon = (label: string) => {
    if (label.toLowerCase().includes("damage")) return <Swords size={12} className="text-card-attack" />;
    if (label.toLowerCase().includes("block")) return <Shield size={12} className="text-card-skill" />;
    if (label.toLowerCase().includes("energy")) return <Zap size={12} className="text-accent" />;
    return <Info size={12} className="text-muted-foreground" />;
  };

  if (!pos) return null;

  return createPortal(
    <div
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[9999] w-64 rounded-lg border border-border bg-card shadow-xl shadow-black/40 p-3 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <div className="font-display text-sm font-bold text-foreground mb-1">{card.name}</div>
      <p className="text-[11px] text-muted-foreground mb-2 italic">{card.description}</p>

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
    </div>,
    document.body
  );
}
// ── Mini card with hover ─────────────────────────────────────────

function MiniCard({ card, gameState }: { card: CardGroupEntry; gameState: GameState }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className={cn("relative rounded-md border-l-4 px-3 py-2 transition-colors hover:brightness-125 cursor-pointer", typeColors[card.type])}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex-shrink-0 w-6 h-6 flex items-center justify-center">
            <span className="absolute"><EnergyIcon size={22} /></span>
            <span className="relative text-xs font-bold font-display text-white">{card.cost}</span>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-card-title text-sm font-semibold text-foreground truncate">
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

      {hovered && <EffectTooltip card={card} gameState={gameState} anchorRef={cardRef} />}
    </div>
  );
}

// ── Relic pill with portal tooltip ────────────────────────────────

function RelicPill({ relic }: { relic: Relic }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (hovered && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      let top = rect.bottom + 6;
      if (top + 80 > window.innerHeight) top = rect.top - 80;
      setPos({ top, left: rect.left });
    }
  }, [hovered]);

  return (
    <>
      <span
        ref={ref}
        className="text-[10px] text-foreground bg-secondary px-1.5 py-0.5 rounded cursor-help hover:bg-muted-foreground/20 hover:ring-1 hover:ring-muted-foreground/40 transition-all"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {relic.name}
      </span>
      {hovered && pos && createPortal(
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[9999] w-56 rounded-lg border border-border bg-card shadow-xl shadow-black/40 p-3 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <p className="font-display text-xs font-semibold text-foreground">{relic.name}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{relic.description}</p>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Buffs bar ────────────────────────────────────────────────────

function BuffsBar({ gameState }: { gameState: GameState }) {
  const buffs = [
    { label: "STR", value: gameState.player.strength, color: "#e63946", bg: "rgba(230,57,70,0.15)" },
    { label: "DEX", value: gameState.player.dexterity, color: "#4895ef", bg: "rgba(72,149,239,0.15)" },
  ].filter((b) => b.value !== 0);

  const debuffs = [
    { label: "Weak", value: gameState.player.weak, icon: "weak" as const },
    { label: "Frail", value: gameState.player.frail, icon: "frail" as const },
  ].filter((d) => d.value > 0);

  return (
    <div className="px-3 py-2 border-b border-sidebar-border space-y-2">
      {/* Player buffs */}
      {buffs.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Buffs:</span>
          {buffs.map((b) => (
            <span
              key={b.label}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{ color: b.color, borderColor: b.color, background: b.bg }}
            >
              {b.label} {b.value > 0 ? "+" : ""}{b.value}
            </span>
          ))}
        </div>
      )}

      {/* Player debuffs */}
      {debuffs.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Debuffs:</span>
          {debuffs.map((d) => (
            <span
              key={d.label}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                color: d.icon === "weak" ? "#57cc99" : "#f4a261",
                borderColor: d.icon === "weak" ? "#57cc99" : "#f4a261",
                background: d.icon === "weak" ? "rgba(87,204,153,0.15)" : "rgba(244,162,97,0.15)",
              }}
            >
              {d.label} ×{d.value}
            </span>
          ))}
        </div>
      )}

      {/* Enemy statuses */}
      {gameState.enemies.map((enemy) => {
        const hasStatus = enemy.vulnerable > 0 || enemy.weak > 0 || enemy.block > 0;
        if (!hasStatus) return null;
        return (
          <div key={enemy.id} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{enemy.name}:</span>
            {enemy.block > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: "#4895ef", borderColor: "#4895ef", background: "rgba(72,149,239,0.15)" }}
              >
                🛡 {enemy.block}
              </span>
            )}
            {enemy.vulnerable > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: "#e63946", borderColor: "#e63946", background: "rgba(230,57,70,0.15)" }}
              >
                💔 Vuln ×{enemy.vulnerable}
              </span>
            )}
            {enemy.weak > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: "#57cc99", borderColor: "#57cc99", background: "rgba(87,204,153,0.15)" }}
              >
                💧 Weak ×{enemy.weak}
              </span>
            )}
          </div>
        );
      })}

      {/* Relics */}
      {gameState.relics.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Relics:</span>
          {gameState.relics.map((r) => (
            <RelicPill key={r.id} relic={r} />
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
        "h-screen flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col relative overflow-hidden",
        collapsed ? "w-10" : "w-[360px]"
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute right-1 top-4 z-10 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-accent transition-colors"
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


          <ScrollArea className="flex-1 w-full overflow-hidden">
            <div className="p-2 pr-3 flex flex-col gap-1.5">
              {grouped.map((card) => (
                <MiniCard key={card.name} card={card} gameState={gameState} />
              ))}
            </div>

            <div className="border-t border-sidebar-border">
              <TurnSimulator deck={deck} gameState={gameState} />
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
