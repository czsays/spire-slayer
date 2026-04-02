import { useState } from "react";
import { useGameStateContext } from "@/contexts/GameStateContext";
import { getRecommendations } from "@/engine/recommend";
import type { Recommendation } from "@/engine/types";
import { useMemo } from "react";
import { ChevronDown, ChevronUp, Swords, Shield, Zap, Trophy, Target, ShieldAlert, Sparkles, Heart, AlertTriangle, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import EnergyIcon from "@/components/EnergyIcon";

function TagBadge({ tag }: { tag: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof Swords }> = {
    "LETHAL!": { bg: "bg-amber-500/20 border-amber-500", text: "text-amber-400", icon: Trophy },
    "Aggressive": { bg: "bg-red-500/15 border-red-500/50", text: "text-red-400", icon: Swords },
    "Defensive": { bg: "bg-blue-500/15 border-blue-500/50", text: "text-blue-400", icon: ShieldAlert },
    "Setup": { bg: "bg-purple-500/15 border-purple-500/50", text: "text-purple-400", icon: Target },
    "Balanced": { bg: "bg-emerald-500/15 border-emerald-500/50", text: "text-emerald-400", icon: Zap },
    "Efficient": { bg: "bg-cyan-500/15 border-cyan-500/50", text: "text-cyan-400", icon: Zap },
  };

  const c = config[tag] || { bg: "bg-secondary", text: "text-muted-foreground", icon: Zap };
  const Icon = c.icon;

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border", c.bg, c.text)}>
      <Icon size={8} />
      {tag}
    </span>
  );
}

function RecommendationCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  const [expanded, setExpanded] = useState(rank === 1);
  const isTop = rank === 1;

  return (
    <div
      className={cn(
        "rounded-md border overflow-hidden transition-colors",
        isTop
          ? "border-accent/50 bg-accent/5"
          : "border-border/50 bg-card/50"
      )}
    >
      {/* Header — clickable to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0",
            isTop ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
          )}>
            {rank}
          </span>
          <div className="flex flex-wrap gap-1">
            {rec.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {rec.totalDamage > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400">
              <Swords size={9} /> {rec.totalDamage}
            </span>
          )}
          {rec.totalBlock > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-400">
              <Shield size={9} /> {rec.totalBlock}
            </span>
          )}
          {expanded ? <ChevronUp size={10} className="text-muted-foreground" /> : <ChevronDown size={10} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Card sequence with targets — always visible */}
      <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
        {rec.sequence.targets.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 text-[11px]">
            {i > 0 && <span className="text-muted-foreground mx-0.5">&rarr;</span>}
            <span className="font-semibold text-foreground">{t.cardName}</span>
            {t.target && (
              <span className="text-[9px] text-muted-foreground font-normal">
                ({t.target})
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/30 px-3 py-2 space-y-1.5">
          {/* Incoming damage summary */}
          {rec.incomingDamage > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="flex items-center gap-0.5 font-bold text-orange-400">
                <Heart size={9} /> Taking {rec.unblockedDamage} damage
              </span>
              {rec.totalBlock > 0 && (
                <span className="text-muted-foreground">
                  ({rec.incomingDamage} incoming − {Math.min(rec.totalBlock, rec.incomingDamage)} blocked)
                </span>
              )}
              {rec.totalBlock === 0 && (
                <span className="text-muted-foreground">
                  ({rec.incomingDamage} incoming, no block)
                </span>
              )}
            </div>
          )}
          {rec.incomingDamage === 0 && !rec.tags.includes("LETHAL!") && (
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
              <Heart size={9} /> No incoming damage
            </div>
          )}

          {/* Incoming debuffs */}
          {rec.incomingDebuffs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="flex items-center gap-0.5 font-bold text-amber-400">
                <AlertTriangle size={9} /> Incoming:
              </span>
              {rec.incomingDebuffs.map((debuff, i) => (
                <span key={i} className="text-amber-300/80">{debuff}</span>
              ))}
            </div>
          )}

          {/* Reasoning bullets */}
          {rec.reasoning.length > 0 && (
            <div className="space-y-0.5">
              {rec.reasoning.map((reason, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                  <span className="text-accent mt-px">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecommendationPanel() {
  const { gameState, deck, extended } = useGameStateContext();
  const [collapsed, setCollapsed] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const recommendations = useMemo(
    () => getRecommendations(gameState, deck, extended, 3),
    [gameState, deck, extended]
  );

  const debugData = useMemo(() => {
    const entries: { name: string; intents: any[]; parsed: { damage: number; debuffs: string[] } }[] = [];
    for (const enemy of gameState.enemies) {
      if (enemy.hp <= 0) continue;
      const intents = extended.enemyIntents.get(enemy.id) || [];
      let damage = 0;
      const debuffs: string[] = [];
      for (const intent of intents) {
        const iType = ((intent as any).intentType || (intent as any).intent_type || "").toLowerCase();
        const label = (intent as any).label || "";
        const desc = (intent as any).description || "";
        if (iType.includes("attack")) {
          const m = label.match(/\d+/);
          if (m) damage += parseInt(m[0]);
        }
        if (iType.includes("status") || iType.includes("debuff") || iType.includes("curse") ||
            /vulnerable|weak|frail|poison|wound|daze|burn/i.test(desc)) {
          debuffs.push(desc || `${iType}: ${label}`);
        }
      }
      entries.push({ name: enemy.name, intents, parsed: { damage, debuffs } });
    }
    return entries;
  }, [gameState.enemies, extended.enemyIntents]);

  if (recommendations.length === 0) return null;

  return (
    <div className="border-t border-sidebar-border">
      <div className="flex items-center">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-1 flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
        >
          <Sparkles size={12} className="text-accent" />
          <span className="text-[10px] font-display font-bold text-accent uppercase tracking-wider">
            Recommendations
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground ml-auto mr-1 flex-shrink-0">
            {gameState.energy} <EnergyIcon size={10} />
          </span>
          {collapsed ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronUp size={12} className="text-muted-foreground" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowDebug(!showDebug); }}
          className={cn(
            "p-2 transition-colors",
            showDebug ? "text-yellow-400 hover:text-yellow-300" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          title="Toggle debug panel"
        >
          <Bug size={11} />
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-1.5 px-2 pb-2">
          {recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} rank={i + 1} />
          ))}

          {showDebug && (
            <div className="mt-1 p-2 rounded border border-yellow-500/30 bg-yellow-500/5 space-y-2">
              <span className="text-[9px] font-bold text-yellow-400 uppercase">Debug: Enemy Intents</span>
              {debugData.map((entry, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="text-[9px] font-bold text-yellow-300">{entry.name}</div>
                  <div className="text-[8px] text-yellow-300/50 font-mono break-all">
                    Raw: {JSON.stringify(entry.intents)}
                  </div>
                  <div className="text-[8px] text-yellow-300/70 font-mono">
                    Parsed → dmg: {entry.parsed.damage}, debuffs: {entry.parsed.debuffs.length > 0 ? entry.parsed.debuffs.join("; ") : "none"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
