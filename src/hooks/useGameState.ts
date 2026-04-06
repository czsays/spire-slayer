import { useState, useEffect, useRef, useCallback } from "react";
import { invoke, listen, isTauri } from "@/lib/tauri";
import type { DeckCard, PileLocation, CardType } from "@/data/deckData";
import type { GameState, BuffState, EnemyState, Relic, RelicEffect } from "@/data/gameState";
import { sampleDeck } from "@/data/deckData";
import { sampleGameState } from "@/data/gameState";

// ── Types matching the Rust AppGameState ─────────────────────────────

interface AppCard {
  id: string;
  name: string;
  card_type: string;
  cost: string;
  description: string;
  is_upgraded: boolean;
  can_play: boolean;
  target_type: string;
  pile: string;
}

interface AppEnemy {
  entity_id: string;
  combat_id: number;
  name: string;
  hp: number;
  max_hp: number;
  block: number;
  strength: number;
  vulnerable: number;
  weak: number;
  intents: { intent_type: string; label: string; description: string }[];
  status: { id: string; name: string; amount: number; description: string }[];
}

interface AppRelic {
  id: string;
  name: string;
  description: string;
  counter: number | null;
}

interface AppPotion {
  id: string;
  name: string;
  description: string;
  slot: number;
  can_use: boolean;
}

interface AppGameState {
  connected: boolean;
  data_source: string;
  state_type: string;
  version: number;
  act: number;
  floor: number;
  ascension: number;
  character: string;
  current_hp: number;
  max_hp: number;
  player_block: number;
  energy: number;
  max_energy: number;
  gold: number;
  player_strength: number;
  player_dexterity: number;
  player_focus: number;
  player_vulnerable: number;
  player_weak: number;
  player_frail: number;
  player_ritual: number;
  player_vigor: number;
  player_plated_armor: number;
  player_metallicize: number;
  hand: AppCard[];
  draw_pile: AppCard[];
  discard_pile: AppCard[];
  exhaust_pile: AppCard[];
  draw_pile_count: number;
  discard_pile_count: number;
  exhaust_pile_count: number;
  enemies: AppEnemy[];
  relics: AppRelic[];
  potions: AppPotion[];
  battle_round: number;
  battle_turn: string;
  is_play_phase: boolean;
}

// ── Convert app state to existing frontend types ─────────────────────

function cardTypeLookup(raw: string): CardType {
  const lower = raw.toLowerCase();
  if (lower === "attack") return "attack";
  if (lower === "skill") return "skill";
  if (lower === "power") return "power";
  if (lower === "status") return "status";
  if (lower === "curse") return "curse";
  return "skill"; // default
}

function pileLookup(raw: string): PileLocation {
  if (raw === "hand") return "hand";
  if (raw === "draw") return "draw";
  if (raw === "discard") return "discard";
  if (raw === "exhaust") return "exhaust";
  return "draw";
}

function convertToDeckCards(appState: AppGameState): DeckCard[] {
  const allCards = [
    ...appState.hand,
    ...appState.draw_pile,
    ...appState.discard_pile,
    ...appState.exhaust_pile,
  ];

  return allCards.map((card, idx) => ({
    id: card.id || `card-${idx}`,
    name: card.name,
    cost: card.cost === "X" ? -1 : (parseInt(card.cost) || 0),
    type: cardTypeLookup(card.card_type),
    description: card.description,
    upgraded: card.is_upgraded,
    pile: pileLookup(card.pile),
  }));
}

function convertToGameState(appState: AppGameState): GameState {
  const player: BuffState = {
    strength: appState.player_strength,
    dexterity: appState.player_dexterity,
    focus: appState.player_focus,
    vulnerable: appState.player_vulnerable,
    weak: appState.player_weak,
    frail: appState.player_frail,
    ritual: appState.player_ritual,
    vigor: appState.player_vigor,
    platedArmor: appState.player_plated_armor,
    metallicize: appState.player_metallicize,
  };

  const enemies: EnemyState[] = appState.enemies.map((e) => ({
    id: e.entity_id,
    name: e.name,
    hp: e.hp,
    maxHp: e.max_hp,
    block: e.block,
    vulnerable: e.vulnerable,
    weak: e.weak,
    strength: e.strength,
  }));

  const relics: Relic[] = appState.relics.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    effect: { type: "custom", description: r.description } as RelicEffect,
  }));

  return {
    player,
    enemies,
    relics,
    energy: appState.energy,
    maxEnergy: appState.max_energy,
  };
}

// ── Extended state with new fields ───────────────────────────────────

export interface ExtendedGameInfo {
  currentHp: number;
  maxHp: number;
  gold: number;
  floor: number;
  act: number;
  ascension: number;
  character: string;
  stateType: string;
  battleRound: number;
  isPlayPhase: boolean;
  potions: AppPotion[];
  enemyIntents: Map<string, { intentType: string; label: string; description: string }[]>;
}

export interface UseGameStateResult {
  gameState: GameState;
  deck: DeckCard[];
  connected: boolean;
  dataSource: string;
  extended: ExtendedGameInfo;
  version: number;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useGameState(): UseGameStateResult {
  const [appState, setAppState] = useState<AppGameState | null>(null);
  const lastVersion = useRef<number>(0);

  const handleUpdate = useCallback((state: AppGameState) => {
    setAppState(state);
    lastVersion.current = state.version;
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    // Get initial state
    invoke<AppGameState>("get_game_state").then((state) => {
      if (state) handleUpdate(state);
    });

    // Subscribe to live updates
    let unlisten: (() => void) | null = null;
    listen<AppGameState>("game-state-update", handleUpdate).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [handleUpdate]);

  // Fall back to sample data only when not in Tauri or no state received yet
  if (!appState || !isTauri()) {
    return {
      gameState: sampleGameState,
      deck: sampleDeck,
      connected: false,
      dataSource: "sample",
      version: 0,
      extended: {
        currentHp: 80,
        maxHp: 80,
        gold: 99,
        floor: 1,
        act: 1,
        ascension: 0,
        character: "Necrobinder",
        stateType: "combat",
        battleRound: 1,
        isPlayPhase: true,
        potions: [],
        enemyIntents: new Map(),
      },
    };
  }

  const gameState = convertToGameState(appState);
  const deck = convertToDeckCards(appState);

  const enemyIntents = new Map<string, { intentType: string; label: string; description: string }[]>();
  for (const enemy of appState.enemies) {
    enemyIntents.set(enemy.entity_id, enemy.intents);
  }

  return {
    gameState,
    deck,
    connected: appState.connected,
    dataSource: appState.data_source,
    version: appState.version,
    extended: {
      currentHp: appState.current_hp,
      maxHp: appState.max_hp,
      gold: appState.gold,
      floor: appState.floor,
      act: appState.act,
      ascension: appState.ascension,
      character: appState.character,
      stateType: appState.state_type,
      battleRound: appState.battle_round,
      isPlayPhase: appState.is_play_phase,
      potions: appState.potions,
      enemyIntents,
    },
  };
}
