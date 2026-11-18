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
    expect(document.getElementById("filosofia")).toBeTruthy();
  });

  it("shows the work team, as students, under the philosophy", () => {
    render(<AuthPage onAuthenticated={() => {}} />);
    expect(document.getElementById("como-funciona")).toBeNull();
    const team = document.getElementById("equipo")!;
    expect(team.closest("#filosofia")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Equipo de trabajo" })).toBeTruthy();
    for (const name of ["David Esteban Campiño", "Juan Manuel Gallardo", "Jaider Julián Chindoy"]) {
      expect(screen.getByRole("img", { name })).toBeTruthy();
    }
    expect(screen.getAllByText("Estudiante")).toHaveLength(3);
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

  it("the login screen's top bar only offers the way back, its buttons are in the middle", () => {
    render(<AuthPage onAuthenticated={() => {}} />);
    fireEvent.click(screen.getAllByRole("button", { name: /crear cuenta/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    const topbar = document.querySelector(".topbar-landing") as HTMLElement;
    expect([...topbar.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Volver al inicio"]);
    fireEvent.click(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(videoHero()).toBeTruthy();
  });

  it("an expired session opens the login over the slideshow directly", () => {
    render(<AuthPage onAuthenticated={() => {}} sessionNotice="Tu sesión expiró" />);
    expect(slideshow()).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
