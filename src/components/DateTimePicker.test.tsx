// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DateTimePicker from "./DateTimePicker";
import { formatValue, parseValue } from "./dateTimeValue";

afterEach(cleanup);

describe("DateTimePicker", () => {
  it("reads and writes the datetime-local format", () => {
    expect(parseValue("2026-10-25T15:00")).toEqual({ year: 2026, month: 9, day: 25, hour: 15, minute: 0 });
    expect(formatValue({ year: 2026, month: 10, day: 4, hour: 12, minute: 45 })).toBe("2026-11-04T12:45");
  });

  it("only changes the date and time when Confirmar is pressed", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-10-25T15:00" onChange={onChange} />);
    const trigger = screen.getByRole("button", { expanded: false });
    expect(trigger.textContent).toContain("25 de octubre de 2026 · 15:00");

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Elegir fecha y hora" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: /, 4 de noviembre/ }));
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Minutos"), { target: { value: "45" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-04T12:45");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Cancelar and Escape keep the previous value", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-10-25T15:00" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: /, 26 de octubre/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a kickoff minute that is not a multiple of five", () => {
    render(<DateTimePicker value="2026-11-04T12:47" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect((screen.getByLabelText("Minutos") as HTMLSelectElement).value).toBe("47");
  });
});
