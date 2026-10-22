import { useEffect, useState } from "react";
import { fetchBlob } from "../../api/client";
import type { Team } from "../../types";

// One object URL per crest version: the sidebar, the team page and the analysis legend share it.
// The key changes when the crest is replaced (crest_updated_at), so a new one is downloaded.
const urls = new Map<string, Promise<string | null>>();

function crestKey(team: Pick<Team, "id" | "crest_updated_at">): string | null {
  return team.crest_updated_at ? `${team.id}@${team.crest_updated_at}` : null;
}

export function loadCrest(team: Pick<Team, "id" | "crest_updated_at">): Promise<string | null> {
  const key = crestKey(team);
  if (!key) return Promise.resolve(null);
  if (!urls.has(key)) {
    urls.set(key, fetchBlob(`/api/teams/${team.id}/crest`)
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => {
        urls.delete(key);          // try again next time (e.g. the backend was waking up)
        return null;
      }));
  }
  return urls.get(key)!;
}

/** Object URL of the team's crest, or null while loading / when it has none. */
export function useCrestUrl(team: Pick<Team, "id" | "crest_updated_at"> | null | undefined): string | null {
  const id = team?.id;
  const version = team?.crest_updated_at ?? null;
  const key = id && version ? `${id}@${version}` : null;
  // The URL is kept with the key it belongs to, so a stale crest is never shown for a new version.
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!id || !version || !key) return undefined;
    let alive = true;
    void loadCrest({ id, crest_updated_at: version }).then((url) => { if (alive) setLoaded({ key, url }); });
    return () => { alive = false; };
  }, [id, version, key]);
  return key && loaded?.key === key ? loaded.url : null;
}
