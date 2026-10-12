import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Loading } from "../components/ui";
import { es } from "../i18n/es";
import AdminPage from "../pages/app/AdminPage";
import AnalysisPage from "../pages/app/AnalysisPage";
import ComparisonPage from "../pages/app/ComparisonPage";
import EvolutionPage from "../pages/app/EvolutionPage";
import HomePage from "../pages/app/HomePage";
import MatchDetailPage from "../pages/app/MatchDetailPage";
import MatchesPage from "../pages/app/MatchesPage";
import PlayerDetailPage from "../pages/app/PlayerDetailPage";
import PlayersPage from "../pages/app/PlayersPage";
import ReportDetailPage from "../pages/app/ReportDetailPage";
import ReportsPage from "../pages/app/ReportsPage";
import { ComingSoonPage, NotFoundPage } from "../pages/app/PlaceholderPages";
import TacticalEditorPage from "../pages/app/TacticalEditorPage";
import TacticsPage from "../pages/app/TacticsPage";
import TeamPage from "../pages/app/TeamPage";
import type { User } from "../types";
import AppLayout from "./AppLayout";
import { TeamProvider } from "./TeamContext";
import { useTeam } from "./teamState";

/** Pages of a team: coaches and analysts only, and only after they have a team. */
function TeamOnly({ children }: { children: ReactNode }) {
  const { user, team, loading } = useTeam();
  if (user.role === "ADMINISTRATOR") return <Navigate to="/admin" replace />;
  if (loading) return <div className="page"><Loading /></div>;
  if (!team) return <Navigate to="/equipo" replace />;
  return children;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useTeam();
  return user.role === "ADMINISTRATOR" ? children : <Navigate to="/panel" replace />;
}

function Start() {
  const { user } = useTeam();
  return <Navigate to={user.role === "ADMINISTRATOR" ? "/admin" : "/panel"} replace />;
}

export default function AppRoutes({ user, onLogout }: { user: User; onLogout: () => void }) {
  const nav = es.app.nav;
  return (
    <BrowserRouter>
      <TeamProvider user={user}>
        <Routes>
          <Route element={<AppLayout onLogout={onLogout} />}>
            <Route index element={<Start />} />
            <Route path="panel" element={<TeamOnly><HomePage /></TeamOnly>} />
            <Route path="equipo" element={user.role === "ADMINISTRATOR" ? <Navigate to="/admin" replace /> : <TeamPage />} />
            <Route path="partidos" element={<TeamOnly><MatchesPage /></TeamOnly>} />
            <Route path="partidos/:matchId" element={<TeamOnly><MatchDetailPage /></TeamOnly>} />
            <Route path="analisis/:analysisId" element={<TeamOnly><AnalysisPage /></TeamOnly>} />
            <Route path="jugadores" element={<TeamOnly><PlayersPage /></TeamOnly>} />
            <Route path="jugadores/:playerId" element={<TeamOnly><PlayerDetailPage /></TeamOnly>} />
            <Route path="diseno-tactico" element={<TeamOnly><TacticsPage /></TeamOnly>} />
            <Route path="diseno-tactico/:playId" element={<TeamOnly><TacticalEditorPage /></TeamOnly>} />
            <Route path="comparacion" element={<TeamOnly><ComparisonPage /></TeamOnly>} />
            <Route path="evolucion" element={<TeamOnly><EvolutionPage /></TeamOnly>} />
            <Route path="reportes" element={<TeamOnly><ReportsPage /></TeamOnly>} />
            <Route path="reportes/:reportId" element={<TeamOnly><ReportDetailPage /></TeamOnly>} />
            <Route path="perfil" element={<ComingSoonPage title={nav.profile} />} />
            <Route path="admin" element={<AdminOnly><AdminPage section="overview" /></AdminOnly>} />
            <Route path="admin/usuarios" element={<AdminOnly><AdminPage section="users" /></AdminOnly>} />
            <Route path="admin/equipos" element={<AdminOnly><AdminPage section="teams" /></AdminOnly>} />
            <Route path="admin/sistema" element={<AdminOnly><AdminPage section="system" /></AdminOnly>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </TeamProvider>
    </BrowserRouter>
  );
}
