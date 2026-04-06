import { useMemo } from "react";
import type { DeckCard } from "@/data/deckData";
import type { GameState } from "@/data/gameState";
import type { ExtendedGameInfo } from "@/hooks/useGameState";
import DeckSummary from "@/components/DeckSummary";
import RelicList from "@/components/RelicList";

// ── State label derivation ──────────────────────────────────────

type StateType = string;

interface StateConfig {
  label: string;
  /** Show deck summary in prominent (larger) mode. */
  prominentDeck: boolean;
}

function getStateConfig(stateType: StateType, act: number, floor: number): StateConfig {
  switch (stateType) {
    case "map":
    case "treasure":
      return {
        label: `Map — Act ${act}, Floor ${floor}`,
        prominentDeck: false,
      };
    case "card_reward":
      return {
        label: "Choosing Card Reward",
        prominentDeck: true,
      };
    case "rewards":
      return {
        label: "Rewards",
        prominentDeck: false,
      };
    case "shop":
      return {
        label: "Shop",
        prominentDeck: false,
      };
    case "rest_site":
      return {
        label: "Campfire",
        prominentDeck: false,
      };
    case "event":
      return {
        label: "Event",
        prominentDeck: false,
      };
    case "card_select":
      return {
        label: "Choosing Card",
        prominentDeck: false,
      };
    case "relic_select":
      return {
        label: "Choosing Relic",
        prominentDeck: false,
      };
    case "bundle_select":
      return {
        label: "Choosing Bundle",
        prominentDeck: false,
      };
    default: {
      // Unknown / fallback — capitalize raw stateType
      const label = stateType.charAt(0).toUpperCase() + stateType.slice(1).replace(/_/g, " ");
      return {
        label,
        prominentDeck: false,
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
    () => getStateConfig(extended.stateType, extended.act, extended.floor),
    [extended.stateType, extended.act, extended.floor]
  );

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {/* State label */}
      <div className="flex items-center gap-2">
        <span className="font-display text-xs font-bold text-accent uppercase tracking-wide">
          {config.label}
        </span>
      </div>

      {/* Deck composition */}
      <DeckSummary deck={deck} prominent={config.prominentDeck} />

      {/* Relics */}
      <RelicList relics={gameState.relics} />
    </div>
  );
}
