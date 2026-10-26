// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { ReviewNote } from "../../types";
import ReviewNotes from "./ReviewNotes";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
const team = { user: { id: "analyst" }, isCoach: false };
vi.mock("../../app/teamState", () => ({ useTeam: () => team }));
const apiMock = vi.mocked(api);

const note = (id: string, author: string, role: "COACH" | "ANALYST", text: string): ReviewNote => ({
  id, recommendation_id: "r1", author_id: author, author_name: author === "coach" ? "Ana Coach" : "Luis Analista",
  author_role: role, text, created_at: "2026-10-20T10:00:00", updated_at: "2026-10-20T10:00:00",
});

afterEach(() => { cleanup(); apiMock.mockReset(); team.isCoach = false; });

describe("ReviewNotes", () => {
  it("shows each note signed with its author and role", () => {
    render(<ReviewNotes recommendationId="r1" notes={[note("n1", "coach", "COACH", "Lo trabajamos el martes.")]} onChange={() => {}} />);
    expect(screen.getByText("Ana Coach")).toBeTruthy();
    expect(screen.getByText("entrenador")).toBeTruthy();
    expect(screen.getByText("Lo trabajamos el martes.")).toBeTruthy();
  });

  it("adds a note and clears the field; blank text cannot be sent", async () => {
    const created = note("n2", "analyst", "ANALYST", "El 5 sube y nadie cubre.");
    apiMock.mockResolvedValue(created);
    const onChange = vi.fn();
    render(<ReviewNotes recommendationId="r1" notes={[]} onChange={onChange} />);
    const button = screen.getByRole("button", { name: "Agregar nota" }) as HTMLButtonElement;
    const field = screen.getByLabelText("Agregar nota") as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "   " } });
    expect(button.disabled).toBe(true);
    fireEvent.change(field, { target: { value: "El 5 sube y nadie cubre." } });
    fireEvent.click(button);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([created]));
    expect(apiMock).toHaveBeenCalledWith("/api/recommendations/r1/notes",
      { method: "POST", body: JSON.stringify({ text: "El 5 sube y nadie cubre." }) });
    expect(field.value).toBe("");
  });

  it("lets only the author or the coach delete a note", async () => {
    const notes = [note("n1", "coach", "COACH", "Del entrenador"), note("n2", "analyst", "ANALYST", "Mía")];
    render(<ReviewNotes recommendationId="r1" notes={notes} onChange={() => {}} />);
    expect(screen.getAllByRole("button", { name: "Borrar nota" })).toHaveLength(1);
    cleanup();
    team.isCoach = true;
    const onChange = vi.fn();
    apiMock.mockResolvedValue(undefined);
    render(<ReviewNotes recommendationId="r1" notes={notes} onChange={onChange} />);
    const [first] = screen.getAllByRole("button", { name: "Borrar nota" });
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([notes[1]]));
    expect(apiMock).toHaveBeenCalledWith("/api/recommendation-notes/n1", { method: "DELETE" });
  });
});
