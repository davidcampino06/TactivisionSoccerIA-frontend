import { useEffect, useState, type RefObject } from "react";
import { es } from "../../i18n/es";
import {
  evaluatePassword, isPasswordValid, passwordStrength, type PasswordEvaluation, type PasswordRuleId, type PersonalData,
} from "../../security/passwordRules";
import PasswordInput from "../PasswordInput";

const RULE_IDS = Object.keys(es.passwordRules) as PasswordRuleId[];

type Props = {
  /** Name and e-mail the password must not contain. */
  personal: PersonalData;
  passwordRef: RefObject<HTMLInputElement | null>;
  confirmRef: RefObject<HTMLInputElement | null>;
  /** True when the password passes every rule and the confirmation matches. */
  onValidityChange: (valid: boolean) => void;
  label?: string;
  idPrefix?: string;
};

/**
 * New password + live rule checklist + strength bar + confirmation. Used by register, change and
 * reset password. Only booleans derived from the password live in state, never the password itself;
 * to clear the fields, remount the component with a new `key`.
 */
export default function NewPasswordFields({ personal, passwordRef, confirmRef, onValidityChange, label = es.auth.password, idPrefix = "new" }: Props) {
  const [evaluation, setEvaluation] = useState<PasswordEvaluation>(() => evaluatePassword("", personal));
  const [length, setLength] = useState(0);
  const [confirmState, setConfirmState] = useState<"empty" | "match" | "mismatch">("empty");
  const { email, firstName, lastName } = personal;

  const refresh = () => {
    const password = passwordRef.current?.value ?? "";
    const confirm = confirmRef.current?.value ?? "";
    const next = evaluatePassword(password, { email, firstName, lastName });
    const nextConfirm = confirm ? (confirm === password ? "match" : "mismatch") : "empty";
    setEvaluation(next);
    setLength(password.length);
    setConfirmState(nextConfirm);
    onValidityChange(isPasswordValid(next) && nextConfirm === "match");
  };

  // The "no personal data" rule depends on the name and e-mail typed in other fields.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [email, firstName, lastName]);

  const passwordOk = isPasswordValid(evaluation);
  const strength = passwordStrength(evaluation, length);
  const rulesId = `${idPrefix}-password-rules`;

  return (
    <>
      <PasswordInput label={label} name={`${idPrefix}-password`} autoComplete="new-password" inputRef={passwordRef}
        onValueChange={refresh} invalid={length > 0 && !passwordOk} describedBy={rulesId} />

      <div className="strength" data-level={strength} aria-hidden={length === 0}>
        <div className="strength-bar"><span /><span /><span /><span /></div>
        <small>{length ? es.auth.strength[strength] : " "}</small>
      </div>

      <ul className="rules" id={rulesId}>
        {RULE_IDS.map((rule) => (
          <li key={rule} className={evaluation[rule] ? "ok" : undefined}>
            <span aria-hidden="true">{evaluation[rule] ? "✓" : "•"}</span>
            {es.passwordRules[rule]}
          </li>
        ))}
      </ul>

      <PasswordInput label={es.auth.confirmPassword} name={`${idPrefix}-confirm-password`} autoComplete="new-password"
        inputRef={confirmRef} onValueChange={refresh} invalid={confirmState === "mismatch"} />
      {confirmState === "mismatch" && <p className="auth-hint-error">{es.auth.passwordsDontMatch}</p>}
    </>
  );
}
