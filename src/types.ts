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
}

export interface Notification {
  event: string;
  team_id: string;
  analysis_id: string;
  message: string;
  created_at: string;
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
