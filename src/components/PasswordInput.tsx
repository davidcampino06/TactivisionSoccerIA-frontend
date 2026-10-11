import { useId, useState, type Ref } from "react";
import { es } from "../i18n/es";
import { PASSWORD_MAX_LENGTH } from "../security/passwordRules";

type Props = {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  inputRef: Ref<HTMLInputElement>;
  onValueChange?: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Uncontrolled on purpose: the password is never stored in React state, so it is never
 * written to the DOM `value` attribute (not visible with "Inspect element").
 */
export default function PasswordInput({ label, name, autoComplete, inputRef, onValueChange, invalid, describedBy }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          ref={inputRef}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          maxLength={PASSWORD_MAX_LENGTH}
          spellCheck={false}
          autoCapitalize="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onInput={(event) => onValueChange?.(event.currentTarget.value)}
          required
        />
        <button
          type="button"
          className="eye-button"
          aria-label={visible ? es.auth.hidePassword : es.auth.showPassword}
          aria-pressed={visible}
          title={visible ? es.auth.hidePassword : es.auth.showPassword}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}
