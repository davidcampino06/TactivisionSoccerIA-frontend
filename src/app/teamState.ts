import { createContext, useContext } from "react";
import type { Team, User } from "../types";

export interface TeamState {
  user: User;
  team: Team | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isCoach: boolean;
  /** Replaces the signed-in user (after editing the profile or changing the password). */
  updateUser: (user: User) => void;
}

export const TeamContext = createContext<TeamState | null>(null);

export function useTeam(): TeamState {
  const context = useContext(TeamContext);
  if (!context) throw new Error("useTeam must be used inside TeamProvider");
  return context;
}
