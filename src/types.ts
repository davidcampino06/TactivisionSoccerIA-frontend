export type Role = "ADMINISTRATOR" | "COACH" | "ANALYST";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: Role;
  team_id: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Team {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  description?: string | null;
  coach_id?: string;
  invitation_code: string | null;
}

export interface Match {
  id: string;
  team_id?: string;
  opponent: string;
  match_date: string;
  is_home: boolean;
  home_score?: number | null;
  away_score?: number | null;
  result: string | null;
  location?: string | null;
  status: string;
}

export interface Video {
  id: string;
  match_id?: string;
  file_name: string;
  format?: string;
  status: string;
  file_size: number;
  duration_seconds?: number | null;
  uploaded_at?: string;
  /** False when the server lost the file (ephemeral disk): a new real analysis needs it again. */
  file_available?: boolean;
}

export type AnalysisStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface VideoAnalysis {
  id: string;
  video_id?: string;
  status: AnalysisStatus;
  analysis_mode: string;
  model_name: string | null;
  model_version?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  warning_message: string | null;
  queue_position: number | null;
}

export interface Indicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number | null;
}

export interface Recommendation {
  id: string;
  match_id?: string;
  title: string;
  description: string;
  evidence: string;
  confidence: number;
  severity: string;
  status: string;
  created_at?: string;
  indicator_names?: string[];
}

export interface AnalysisResult {
  analysis: VideoAnalysis;
  label: string;
  summary: Record<string, number | boolean>;
  indicators: Indicator[];
  recommendations: Recommendation[];
  /** Graph of supports between team-mates (AI: graph + BFS). Null for older analyses. */
  proximity_network?: ProximityNetwork | null;
}

export interface NetworkNode {
  track_id: number;
  /** Image ratios (0..1). */
  x: number;
  y: number;
  degree: number;
  group: number;
}

export interface TeamNetwork {
  nodes: NetworkNode[];
  links: [number, number][];
  groups: number;
  isolated: number[];
  diameter: number;
  /** BFS hops: hops[source][target] for every pair in the same group. */
  hops: Record<string, Record<string, number>>;
}

export interface ProximityNetwork {
  frame_number: number;
  timestamp_seconds: number;
  link_distance: number;
  teams: Partial<Record<"TEAM_A" | "TEAM_B", TeamNetwork>>;
}

export interface Notification {
  id: string;
  event: string;
  team_id: string;
  analysis_id: string | null;
  match_id: string | null;
  message: string;
  created_at: string;
  read: boolean;
}

export type PlayerStatus = "ACTIVE" | "INJURED" | "SUSPENDED" | "INACTIVE";

export interface Player {
  id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  shirt_number: number | null;
  position: string | null;
  preferred_foot: string | null;
  status: PlayerStatus;
  created_at: string;
}

export interface PlayerHistory {
  id: string;
  player_id: string;
  team_id: string;
  joined_at: string;
  left_at: string | null;
  withdrawal_reason: string | null;
}

export interface PlayerAppearance {
  analysis_id: string;
  match_id: string;
  opponent: string;
  match_date: string;
  analysis_mode: string;
  tracks: number[];
  detections: number;
  mean_confidence: number;
}

export interface Track {
  track_id: number;
  label: string;
  detections: number;
  first_frame: number;
  last_frame: number;
  mean_confidence: number;
  player_id: string | null;
}

export interface TacticalPlay {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  action_type: string | null;
  created_at: string;
  is_reusable: boolean;
}

export interface TacticalPlaySummary extends TacticalPlay {
  version_count: number;
  current_version_number: number | null;
  updated_at: string | null;
  configuration: Record<string, unknown>;
}

export interface TacticalVersion {
  id: string;
  tactical_play_id: string;
  created_by: string | null;
  version_number: number;
  configuration: Record<string, unknown>;
  created_at: string;
  is_current: boolean;
}

export type ThresholdStatus = "OK" | "EXCEEDS" | null;

export interface MatchSnapshot {
  match_id: string;
  opponent: string;
  match_date: string;
  result: string | null;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  analysis_id: string | null;
  analysis_mode: string | null;
  indicators: Record<string, { value: number; unit: string; threshold: number | null; status: ThresholdStatus }>;
  possible_issues: number;
  mean_issue_confidence: number | null;
}

