import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiError, api } from "../api/client";
import type { Team, User } from "../types";
import { TeamContext } from "./teamState";

async function fetchTeam(): Promise<Team | null> {
  try {
    return await api<Team>("/api/teams/mine");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Loads the user's team once and shares it with every page (see useTeam in teamState.ts). */
export function TeamProvider({ user, children }: { user: User; children: ReactNode }) {
  const isAdmin = user.role === "ADMINISTRATOR";
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(!isAdmin);

  useEffect(() => {
    if (isAdmin) return;
    fetchTeam().then(setTeam).catch(() => setTeam(null)).finally(() => setLoading(false));
  }, [isAdmin]);

  const refresh = useCallback(async () => {
    if (!isAdmin) setTeam(await fetchTeam());
  }, [isAdmin]);

  return (
    <TeamContext.Provider value={{ user, team, loading, refresh, isCoach: user.role === "COACH" }}>
      {children}
    </TeamContext.Provider>
  );
}
