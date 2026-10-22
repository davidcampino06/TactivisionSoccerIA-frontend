import { ApiError } from "../api/client";
import { es } from "./es";

type RuleKey = keyof typeof es.passwordRules;

// Backend rule codes (password_policy.py) -> Spanish rule labels.
const RULE_CODES: Record<string, RuleKey> = {
  length: "length",
  upper: "upper",
  lower: "lower",
  digit: "digit",
  special: "special",
  no_spaces: "noSpaces",
  no_personal_data: "noPersonalData",
  not_common: "notCommon",
};

const SIMPLE_CODES: Record<string, string> = {
  EMAIL_TAKEN: es.errors.emailTaken,
  ACCOUNT_DISABLED: es.errors.accountDisabled,
  PASSWORD_NOT_ENCRYPTED: es.errors.passwordNotEncrypted,
  PASSWORD_DECRYPTION_FAILED: es.errors.passwordDecryption,
  CURRENT_PASSWORD_INCORRECT: es.errors.currentPasswordIncorrect,
  PASSWORD_REUSED: es.errors.passwordReused,
  INVALID_RESET_TOKEN: es.errors.invalidResetToken,
  NOT_FOUND: es.errors.notFound,
  ROLE_NOT_ALLOWED: es.errors.roleNotAllowed,
  ADMIN_NO_TACTICAL_ACCESS: es.errors.adminNoTacticalAccess,
  NOT_AUTHENTICATED: es.errors.sessionExpired,
  SESSION_EXPIRED: es.errors.sessionExpired,
  SIMULATION_DISABLED: es.errors.simulationDisabled,
  VIDEO_FILE_MISSING: es.errors.videoFileMissing,
  ANALYSIS_IN_PROGRESS: es.errors.analysisInProgress,
  PLAYER_REMOVE_REQUIRES_REASON: es.errors.removeRequiresReason,
  COACH_HAS_TEAM: es.errors.coachHasTeam,
  ALREADY_IN_TEAM: es.errors.alreadyInTeam,
  INVALID_INVITATION_CODE: es.errors.invalidInvitationCode,
  NO_TEAM: es.errors.noTeam,
  CREST_FORMAT: es.pages.team.identity.badFormat,
  CREST_TOO_LARGE: es.pages.team.identity.tooLarge,
  CREST_EMPTY: es.pages.team.identity.badFormat,
  INVITATION_CODE_FAILED: es.errors.invitationCodeFailed,
  ADMIN_MANAGED_BY_CONFIG: es.errors.adminManagedByConfig,
  ROLE_CHANGE_TEAM_LINKED: es.errors.roleChangeTeamLinked,
  INVALID_ANALYSIS_STATE: es.errors.invalidAnalysisState,
  INVALID_RECOMMENDATION_STATE: es.errors.invalidRecommendationState,
  INVALID_VIDEO_FORMAT: es.errors.invalidVideoFormat,
  EMPTY_FILE: es.errors.emptyFile,
  FORMATION_EXISTS: es.errors.formationExists,
  NO_CURRENT_VERSION: es.errors.noCurrentVersion,
  NO_PREVIOUS_VERSION: es.errors.noPreviousVersion,
  COMPARE_MIN_MATCHES: es.errors.compareMinMatches,
  EVOLUTION_MIN_MATCHES: es.errors.evolutionMinMatches,
  REPORT_HEADER_REQUIRED: es.errors.reportHeaderRequired,
  ANALYSIS_NOT_COMPLETED: es.errors.analysisNotCompleted,
  UNSUPPORTED_EXPORT_FORMAT: es.errors.unsupportedExportFormat,
  MATCH_REQUIRED: es.errors.matchRequired,
  ANALYSIS_REQUIRED: es.errors.analysisRequired,
};

const numberOrNull = (value: unknown) => (typeof value === "number" ? value : null);

/** Turns any error into a Spanish message for the user. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && SIMPLE_CODES[error.code]) return SIMPLE_CODES[error.code];

    if (error.code === "SHIRT_NUMBER_TAKEN") return es.errors.shirtTaken(numberOrNull(error.data.shirt_number));
    if (error.code === "VIDEO_TOO_LARGE") return es.errors.videoTooLarge(numberOrNull(error.data.max_mb));

    if (error.code === "INVALID_CREDENTIALS") {
      const remaining = Number(error.data.remaining_attempts);
      return remaining > 0 && remaining <= 2
        ? `${es.errors.invalidCredentials} ${es.errors.remainingAttempts(remaining)}`
        : es.errors.invalidCredentials;
    }

    if (error.code === "ACCOUNT_LOCKED") {
      const seconds = Number(error.data.retry_after_seconds) || 60;
      return es.errors.accountLocked(Math.max(1, Math.ceil(seconds / 60)));
    }

    if (error.code === "PASSWORD_POLICY" && Array.isArray(error.data.failed_rules)) {
      const rules = error.data.failed_rules
        .map((code) => RULE_CODES[String(code)])
        .filter(Boolean)
        .map((key) => es.passwordRules[key].toLowerCase());
      return `${es.errors.passwordPolicy} ${rules.join(", ")}.`;
    }

    if (error.status === 422) return es.errors.validation;
    return es.errors.unexpected;
  }
  if (error instanceof TypeError) return es.errors.network; // fetch failed: server unreachable
  return es.errors.unexpected;
}
