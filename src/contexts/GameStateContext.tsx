import { createContext, useContext, type ReactNode } from "react";
import { useGameState, type UseGameStateResult } from "@/hooks/useGameState";

const GameStateContext = createContext<UseGameStateResult | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const state = useGameState();
  return (
    <GameStateContext.Provider value={state}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameStateContext(): UseGameStateResult {
  const ctx = useContext(GameStateContext);
  if (!ctx) {
    throw new Error("useGameStateContext must be used within GameStateProvider");
  }
  return ctx;
}
