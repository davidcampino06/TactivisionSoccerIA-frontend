// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./AuthPage";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => null })));
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom lacks these browser APIs the slideshow uses.
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const videoHero = () => document.querySelector(".vhero");
const slideshow = () => document.querySelector("section.hero");

describe("AuthPage", () => {
  it("opens on the landing with the video, not on the slideshow", () => {
    render(<AuthPage onAuthenticated={() => {}} />);
    expect(videoHero()).toBeTruthy();
    expect(slideshow()).toBeNull();
    expect(document.getElementById("como-funciona")).toBeTruthy();
  });

  it.each([["Empezar ahora"], ["Iniciar sesión"], ["Crear cuenta"]])(
    "\"%s\" shows the moving photos behind the drawer", (name) => {
      render(<AuthPage onAuthenticated={() => {}} />);
      fireEvent.click(screen.getAllByRole("button", { name: new RegExp(name, "i") })[0]);
      expect(slideshow()).toBeTruthy();
      expect(videoHero()).toBeNull();
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

  it("the logo goes back to the landing", () => {
    render(<AuthPage onAuthenticated={() => {}} />);
    fireEvent.click(screen.getAllByRole("button", { name: /iniciar sesión/i })[0]);
    fireEvent.click(screen.getByRole("link", { name: "Volver al inicio" }));
    expect(videoHero()).toBeTruthy();
    expect(slideshow()).toBeNull();
  });

  it("an expired session opens the login over the slideshow directly", () => {
    render(<AuthPage onAuthenticated={() => {}} sessionNotice="Tu sesión expiró" />);
    expect(slideshow()).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
