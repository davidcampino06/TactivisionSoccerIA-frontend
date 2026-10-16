// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, tokenStore } from "../../api/client";
import { es } from "../../i18n/es";
import { toUserMessage } from "../../i18n/errors";
import { LoginForm } from "./AuthForms";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
// The RSA module has its own tests; here it only marks the password as encrypted.
vi.mock("../../security/crypto", () => ({
  withEncryptedPasswords: <T,>(passwords: string[], request: (encrypted: string[]) => Promise<T>) =>
    request(passwords.map((password) => `rsa:${btoa(encodeURIComponent(password))}`)),
}));

const apiMock = vi.mocked(api);
const user = { id: "u1", email: "mateo@club.com", first_name: "Mateo", last_name: "Ríos", role: "COACH" };

function renderLogin() {
  const onAuthenticated = vi.fn();
  render(<LoginForm notice="" onAuthenticated={onAuthenticated} onForgotPassword={vi.fn()} />);
  const email = screen.getByLabelText(es.auth.email) as HTMLInputElement;
  const password = screen.getByLabelText(es.auth.password) as HTMLInputElement;
  fireEvent.change(email, { target: { value: "  mateo@club.com " } });
  fireEvent.input(password, { target: { value: "Pizarra#2026" } });
  return { email, password, onAuthenticated, submit: () => fireEvent.click(screen.getByRole("button", { name: es.auth.loginButton })) };
}

beforeEach(() => {
  apiMock.mockReset();
  localStorage.clear();
});
afterEach(cleanup);

describe("login form", () => {
  it("never writes the password into the page (no value attribute to inspect)", () => {
    const { password } = renderLogin();
    expect(password.value).toBe("Pizarra#2026");
    expect(password.getAttribute("value")).toBeNull();
    expect(password).toHaveProperty("autocomplete", "current-password");
  });

  it("the eye button shows and hides the password", () => {
    const { password } = renderLogin();
    expect(password.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: es.auth.showPassword }));
    expect(password.type).toBe("text");
    const hide = screen.getByRole("button", { name: es.auth.hidePassword });
    expect(hide.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(hide);
    expect(password.type).toBe("password");
  });

  it("sends the e-mail trimmed and the password only encrypted", async () => {
    apiMock.mockResolvedValue({ access_token: "jwt-token", user });
    const { onAuthenticated, submit } = renderLogin();
    submit();
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(user));
    const [path, options] = apiMock.mock.calls[0];
    const body = JSON.parse(String(options?.body));
    expect(path).toBe("/api/auth/login");
    expect(body.email).toBe("mateo@club.com");
    expect(body.password).toMatch(/^rsa:/);
    expect(String(options?.body)).not.toContain("Pizarra");
  });

  it("after a successful login it saves the session and clears both fields", async () => {
    apiMock.mockResolvedValue({ access_token: "jwt-token", user });
    const { email, password, onAuthenticated, submit } = renderLogin();
    submit();
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
    expect(tokenStore.get()).toBe("jwt-token");
    expect(email.value).toBe("");
    expect(password.value).toBe("");
  });

  it("a failed login clears only the password and shows the reason in Spanish", async () => {
    const error = new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    apiMock.mockRejectedValue(error);
    const { email, password, onAuthenticated, submit } = renderLogin();
    submit();
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", toUserMessage(error));
    expect(password.value).toBe("");
    expect(email.value).toBe("mateo@club.com"); // kept (the browser trims e-mail fields)
    expect(document.activeElement).toBe(password);
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBeNull();
  });
});
