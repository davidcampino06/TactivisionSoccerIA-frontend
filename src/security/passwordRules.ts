import { es } from "../i18n/es";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export type PasswordRuleId = keyof typeof es.passwordRules;

export interface PersonalData {
  email: string;
  firstName: string;
  lastName: string;
}

type RuleCheck = (password: string, personal: PersonalData) => boolean;

const containsPersonalData = (password: string, personal: PersonalData): boolean => {
  const lowered = password.toLowerCase();
  const fragments = [personal.firstName, personal.lastName, personal.email.split("@")[0]]
    .map((fragment) => fragment.trim().toLowerCase())
    .filter((fragment) => fragment.length >= 3);
  return fragments.some((fragment) => lowered.includes(fragment));
};

// Same short list as the backend (password_policy.py), compared in lower case.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "contraseña", "contrasena", "12345678", "123456789",
  "1234567890", "qwerty123", "qwertyuiop", "11111111", "abc12345", "iloveyou", "admin123",
  "futbol123", "football", "soccer123", "colombia1", "bienvenido", "welcome1",
]);

// Same rules are enforced again by the backend; the frontend only gives instant feedback.
const RULES: Record<PasswordRuleId, RuleCheck> = {
  length: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  upper: (p) => /\p{Lu}/u.test(p),
  lower: (p) => /\p{Ll}/u.test(p),
  digit: (p) => /\d/.test(p),
  special: (p) => /[^\p{L}\d\s]/u.test(p),
  noSpaces: (p) => p.length > 0 && !/\s/.test(p),
  noPersonalData: (p, personal) => p.length > 0 && !containsPersonalData(p, personal),
  notCommon: (p) => p.length > 0 && !COMMON_PASSWORDS.has(p.toLowerCase()),
};

export type PasswordEvaluation = Record<PasswordRuleId, boolean>;

export function evaluatePassword(password: string, personal: PersonalData): PasswordEvaluation {
  return Object.fromEntries(
    (Object.keys(RULES) as PasswordRuleId[]).map((id) => [id, RULES[id](password, personal)]),
  ) as PasswordEvaluation;
}

export const isPasswordValid = (evaluation: PasswordEvaluation): boolean =>
  Object.values(evaluation).every(Boolean);

/** 0..4, used only for the strength bar. */
export function passwordStrength(evaluation: PasswordEvaluation, length: number): number {
  if (length === 0) return 0;
  const passed = Object.values(evaluation).filter(Boolean).length;
  const ratio = passed / Object.keys(evaluation).length;
  const bonus = length >= 14 ? 1 : 0;
  return Math.min(4, Math.round(ratio * 3) + bonus);
}
