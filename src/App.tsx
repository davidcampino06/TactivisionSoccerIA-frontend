import { useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Pending connection");
  const [databaseStatus, setDatabaseStatus] = useState("Pending connection");

  const checkConnection = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/status");

      if (!response.ok) {
        throw new Error("Connection error");
      }

      const data = await response.json();

      setBackendStatus(data.backend);
      setDatabaseStatus(data.database);
    } catch (error) {
      setBackendStatus("ERROR");
      setDatabaseStatus("ERROR");
    }
  };

  return (
    <div>
      <h1>TactiVision IA</h1>

      <p>Football tactical analysis plataform</p>

      <hr />

      <h2>System Status</h2>

      <p>Frontend: OK</p>
      <p>Backend: {backendStatus}</p>
      <p>Database: {databaseStatus}</p>

      <button onClick={checkConnection}>
        check Connection
      </button>
    </div>
  );
}

export default App;