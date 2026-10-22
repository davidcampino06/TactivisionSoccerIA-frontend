import type { Team } from "../../types";
import { useCrestUrl } from "./crestCache";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join("");

/** The team's crest, or its initials when it has none (decorative: the name is always next to it). */
export default function TeamCrest({ team, size = "sm" }: { team: Pick<Team, "id" | "name" | "crest_updated_at">; size?: "sm" | "md" | "lg" }) {
  const url = useCrestUrl(team);
  if (url) return <img className={`team-crest team-crest-${size}`} src={url} alt="" aria-hidden="true" />;
  return <span className={`team-badge team-crest-${size}`} aria-hidden="true">{initials(team.name)}</span>;
}
