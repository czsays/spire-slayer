import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import EnergyIcon, { characterToClass } from "@/components/EnergyIcon";
import ConnectionStatus from "@/components/ConnectionStatus";
import PlayerStatus from "@/components/PlayerStatus";
import EnemyStatusList from "@/components/EnemyStatusList";
import RecommendationPanel from "@/components/RecommendationPanel";
import { useGameStateContext } from "@/contexts/GameStateContext";
import { isTauri } from "@/lib/tauri";
import { createPortal } from "react-dom";
import { type DeckCard, type PileLocation, type CardType, X_COST } from "@/data/deckData";
import { computeCardEffects, type GameState } from "@/data/gameState";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Layers, Archive, Trash2, Hand, Swords, Shield, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import RelicList from "@/components/RelicList";
import RunSummary from "@/components/RunSummary";
import MenuView from "@/components/MenuView";

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
      // Keep tooltip on screen vertically
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - 8;
      }
      if (top < 8) top = 8;
      // Position to the right of the sidebar (400px) in the transparent overflow area
      setPos({ top, left: 408 });
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

function MiniCard({ card, gameState, playerClass }: { card: CardGroupEntry; gameState: GameState; playerClass: ReturnType<typeof characterToClass> }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className={cn("relative w-full rounded-md border-l-4 px-3 py-2 pr-2 transition-colors hover:brightness-125 cursor-pointer", typeColors[card.type])}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
            <span className="absolute"><EnergyIcon size={22} playerClass={playerClass} /></span>
            <span className="relative text-xs font-bold font-display text-white">{card.cost === X_COST ? "X" : card.cost}</span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-card-title text-sm font-semibold text-foreground">
                {card.name}
              </span>
              <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", typeBadgeColors[card.type])}>
                {card.type}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{card.description}</p>
          </div>
        </div>

        <div className="shrink-0 pl-1 text-right">
          <div className="whitespace-nowrap text-xs font-bold font-display text-accent">
            {card.drawOdds > 0 ? `${Math.round(card.drawOdds * 100)}%` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2 pr-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
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
        </div>
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">×{card.totalCount}</span>
      </div>

      {hovered && <EffectTooltip card={card} gameState={gameState} anchorRef={cardRef} />}
    </div>
  );
}

// RelicPill and RelicList extracted to standalone components for reuse

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
      <RelicList relics={gameState.relics} />
    </div>
  );
}

// ── State branching ─────────────────────────────────────────────

/** Combat view: stateType is "combat" or "hand_select" (mid-combat overlay). */
const COMBAT_STATES = new Set(["combat", "hand_select"]);

// ── Main component ───────────────────────────────────────────────

export default function DeckTracker() {
  const [cardsExpanded, setCardsExpanded] = useState(true);
  const { gameState, deck, extended } = useGameStateContext();
  const isCombat = COMBAT_STATES.has(extended.stateType);
  const grouped = useMemo(() => isCombat ? groupCards(deck) : [], [deck, isCombat]);
  const playerClass = characterToClass(extended.character);

  const startDrag = useCallback(async (e: React.MouseEvent) => {
    if (!isTauri()) return;
    e.preventDefault();
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().startDragging();
  }, []);

  const pileCounts = useMemo(() => {
    const counts: Record<PileLocation, number> = { draw: 0, hand: 0, discard: 0, exhaust: 0 };
    for (const c of deck) counts[c.pile]++;
    return counts;
  }, [deck]);

  const cardSummary = useMemo(() => {
    if (!isCombat) return { totalAttacks: 0, totalSkills: 0, totalPowers: 0 };
    const attacks = grouped.filter((c) => c.type === "attack");
    const skills = grouped.filter((c) => c.type === "skill");
    const powers = grouped.filter((c) => c.type === "power");
    const totalAttacks = attacks.reduce((s, c) => s + c.totalCount, 0);
    const totalSkills = skills.reduce((s, c) => s + c.totalCount, 0);
    const totalPowers = powers.reduce((s, c) => s + c.totalCount, 0);
    return { totalAttacks, totalSkills, totalPowers };
  }, [grouped, isCombat]);
  const isMenu = extended.stateType === "menu";

  return (
    <div
      className="relative flex h-screen w-full flex-col bg-sidebar border-r border-sidebar-border overflow-y-hidden"
    >
      <ConnectionStatus />

      <div className="p-3 border-b border-sidebar-border cursor-grab active:cursor-grabbing" onMouseDown={startDrag}>
        <h1 className="font-display text-sm font-bold text-foreground tracking-wide uppercase pointer-events-none select-none">Spire Slayer</h1>
        {isCombat && (
          <div className="flex items-center gap-3 mt-2 pointer-events-none">
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
        )}
      </div>

      {isMenu ? (
        <MenuView />
      ) : isCombat ? (
        <>
          <PlayerStatus />
          <EnemyStatusList />
          <BuffsBar gameState={gameState} />

          <ScrollArea className="flex-1 w-full">
            <button
              onClick={() => setCardsExpanded(!cardsExpanded)}
              className="w-full flex items-center gap-2 px-3 py-2 border-b border-sidebar-border hover:bg-muted/30 transition-colors"
            >
              <Layers size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider">
                Cards
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto mr-1">
                {deck.length}
              </span>
              {cardsExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
            </button>

            {cardsExpanded ? (
              <div className="flex flex-col gap-1.5 p-2 pr-6">
                {grouped.map((card) => (
                  <MiniCard key={card.name} card={card} gameState={gameState} playerClass={playerClass} />
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 flex items-center gap-3 text-[11px]">
                <span className="text-card-attack font-semibold">{cardSummary.totalAttacks} ATK</span>
                <span className="text-card-skill font-semibold">{cardSummary.totalSkills} SKL</span>
                {cardSummary.totalPowers > 0 && (
                  <span className="text-card-power font-semibold">{cardSummary.totalPowers} PWR</span>
                )}
                <span className="text-muted-foreground ml-auto">
                  {pileCounts.hand} in hand · {pileCounts.draw} draw
                </span>
              </div>
            )}

            <RecommendationPanel />
          </ScrollArea>
        </>
      ) : (
        <ScrollArea className="flex-1 w-full">
          <PlayerStatus
            goldEmphasis={extended.stateType === "shop"}
            showPotionCount={extended.stateType === "shop"}
          />
          <RunSummary gameState={gameState} deck={deck} extended={extended} />
        </ScrollArea>
      )}
    </div>
  );
}
