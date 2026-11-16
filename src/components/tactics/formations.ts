import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { es } from "../../i18n/es";
import { FORMATIONS } from "./board";

const t = es.pages.tactics;

/** "3-4-2-1" -> null when it is a valid formation, or the reason it is not. */
export function formationProblem(value: string): string | null {
  if (!/^\d+(-\d+)+$/.test(value)) return t.customFormat;
  const lines = value.split("-").map(Number);
  if (lines.length > 5) return t.customLines;
  if (lines.some((count) => count < 1 || count > 6)) return t.customPerLine;
  const total = lines.reduce((sum, count) => sum + count, 0);
  return total === 10 ? null : t.customTotal(total);
}

/** The fixed formations plus the ones saved in the catalogue (GET /api/formations), each once. */
export function useFormations(): [string[], (name: string) => void] {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    api<{ name: string }[]>("/api/formations")
      .then((list) => { if (alive) setSaved(list.map((item) => item.name).filter((name) => formationProblem(name) === null)); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);
  const all = [...new Set([...FORMATIONS, ...saved])];
  return [all, (name: string) => setSaved((list) => (list.includes(name) ? list : [...list, name]))];
}
