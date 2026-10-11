import { createContext, useContext } from "react";
import type { Team, User } from "../types";

export interface TeamState {
  user: User;
  team: Team | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isCoach: boolean;
}

export const TeamContext = createContext<TeamState | null>(null);

export function useTeam(): TeamState {
  const context = useContext(TeamContext);
  if (!context) throw new Error("useTeam must be used inside TeamProvider");
  return context;
}
