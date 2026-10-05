import { useState } from "react";
import { api } from "../api/client";

type StatusState = { frontend: string; backend: string; database: string; ai_service: string };

const defaultStatus: StatusState = { frontend: "READY", backend: "UNKNOWN", database: "UNKNOWN", ai_service: "UNKNOWN" };

// Original prototype "Check System", kept working. AI status is reported BY the backend.
export default function SystemStatus() {
  const [status, setStatus] = useState<StatusState>(defaultStatus);
  const [message, setMessage] = useState('Press "Check System" to verify the connection.');
  const [isLoading, setIsLoading] = useState(false);

  const checkSystem = async () => {
    setIsLoading(true);
    setMessage("Checking the system...");
    try {
      const data = await api<{ backend: string; database: string; ai_service?: string }>("/api/status");
      setStatus({
        frontend: "OK",
        backend: data.backend || "ERROR",
        database: data.database === "CONNECTED" ? "CONNECTED" : "DISCONNECTED",
        ai_service: data.ai_service ?? "UNKNOWN",
      });
      setMessage(
        data.database === "CONNECTED"
          ? "System verified successfully."
          : "The backend is active, but the database is not connected.",
      );
    } catch {
      setStatus({ frontend: "OK", backend: "ERROR", database: "DISCONNECTED", ai_service: "UNKNOWN" });
      setMessage("Unable to reach the backend. Verify that FastAPI is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <div className="status-grid" aria-label="System status">
        {(Object.keys(status) as (keyof StatusState)[]).map((key) => (
          <div className="status-card" key={key}>
            <span className="label">{key === "ai_service" ? "AI Service" : key}</span>
            <strong className="value">{status[key]}</strong>
          </div>
        ))}
      </div>
      <button className="primary-button" onClick={checkSystem} disabled={isLoading}>
        {isLoading ? "Checking..." : "Check System"}
      </button>
      <p className="message">{message}</p>
    </section>
  );
}
