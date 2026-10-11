import { useEffect, useState } from "react";
import { es } from "../../i18n/es";

const t = es.pages.home;

/** Days / hours / minutes until kick-off, refreshed every 30 s. */
export default function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <p className="countdown-today">{t.today}</p>;
  const minutes = Math.floor(diff / 60_000);
  const parts = [
    { value: Math.floor(minutes / 1440), unit: t.days },
    { value: Math.floor((minutes % 1440) / 60), unit: t.hours },
    { value: minutes % 60, unit: t.minutes },
  ];
  return (
    <div className="countdown" aria-label={`${t.kickoffIn} ${parts.map((part) => `${part.value} ${part.unit}`).join(", ")}`}>
      {parts.map((part) => (
        <span key={part.unit} className="countdown-part">
          <strong>{String(part.value).padStart(2, "0")}</strong>
          <small>{part.unit}</small>
        </span>
      ))}
    </div>
  );
}
