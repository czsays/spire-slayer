import { useMemo } from "react";
import type { DeckCard } from "@/data/deckData";
import type { GameState } from "@/data/gameState";
import type { ExtendedGameInfo, AppPotion } from "@/hooks/useGameState";
import DeckSummary from "@/components/DeckSummary";
import RelicList from "@/components/RelicList";
import PotionPill from "@/components/PotionPill";
import { Coins, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

// ── State label derivation ──────────────────────────────────────

type StateType = string;

interface StateConfig {
  label: string;
  /** Show deck summary in prominent (larger) mode. */
  prominentDeck: boolean;
  /** Show gold with visual emphasis. */
  goldEmphasis: boolean;
  /** Show held potion count alongside potions. */
  showPotionCount: boolean;
}

function getStateConfig(stateType: StateType, extended: ExtendedGameInfo): StateConfig {
  switch (stateType) {
    case "map":
    case "treasure":
      return {
        label: `Map — Act ${extended.act}, Floor ${extended.floor}`,
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    case "card_reward":
      return {
        label: "Choosing Card Reward",
        prominentDeck: true,
        goldEmphasis: false,
        showPotionCount: false,
      };
    case "rewards":
      return {
        label: "Rewards",
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    case "shop":
      return {
        label: "Shop",
        prominentDeck: false,
        goldEmphasis: true,
        showPotionCount: true,
      };
    case "rest_site":
      return {
        label: "Campfire",
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    case "event":
      return {
        label: "Event",
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    case "card_select":
      return {
        label: "Choosing Card",
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    case "relic_select":
      return {
        label: "Choosing Relic",
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    case "bundle_select":
      return {
        label: "Choosing Bundle",
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    default: {
      // Unknown / fallback — capitalize raw stateType
      const label = stateType.charAt(0).toUpperCase() + stateType.slice(1).replace(/_/g, " ");
      return {
        label,
        prominentDeck: false,
        goldEmphasis: false,
        showPotionCount: false,
      };
    }
  }
}

// ── Component ───────────────────────────────────────────────────

interface RunSummaryProps {
  gameState: GameState;
  deck: DeckCard[];
  extended: ExtendedGameInfo;
}

export default function RunSummary({ gameState, deck, extended }: RunSummaryProps) {
  const config = useMemo(
    () => getStateConfig(extended.stateType, extended),
    [extended.stateType, extended.act, extended.floor]
  );

  const sortedPotions = useMemo(
    () => [...extended.potions].sort((a, b) => a.slot - b.slot),
    [extended.potions]
  );

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {/* State label */}
      <div className="flex items-center gap-2">
        <span className="font-display text-xs font-bold text-accent uppercase tracking-wide">
          {config.label}
        </span>
      </div>

      {/* Gold — emphasized in shop */}
      {config.goldEmphasis && (
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-amber-400" />
          <span className="text-base font-bold font-display text-amber-400">{extended.gold}</span>
          <span className="text-[10px] text-muted-foreground">gold</span>
        </div>
      )}

      {/* Deck composition */}
      <DeckSummary deck={deck} prominent={config.prominentDeck} />

      {/* Relics */}
      <RelicList relics={gameState.relics} />

      {/* Potions */}
      {sortedPotions.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <FlaskConical size={11} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Potions
            </span>
            {config.showPotionCount && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {sortedPotions.length} held
              </span>
            )}
          </div>
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
