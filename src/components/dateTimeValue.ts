export const pad = (n: number) => String(n).padStart(2, "0");

export interface Parts { year: number; month: number; day: number; hour: number; minute: number }

/** "2026-10-25T15:00" <-> parts. Local time, the same format a datetime-local input uses. */
export function parseValue(value: string): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hour: now.getHours(), minute: 0 };
  }
  const [, y, mo, d, h, mi] = match.map(Number);
  return { year: y, month: mo - 1, day: d, hour: h, minute: mi };
}

export function formatValue(parts: Parts): string {
  return `${parts.year}-${pad(parts.month + 1)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}
