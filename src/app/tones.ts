import type { Tone } from "../components/ui";

// Colour of each status pill (semantic: success / warning / danger...).
export const RESULT_TONE: Record<string, Tone> = { WIN: "success", DRAW: "warning", LOSS: "danger" };

export const ANALYSIS_TONE: Record<string, Tone> = {
  PENDING: "info", PROCESSING: "live", COMPLETED: "success", FAILED: "danger", CANCELLED: "neutral",
};

export const VIDEO_TONE: Record<string, Tone> = { UPLOADED: "neutral", ANALYZING: "live", ANALYZED: "success" };

export const SEVERITY_TONE: Record<string, Tone> = { HIGH: "danger", MEDIUM: "warning", LOW: "info" };

export const RECOMMENDATION_TONE: Record<string, Tone> = {
  GENERATED: "neutral", REVIEWED: "info", CONFIRMED: "success", DISMISSED: "neutral",
};

export const EVENT_TONE: Record<string, Tone> = {
  ANALYSIS_COMPLETED: "success", ANALYSIS_FAILED: "danger", TACTICAL_ALERT: "warning", ANALYSIS_STARTED: "live",
  ANALYSIS_CANCELLED: "neutral", ANALYST_JOINED: "info",
};

export const PLAYER_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success", INJURED: "danger", SUSPENDED: "warning", INACTIVE: "neutral",
};
