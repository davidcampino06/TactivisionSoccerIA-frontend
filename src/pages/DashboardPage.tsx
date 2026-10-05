import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, json } from "../api/client";
import type { AnalysisResult, Match, Team, User, Video, VideoAnalysis } from "../types";

type Props = { user: User; onLogout: () => void };

const UPCOMING_SECTIONS = ["Players", "Tactical Design", "Comparisons", "Team Evolution", "Reports"];

export default function DashboardPage({ user, onLogout }: Props) {
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");

  const loadTeam = useCallback(async () => {
    try {
      const myTeam = await api<Team>("/api/teams/mine");
      setTeam(myTeam);
      setMatches(await api<Match[]>(`/api/teams/${myTeam.id}/matches`));
    } catch {
      setTeam(null);
    }
  }, []);

  useEffect(() => {
    if (user.role !== "ADMINISTRATOR") void loadTeam();
  }, [loadTeam, user.role]);

  const run = async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error");
    }
  };

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <strong>TACTIVISION IA</strong> · {user.first_name} ({user.role})
        </div>
        <button className="link-button" onClick={onLogout}>Logout</button>
      </header>
      <nav className="section-nav">
        <span className="active">Overview · Matches · Videos · Video Analysis</span>
        {UPCOMING_SECTIONS.map((section) => (
          <span key={section} className="upcoming" title="Available in the backend API; UI in the next phase">{section}</span>
        ))}
      </nav>
      {error && <p className="error">{error}</p>}

      {user.role === "ADMINISTRATOR" && <p className="card">Administration panel: next phase (API ready at /api/admin).</p>}
      {user.role !== "ADMINISTRATOR" && !team && <TeamSetup role={user.role} onDone={loadTeam} run={run} />}

      {team && (
        <>
          <section className="card">
            <h2>{team.name}</h2>
            <p>{[team.category, team.city].filter(Boolean).join(" · ")}</p>
            {team.invitation_code && <p>Analyst invitation code: <code>{team.invitation_code}</code></p>}
          </section>
          <MatchList team={team} matches={matches} onCreated={loadTeam} onSelect={setSelectedMatch} run={run} />
          {selectedMatch && <VideoPanel key={selectedMatch.id} match={selectedMatch} run={run} />}
        </>
      )}
    </div>
  );
}

type RunFn = (action: () => Promise<void>) => Promise<void>;

function TeamSetup({ role, onDone, run }: { role: string; onDone: () => Promise<void>; run: RunFn }) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (role === "COACH") await api("/api/teams", { method: "POST", body: json({ name: value }) });
      else await api("/api/teams/join", { method: "POST", body: json({ invitation_code: value }) });
      await onDone();
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h2>{role === "COACH" ? "Create your team" : "Join a team"}</h2>
      <input placeholder={role === "COACH" ? "Team name" : "Invitation code (e.g. BARCA-7K29)"} value={value}
        onChange={(e) => setValue(e.target.value)} required />
      <button className="primary-button">{role === "COACH" ? "Create team" : "Join"}</button>
    </form>
  );
}

function MatchList({ team, matches, onCreated, onSelect, run }:
  { team: Team; matches: Match[]; onCreated: () => Promise<void>; onSelect: (m: Match) => void; run: RunFn }) {
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const create = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await api(`/api/teams/${team.id}/matches`, { method: "POST", body: json({ opponent, match_date: `${date}T15:00:00` }) });
      setOpponent("");
      await onCreated();
    });
  };
  return (
    <section className="card">
      <h2>Matches</h2>
      <form className="inline-form" onSubmit={create}>
        <input placeholder="Opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} required />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <button className="primary-button small">Add match</button>
      </form>
      <ul className="list">
        {matches.map((match) => (
          <li key={match.id}>
            <button className="link-button" onClick={() => onSelect(match)}>
              {new Date(match.match_date).toLocaleDateString()} · vs {match.opponent} · {match.result ?? match.status}
            </button>
          </li>
        ))}
        {matches.length === 0 && <li>No matches yet.</li>}
      </ul>
    </section>
  );
}

