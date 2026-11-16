import { useEffect, useState } from "react";
import { fetchBlob } from "../../api/client";

// One object URL per photo: the table keeps asking for the same ones while the person filters or
// assigns, and a photo never changes once the analysis is saved.
const urls = new Map<string, Promise<string | null>>();

export function loadTrackPhoto(analysisId: string, trackId: number): Promise<string | null> {
  const key = `${analysisId}/${trackId}`;
  if (!urls.has(key)) {
    urls.set(key, fetchBlob(`/api/analyses/${analysisId}/tracks/${trackId}/snapshot`)
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => {
        urls.delete(key);          // try again next time (e.g. the backend was waking up)
        return null;
      }));
  }
  return urls.get(key)!;
}

/** Object URL of a track's photo, or null while loading / when it has none. */
export function useTrackPhoto(analysisId: string, trackId: number, available: boolean): string | null {
  const key = `${analysisId}/${trackId}`;
  // Kept with the key it belongs to, so the photo of another track is never shown by mistake.
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!available) return undefined;
    let alive = true;
    void loadTrackPhoto(analysisId, trackId).then((url) => { if (alive) setLoaded({ key, url }); });
    return () => { alive = false; };
  }, [analysisId, trackId, available, key]);
  return available && loaded?.key === key ? loaded.url : null;
}
