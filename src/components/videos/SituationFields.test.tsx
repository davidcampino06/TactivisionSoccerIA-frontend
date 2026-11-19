// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import SituationFields from "./SituationFields";
import { emptySituation, situationLabel, situationPayload, situationReady, type SituationValue } from "./situation";

afterEach(cleanup);

function Harness({ onValue }: { onValue: (value: SituationValue) => void }) {
  const [value, setValue] = useState(emptySituation);
  return <SituationFields value={value} onChange={(next) => { setValue(next); onValue(next); }} />;
}

describe("SituationFields", () => {
  it("asks for the name only when the situation is Otra, up to 30 characters", () => {
    let value = emptySituation();
    render(<Harness onValue={(next) => { value = next; }} />);
    expect(screen.queryByLabelText(/¿Qué situación es\?/)).toBeNull();

    fireEvent.change(screen.getByLabelText("Situación del clip"), { target: { value: "OTHER" } });
    const name = screen.getByLabelText(/¿Qué situación es\?/) as HTMLInputElement;
    expect(name.maxLength).toBe(30);
    expect(situationReady(value)).toBe(false);

    fireEvent.change(name, { target: { value: "  Salida   de arco corta " } });
    expect(name.closest("label")?.querySelector("[data-testid=chars-left]")?.getAttribute("data-left")).toBe("5");
    expect(situationReady(value)).toBe(true);
    expect(situationPayload(value)).toEqual({ situation: "OTHER", situation_note: null, situation_custom: "Salida de arco corta" });

    fireEvent.change(screen.getByLabelText("Situación del clip"), { target: { value: "PRESSING" } });
    expect(screen.queryByLabelText(/¿Qué situación es\?/)).toBeNull();
    expect(situationPayload(value).situation_custom).toBeNull();
  });

  it("shows the written name wherever the situation appears", () => {
    expect(situationLabel("OTHER", "Pelotazo al 9")).toBe("Pelotazo al 9");
    expect(situationLabel("OTHER:Pelotazo al 9")).toBe("Pelotazo al 9");
    expect(situationLabel("PRESSING")).toBe("Presión alta");
    expect(situationLabel(null)).toBe("Sin clasificar");
  });
});
