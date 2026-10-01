import { useState } from "react";

type StatusState = {
  frontend: string;
  backend: string;
  database: string;
};

const defaultStatus: StatusState = {
  frontend: "READY",
  backend: "UNKNOWN",
  database: "UNKNOWN",
};

function App() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const [status, setStatus] = useState<StatusState>(defaultStatus);
  const [message, setMessage] = useState("Press \"Check System\" to verify the connection.");
  const [isLoading, setIsLoading] = useState(false);

  const checkSystem = async () => {
    setIsLoading(true);
    setMessage("Checking the system...");

    try {
      const response = await fetch(`${apiUrl}/api/status`);

      if (!response.ok) {
        throw new Error("Backend connection failed");
      }

      const data = await response.json();
      const databaseState = data.database === "CONNECTED" ? "CONNECTED" : "DISCONNECTED";

      setStatus({
        frontend: "OK",
        backend: data.backend || "ERROR",
        database: databaseState,
      });

      setMessage(
        data.database === "CONNECTED"
          ? "System verified successfully."
          : "The backend is active, but the database is not connected."
      );
    } catch {
      setStatus({
        frontend: "OK",
        backend: "ERROR",
        database: "DISCONNECTED",
      });
      setMessage("Unable to reach the backend. Verify that FastAPI is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="panel">
        <p className="eyebrow">Prototype</p>
        <h1>TACTIVISION IA</h1>
        <p className="subtitle">Intelligent Soccer Tactical Analysis</p>

        <div className="status-grid" aria-label="System status">
          <div className="status-card">
            <span className="label">Frontend</span>
            <strong className="value">{status.frontend}</strong>
          </div>
          <div className="status-card">
            <span className="label">Backend</span>
            <strong className="value">{status.backend}</strong>
          </div>
          <div className="status-card">
            <span className="label">Database</span>
            <strong className="value">{status.database}</strong>
          </div>
        </div>

        <button className="primary-button" onClick={checkSystem} disabled={isLoading}>
          {isLoading ? "Checking..." : "Check System"}
        </button>

        <p className="message">{message}</p>
      </div>
    </div>
  );
}

export default App;