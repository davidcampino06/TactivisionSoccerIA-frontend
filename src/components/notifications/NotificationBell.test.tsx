// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import NotificationBell from "./NotificationBell";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
const apiMock = vi.mocked(api);

const items = [
  { id: "n1", team_id: "t", event: "ANALYSIS_COMPLETED", analysis_id: "a1", match_id: "m1", message: "Terminó el análisis", created_at: "2026-10-19T15:00:00", read: false },
  { id: "n2", team_id: "t", event: "TACTICAL_ALERT", analysis_id: "a1", match_id: "m1", message: "Alerta grave", created_at: "2026-10-19T14:00:00", read: true },
];

beforeEach(() => {
  apiMock.mockImplementation(async (path: string) => {
    if (path === "/api/notifications/unread-count") return { unread: 1 };
    if (path.startsWith("/api/notifications?")) return items;
    return undefined;
  });
});
afterEach(() => { cleanup(); apiMock.mockReset(); });

async function openBell() {
  render(<MemoryRouter><NotificationBell /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Notificaciones/ }));
  await screen.findByText("Terminó el análisis");
}

describe("NotificationBell delete", () => {
  it("deletes one notification from my bell", async () => {
    await openBell();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar notificación: Análisis completado" }));
    expect(screen.queryByText("Terminó el análisis")).toBeNull();
    expect(screen.getByText("Alerta grave")).toBeTruthy();
    expect(apiMock).toHaveBeenCalledWith("/api/notifications/n1", { method: "DELETE" });
    // It was unread: the badge goes down right away.
    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeTruthy();
  });

  it("asks before deleting all, and only then calls the API", async () => {
    await openBell();
    expect(screen.getByText(/el resto del equipo las sigue viendo/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar todas" }));
    expect(apiMock).not.toHaveBeenCalledWith("/api/notifications", { method: "DELETE" });
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar todas" }));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/api/notifications", { method: "DELETE" }));
    expect(screen.queryByText("Alerta grave")).toBeNull();
  });
});
