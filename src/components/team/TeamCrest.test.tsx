// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "../../api/client";
import TeamCrest from "./TeamCrest";

beforeEach(() => {
  tokenStore.set("token-123");
  URL.createObjectURL = vi.fn(() => "blob:crest");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  tokenStore.clear();
});

describe("TeamCrest", () => {
  it("shows the initials when the team has no crest, without asking the server", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { container } = render(<TeamCrest team={{ id: "t1", name: "Atlético Demo", crest_updated_at: null }} />);
    expect(container.textContent).toBe("AD");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads the crest with the session (an <img> alone could not send it) and shows it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["png"]) } as Response);
    const { container } = render(<TeamCrest team={{ id: "t2", name: "Atlético Demo", crest_updated_at: "2026-10-21T10:00:00" }} />);
    await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("blob:crest"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/teams/t2/crest");
    const headers = (init ?? {}).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-123");
  });
});