export interface ComparisonRow {
  indicator: string;
  unit: string | null;
  threshold: number | null;
  risk_direction: "above" | "below";
  statuses: ThresholdStatus[];
  values: (number | null)[];
  difference_last_vs_first: number | null;
  range: number | null;
}

export interface Comparison {
  matches: MatchSnapshot[];
  indicators: ComparisonRow[];
  warnings: string[];
}

export type Trend = "INCREASING" | "DECREASING" | "STABLE" | "INSUFFICIENT_DATA";
export type Assessment = "IMPROVING" | "WORSENING" | "STABLE" | "INSUFFICIENT_DATA" | null;

export interface EvolutionTrend {
  indicator: string;
  unit: string | null;
  threshold: number | null;
  risk_direction: "above" | "below";
  values: (number | null)[];
  deltas_vs_previous: (number | null)[];
  slope: number | null;
  trend: Trend;
  assessment: Assessment;
}

export interface Evolution {
  matches: MatchSnapshot[];
  trends: EvolutionTrend[];
  warnings: string[];
}

export interface MatchNeighbors {
  previous: Match | null;
  current: Match;
  next: Match | null;
}

export interface AnalysedMatch {
  match_id: string;
  opponent: string;
  match_date: string;
  result: string | null;
  analysis_id: string;
  analysis_mode: string;
}

export type ReportType = "MATCH" | "VIDEO_ANALYSIS" | "TEAM_EVOLUTION";

export interface Report {
  id: string;
  team_id: string;
  generated_by: string | null;
  generated_by_name: string | null;
  title: string;
  report_type: ReportType;
  generated_at: string;
  version: number;
}

export interface ReportSnapshot {
  report_type: ReportType;
  title: string;
  team: { id: string; name: string; category: string | null };
  generated_by: string;
  generated_at: string;
  warnings?: string[];
  match?: { id: string; opponent: string; date: string; is_home: boolean; score: string | null; result: string | null; status: string };
  events?: { minute: number; second: number; type: string; zone: string | null; result: string | null }[];
  analysis?: { id: string; label: string; model: string | null; model_version: string | null; completed_at: string | null; warnings: string | null } | null;
  tactical_indicators?: { name: string; value: number; unit: string; threshold: number | null }[];
  possible_issues?: { issue: string; evidence: string; confidence: number; severity: string; status: string; related_indicators: string[] }[];
  ai_recommendations?: { recommendation: string; issue: string; confidence: number; status: string }[];
  team_evolution?: Evolution;
}

export interface ReportDetail extends Report {
  snapshot: ReportSnapshot;
}

export interface AdminUser extends User {
  team_name: string | null;
}

export interface AdminTeam {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  coach_name: string | null;
  analysts: number;
  players: number;
  matches: number;
  analyses: number;
}

export interface AdminOverview {
  users: { total: number; by_role: Record<string, number>; inactive: number; signups: { date: string; count: number }[] };
  teams: number;
  matches: number;
  videos: number;
  analyses: { total: number; by_status: Record<string, number>; by_mode: Record<string, number> };
  queue: { waiting: number; mode: string; jobs: { team: string; status: string; mode: string; started_at: string | null; position: number | null }[] };
  system: {
    backend: string; database: string; ai_service: string; environment: string; row_level_security: boolean;
    encrypted_passwords: boolean; api_docs: boolean; simulation_mode: boolean;
  };
}

/** One open issue in the team's review queue (binary heap in the backend). */
export interface ReviewQueueItem {
  id: string;
  rank: number | null;
  title: string;
  severity: string;
  confidence: number;
  status: string;
  match_id: string;
  opponent: string;
  match_date: string;
  analysis_id: string | null;
}

export interface ReviewQueue {
  total: number;
  /** Popped from the heap: rank 1 = review first. */
  items: ReviewQueueItem[];
  /** The heap array as stored (level order), to draw the tree. */
  heap: ReviewQueueItem[];
}

/** Participation of a player in the analysed videos (data of the BST ranking). */
export interface PlayerStats {
  player_id: string;
  first_name: string;
  last_name: string;
  shirt_number: number | null;
  position: string | null;
  status: PlayerStatus;
  matches: number;
  detections: number;
  seconds: number;
}
