import { describe, expect, it } from "vitest";
import { availabilitySummary, isUnavailable, parseDay, returnText, todayIso } from "./availability";

const NOW = new Date(2026, 9, 21, 22, 30); // 21 Oct 2026, late evening (already the 22nd in UTC)

describe("player availability", () => {
  it("injured, suspended and unavailable players cannot play; active and withdrawn are not 'absent'", () => {
    expect(["INJURED", "SUSPENDED", "UNAVAILABLE"].map((status) => isUnavailable({ status } as never))).toEqual([true, true, true]);
    expect(isUnavailable({ status: "ACTIVE" })).toBe(false);
    expect(isUnavailable({ status: "INACTIVE" })).toBe(false);
  });

  it("reads a return date as a local calendar day, never shifted by the time zone", () => {
    expect(parseDay("2026-11-01").getDate()).toBe(1);
    expect(todayIso(NOW)).toBe("2026-10-21");
  });

  it("says when he is expected back: a future day, today, or a day that already passed", () => {
    expect(returnText("2026-11-01", NOW)).toMatch(/^Regreso estimado: 1 de nov/);
    expect(returnText("2026-10-21", NOW)).toBe("Regreso estimado: hoy");
    expect(returnText("2026-10-19", NOW)).toMatch(/^Regreso estimado: 19 de oct.*\(ya pasó, revisa su estado\)$/);
    expect(returnText(null, NOW)).toBeNull();
  });

  it("summarises the absence in one line for the tactical editor", () => {
    expect(availabilitySummary({ status: "INJURED", availability_note: "Esguince de tobillo", expected_return: "2026-10-21" }, NOW))
      .toBe("lesionado (Esguince de tobillo), regreso estimado: hoy");
    expect(availabilitySummary({ status: "UNAVAILABLE", availability_note: null, expected_return: null }, NOW))
      .toBe("no disponible");
  });
});