function VideoPanel({ match, run }: { match: Match; run: RunFn }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("REAL_VIDEO_ANALYSIS");
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const loadVideos = useCallback(async () => setVideos(await api<Video[]>(`/api/matches/${match.id}/videos`)), [match.id]);
  useEffect(() => { void loadVideos(); }, [loadVideos]);

  // Poll the backend (never the AI Service) until the analysis finishes.
  useEffect(() => {
    if (!analysis || !["PENDING", "PROCESSING"].includes(analysis.status)) return;
    const timer = window.setTimeout(async () => {
      const current = await api<VideoAnalysis>(`/api/analyses/${analysis.id}`);
      setAnalysis(current);
      if (current.status === "COMPLETED" || current.status === "FAILED") {
        setResult(await api<AnalysisResult>(`/api/analyses/${analysis.id}/result`));
      }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [analysis]);

  const upload = (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    void run(async () => {
      const data = new FormData();
      data.append("video", file);
      await api(`/api/matches/${match.id}/videos`, { method: "POST", body: data });
      setFile(null);
      await loadVideos();
    });
  };

  const start = (video: Video) => void run(async () => {
    setResult(null);
    setAnalysis(await api<VideoAnalysis>(`/api/videos/${video.id}/analysis`, {
      method: "POST", body: json({ mode, max_frames: 300, frame_stride: 3 }),
    }));
  });

  return (
    <section className="card">
      <h2>Videos · vs {match.opponent}</h2>
      <form className="inline-form" onSubmit={upload}>
        <input type="file" accept=".mp4,.mov,.avi,.mkv,.webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="primary-button small" disabled={!file}>Upload</button>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="REAL_VIDEO_ANALYSIS">Real video analysis</option>
          <option value="SIMULATION_MODE">Simulation mode (test data)</option>
        </select>
      </form>
      <ul className="list">
        {videos.map((video) => (
          <li key={video.id}>
            {video.file_name} · {(video.file_size / 1_048_576).toFixed(1)} MB · {video.status}{" "}
            <button className="primary-button small" onClick={() => start(video)}>Start analysis</button>
          </li>
        ))}
      </ul>
      {analysis && (
        <p className="message">
          Analysis {analysis.status}
          {analysis.queue_position ? ` · queue position ${analysis.queue_position}` : ""}
        </p>
      )}
      {result && <AnalysisView result={result} />}
    </section>
  );
}

function AnalysisView({ result }: { result: AnalysisResult }) {
  const simulated = result.label === "SIMULATION MODE";
  return (
    <div className="analysis">
      <span className={simulated ? "badge simulation" : "badge real"}>{result.label}</span>
      <p>Model: {result.analysis.model_name ?? "-"} · Status: {result.analysis.status}</p>
      {result.analysis.warning_message && <p className="warning">{result.analysis.warning_message}</p>}
      <p>{Object.entries(result.summary).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</p>

      <h3>Possible tactical issues & recommendations</h3>
      {result.recommendations.length === 0 && <p>No possible issues detected.</p>}
      {result.recommendations.map((item) => (
        <article key={item.id} className={`recommendation ${item.severity.toLowerCase()}`}>
          <strong>{item.title}</strong>
          <p>Evidence: {item.evidence}</p>
          <p>Recommendation: {item.description}</p>
          <small>Confidence {item.confidence.toFixed(2)} · {item.severity} · {item.status}</small>
        </article>
      ))}

      <h3>Tactical indicators</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Indicator</th><th>Value</th><th>Unit</th><th>Threshold</th></tr></thead>
          <tbody>
            {result.indicators.map((indicator) => (
              <tr key={indicator.id}>
                <td>{indicator.name}</td><td>{indicator.value.toFixed(3)}</td><td>{indicator.unit}</td>
                <td>{indicator.threshold ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
