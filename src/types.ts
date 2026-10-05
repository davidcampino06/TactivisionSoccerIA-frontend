export type Role = "ADMINISTRATOR" | "COACH" | "ANALYST";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  team_id: string | null;
}

export interface Team {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  invitation_code: string | null;
}

export interface Match {
  id: string;
  opponent: string;
  match_date: string;
  is_home: boolean;
  result: string | null;
  status: string;
}

export interface Video {
  id: string;
  file_name: string;
  status: string;
  file_size: number;
}

export interface VideoAnalysis {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  analysis_mode: string;
  model_name: string | null;
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
  title: string;
  description: string;
  evidence: string;
  confidence: number;
  severity: string;
  status: string;
}

export interface AnalysisResult {
  analysis: VideoAnalysis;
  label: string;
  summary: Record<string, number | boolean>;
  indicators: Indicator[];
  recommendations: Recommendation[];
}
