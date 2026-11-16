import { es } from "../../i18n/es";
import type { Track } from "../../types";
import { formatClock } from "./clock";
import { useTrackPhoto } from "./trackPhotoCache";

const t = es.pages.analysis;

/**
 * The photo of a track: the best crop of the video itself, so the staff recognises the shirt or the
 * number and links the track to a squad player. Without a photo (analyses from before it existed, or
 * a failed download) it shows the track number, and the table still works.
 */
export default function TrackPhoto({ analysisId, track }: { analysisId: string; track: Track }) {
  const url = useTrackPhoto(analysisId, track.track_id, track.has_snapshot);
  if (!url) {
    return (
      <span className="track-photo track-photo-empty" role="img" aria-label={t.noPhoto(track.track_id)}>
        {track.has_snapshot ? "…" : track.track_id}
      </span>
    );
  }
  return (
    <a className="track-photo" href={url} target="_blank" rel="noreferrer" title={t.photoZoom}>
      <img src={url} alt={t.photoAlt(track.track_id, formatClock(track.snapshot_seconds ?? track.first_seconds))} />
    </a>
  );
}
