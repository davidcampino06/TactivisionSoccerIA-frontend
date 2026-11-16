// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "../../api/client";
import FormationPicker from "./FormationPicker";
import { formationProblem } from "./formations";
import { formationTokens } from "./board";

const reply = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

beforeEach(() => tokenStore.set("token-123"));
afterEach(() => { cleanup(); vi.restoreAllMocks(); tokenStore.clear(); });

function Picker() {
  const [value, setValue] = useState("4-3-3");
  return <><FormationPicker label="Formación" value={value} onChange={setValue} /><p data-testid="value">{value}</p></>;
}

describe("formationProblem", () => {
  it("accepts 2 to 5 lines of 1 to 6 players that add up to 10", () => {
    expect(formationProblem("3-4-2-1")).toBeNull();
    expect(formationProblem("4-1-2-1-2")).toBeNull();
    expect(formationProblem("4-4-3")).toMatch(/suman 11/);
    expect(formationProblem("4 3 3")).toMatch(/guiones/);
    expect(formationProblem("1-1-1-1-1-5")).toMatch(/5 líneas/);
    expect(formationProblem("7-2-1")).toMatch(/1 a 6/);
  });

  it("places the goalkeeper and the ten outfield players of a custom system", () => {
    expect(formationTokens("3-4-2-1", "own")).toHaveLength(11);
  });
});

describe("FormationPicker", () => {
  it("offers the formations saved in the catalogue next to the fixed ones", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, [{ name: "3-4-2-1" }, { name: "Rombo" }]));
    render(<Picker />);
    expect(await screen.findByRole("option", { name: "3-4-2-1" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Rombo" })).toBeNull();   // not a system it can draw
  });

  it("lets the coach type his own formation, saves it and selects it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => (
      init?.method === "POST" ? reply(201, { id: "f1", name: "4-1-2-1-2" }) : reply(200, [])));
    render(<Picker />);
    fireEvent.change(screen.getByLabelText("Formación"), { target: { value: "__custom__" } });
    fireEvent.change(screen.getByLabelText(/Tu formación/), { target: { value: "4 - 1 - 2 - 1 - 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Usar formación" }));
    await waitFor(() => expect(screen.getByTestId("value").textContent).toBe("4-1-2-1-2"));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(post[1]!.body)).name).toBe("4-1-2-1-2");
  });

  it("explains what is wrong instead of saving an impossible formation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, []));
    render(<Picker />);
    fireEvent.change(screen.getByLabelText("Formación"), { target: { value: "__custom__" } });
    fireEvent.change(screen.getByLabelText(/Tu formación/), { target: { value: "4-4-3" } });
    fireEvent.click(screen.getByRole("button", { name: "Usar formación" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/suman 11/);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("uses a formation that already exists in the catalogue", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => (
      init?.method === "POST" ? reply(409, { code: "FORMATION_EXISTS", detail: "exists" }) : reply(200, [])));
    render(<Picker />);
    fireEvent.change(screen.getByLabelText("Formación"), { target: { value: "__custom__" } });
    fireEvent.change(screen.getByLabelText(/Tu formación/), { target: { value: "3-5-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Usar formación" }));
    await waitFor(() => expect(screen.getByTestId("value").textContent).toBe("3-5-2"));
  });
});
