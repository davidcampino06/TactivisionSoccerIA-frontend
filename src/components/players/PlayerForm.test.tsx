// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Player } from "../../types";
import PlayerForm from "./PlayerForm";

const PLAYER: Player = {
  id: "p12", team_id: "t1", first_name: "Martín", last_name: "Agudelo", shirt_number: 12, position: "GOALKEEPER",
  preferred_foot: "RIGHT", status: "INJURED", availability_note: "Esguince de tobillo", expected_return: "2026-11-01",
  created_at: "2026-09-02T10:00:00",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function sentBody(fetchMock: ReturnType<typeof vi.spyOn>) {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body));
}

function mockSave() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => PLAYER } as Response);
}

describe("PlayerForm availability", () => {
  it("an injured player shows his reason and return date, and saves them", async () => {
    const fetchMock = mockSave();
    const onSaved = vi.fn();
    render(<PlayerForm teamId="t1" player={PLAYER} onSaved={onSaved} onCancel={() => {}} />);
    const note = screen.getByLabelText("Motivo") as HTMLInputElement;
    expect(note.value).toBe("Esguince de tobillo");
    expect((screen.getByLabelText(/^Regreso estimado/) as HTMLInputElement).value).toBe("2026-11-01");

    fireEvent.change(note, { target: { value: "  Esguince grado 2  " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar jugador" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(sentBody(fetchMock)).toMatchObject({
      status: "INJURED", availability_note: "Esguince grado 2", expected_return: "2026-11-01" });
  });

  it("personal reasons have their own status with a matching example", () => {
    render(<PlayerForm teamId="t1" player={PLAYER} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/^Estado/), { target: { value: "UNAVAILABLE" } });
    expect((screen.getByLabelText("Motivo") as HTMLInputElement).placeholder).toMatch(/viaje familiar/);
  });

  it("back to available hides the fields and clears them", async () => {
    const fetchMock = mockSave();
    const onSaved = vi.fn();
    render(<PlayerForm teamId="t1" player={PLAYER} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/^Estado/), { target: { value: "ACTIVE" } });
    expect(screen.queryByLabelText("Motivo")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Guardar jugador" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(sentBody(fetchMock)).toMatchObject({ status: "ACTIVE", availability_note: null, expected_return: null });
  });

  it("a new player has no status or absence fields yet", () => {
    render(<PlayerForm teamId="t1" onSaved={() => {}} onCancel={() => {}} />);
    expect(screen.queryByLabelText(/^Estado/)).toBeNull();
    expect(screen.queryByLabelText("Motivo")).toBeNull();
  });
});
