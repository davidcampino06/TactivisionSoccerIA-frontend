import { describe, expect, it } from "vitest";
import { evaluatePassword, isPasswordValid, PASSWORD_MAX_LENGTH, passwordStrength } from "./passwordRules";

const person = { email: "mateo.rios@club.com", firstName: "Mateo", lastName: "Ríos" };
const failed = (password: string) =>
  Object.entries(evaluatePassword(password, person)).filter(([, ok]) => !ok).map(([rule]) => rule).sort();

describe("password rules (same rules as the backend)", () => {
  it("accepts a password that meets every rule", () => {
    const evaluation = evaluatePassword("Pizarra#2026", person);
    expect(isPasswordValid(evaluation)).toBe(true);
    expect(failed("Pizarra#2026")).toEqual([]);
  });

  it("checks the length between 8 and 64 characters", () => {
    expect(failed("Ab#1xyz")).toEqual(["length"]);
    expect(failed(`Ab#1${"x".repeat(PASSWORD_MAX_LENGTH - 4)}`)).toEqual([]);
    expect(failed(`Ab#1${"x".repeat(PASSWORD_MAX_LENGTH - 3)}`)).toEqual(["length"]);
  });

  it("needs upper case, lower case, a number and a special character", () => {
    expect(failed("pizarra#2026")).toEqual(["upper"]);
    expect(failed("PIZARRA#2026")).toEqual(["lower"]);
    expect(failed("Pizarra#Dos")).toEqual(["digit"]);
    expect(failed("Pizarra2026")).toEqual(["special"]);
  });

  it("understands Spanish letters (ñ, accents) as letters, not symbols", () => {
    expect(failed("Ñandú#2026x")).toEqual([]);
    expect(failed("ñandú#2026x")).toEqual(["upper"]);
    expect(failed("Ñandu2026xx")).toEqual(["special"]);
  });

  it("rejects spaces", () => {
    expect(failed("Pizarra #2026")).toEqual(["noSpaces"]);
  });

  it("rejects the user's name or e-mail inside the password, in any case", () => {
    expect(failed("MATEO#2026x")).toEqual(["noPersonalData"]);
    expect(failed("xRíos#2026")).toEqual(["noPersonalData"]);
    expect(failed("Mateo.rios#26")).toEqual(["noPersonalData"]);
    // Fragments shorter than 3 letters are ignored, so a two-letter name never blocks everything.
    expect(failed("Pizarra#2026")).toEqual([]);
    expect(evaluatePassword("Al#2026xyzw", { email: "al@x.co", firstName: "Al", lastName: "Li" }).noPersonalData).toBe(true);
  });

  it("rejects common passwords", () => {
    expect(failed("Password123")).toEqual(["notCommon", "special"]);
    expect(evaluatePassword("FUTBOL123", person).notCommon).toBe(false);
  });

  it("an empty password passes no rule and has no strength", () => {
    const evaluation = evaluatePassword("", person);
    expect(Object.values(evaluation).some(Boolean)).toBe(false);
    expect(passwordStrength(evaluation, 0)).toBe(0);
  });

  it("strength grows with the rules met and with length (0 to 4)", () => {
    const weak = passwordStrength(evaluatePassword("abc", person), 3);
    const valid = passwordStrength(evaluatePassword("Pizarra#2026", person), 12);
    const long = passwordStrength(evaluatePassword("Pizarra#2026-Larga", person), 18);
    expect(weak).toBeLessThan(valid);
    expect(valid).toBe(3);
    expect(long).toBe(4);
  });
});
