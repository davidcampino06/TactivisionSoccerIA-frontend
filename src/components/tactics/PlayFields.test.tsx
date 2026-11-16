// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "../../api/client";
import { ActionTypeField, CountedField } from "./PlayFields";

const reply = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

beforeEach(() => tokenStore.set("token-123"));
afterEach(() => { cleanup(); vi.restoreAllMocks(); tokenStore.clear(); });

function Name() {
  const [value, setValue] = useState("");
  return <CountedField text="Nombre de la jugada" value={value} max={50} onChange={setValue} />;
}

describe("CountedField", () => {
  it("counts down the characters left: 50, 49, 48...", () => {
    render(<Name />);
    const input = screen.getByLabelText(/Nombre de la jugada/) as HTMLInputElement;
    expect(screen.getByRole("status").textContent).toBe("50");
    fireEvent.change(input, { target: { value: "a" } });
    expect(screen.getByRole("status").textContent).toBe("49");
    fireEvent.change(input, { target: { value: "ab" } });
    expect(screen.getByRole("status").textContent).toBe("48");
    expect(screen.getByText("Quedan 48 caracteres de 50")).toBeTruthy();
  });

  it("never lets the text go past the limit, even when pasted", () => {
    render(<Name />);
    const input = screen.getByLabelText(/Nombre de la jugada/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "x".repeat(80) } });
    expect(input.value.length).toBe(50);
    expect(input.maxLength).toBe(50);
    expect(screen.getByRole("status").textContent).toBe("0");
  });
});

function Picker({ start = "" }: { start?: string }) {
  const [value, setValue] = useState(start);
  return <><ActionTypeField teamId="t1" value={value} onChange={setValue} /><p data-testid="value">{value}</p></>;
}

describe("ActionTypeField", () => {
  it("offers the fixed types and the ones the team wrote before", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, [{ id: "1", name: "Córner corto" }]));
    render(<Picker />);
    expect(await screen.findByRole("option", { name: "Córner corto" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Presión" })).toBeTruthy();
  });

  it("lets the coach write a new type, saves it for the team and selects it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => (
      init?.method === "POST" ? reply(201, { id: "9", name: "Saque de banda largo" }) : reply(200, [])));
    render(<Picker />);
    fireEvent.change(screen.getByLabelText("Tipo de acción"), { target: { value: "__write__" } });
    fireEvent.change(screen.getByLabelText(/Nuevo tipo de acción/), { target: { value: "  Saque de   banda largo " } });
    expect(screen.getByRole("status").textContent).toBe(String(40 - "  Saque de   banda largo ".length));
    fireEvent.click(screen.getByRole("button", { name: "Guardar tipo" }));
    await waitFor(() => expect(screen.getByTestId("value").textContent).toBe("Saque de banda largo"));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(String(post[0])).toContain("/api/teams/t1/action-types");
    expect(JSON.parse(String(post[1]!.body))).toEqual({ name: "Saque de banda largo" });
    expect((screen.getByLabelText("Tipo de acción") as HTMLSelectElement).value).toBe("Saque de banda largo");
  });

  it("does not save a type of one letter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, []));
    render(<Picker />);
    fireEvent.change(screen.getByLabelText("Tipo de acción"), { target: { value: "__write__" } });
    fireEvent.change(screen.getByLabelText(/Nuevo tipo de acción/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar tipo" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("keeps showing the type of a play even if it was removed from the list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, []));
    render(<Picker start="Tiro libre" />);
    await waitFor(() => expect((screen.getByLabelText("Tipo de acción") as HTMLSelectElement).value).toBe("Tiro libre"));
  });
});
