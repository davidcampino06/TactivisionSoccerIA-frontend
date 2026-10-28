import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Loading } from "../components/ui";
import AdminPage from "../pages/app/AdminPage";
import AnalysisPage from "../pages/app/AnalysisPage";
import ComparisonPage from "../pages/app/ComparisonPage";
import EvolutionPage from "../pages/app/EvolutionPage";
import HomePage from "../pages/app/HomePage";
import MatchDetailPage from "../pages/app/MatchDetailPage";
import MatchPlanPage from "../pages/app/MatchPlanPage";
import MatchesPage from "../pages/app/MatchesPage";
import PlayerDetailPage from "../pages/app/PlayerDetailPage";
import PlayerRankingPage from "../pages/app/PlayerRankingPage";
import PlayersPage from "../pages/app/PlayersPage";
import ProfilePage from "../pages/app/ProfilePage";
import ReportDetailPage from "../pages/app/ReportDetailPage";
import ReportsPage from "../pages/app/ReportsPage";
import ReviewInboxPage from "../pages/app/ReviewInboxPage";
import StructuresPage from "../pages/app/StructuresPage";
import { NotFoundPage } from "../pages/app/PlaceholderPages";
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

type Props = {
  user: User;
  /** The profile page edits the user (name, phone) and renews the session after a password change. */
  onUserChange: (user: User) => void;
  onLogout: () => void;
};

export default function AppRoutes({ user, onUserChange, onLogout }: Props) {
  return (
    <BrowserRouter>
      <TeamProvider user={user} onUserChange={onUserChange}>
        <Routes>
          <Route element={<AppLayout onLogout={onLogout} />}>
            <Route index element={<Start />} />
            <Route path="panel" element={<TeamOnly><HomePage /></TeamOnly>} />
            <Route path="equipo" element={user.role === "ADMINISTRATOR" ? <Navigate to="/admin" replace /> : <TeamPage />} />
            <Route path="partidos" element={<TeamOnly><MatchesPage /></TeamOnly>} />
            <Route path="partidos/:matchId" element={<TeamOnly><MatchDetailPage /></TeamOnly>} />
            <Route path="partidos/:matchId/plan" element={<TeamOnly><MatchPlanPage /></TeamOnly>} />
            <Route path="analisis/:analysisId" element={<TeamOnly><AnalysisPage /></TeamOnly>} />
            <Route path="revision" element={<TeamOnly><ReviewInboxPage /></TeamOnly>} />
            <Route path="jugadores" element={<TeamOnly><PlayersPage /></TeamOnly>} />
            <Route path="jugadores/ranking" element={<TeamOnly><PlayerRankingPage /></TeamOnly>} />
            <Route path="jugadores/:playerId" element={<TeamOnly><PlayerDetailPage /></TeamOnly>} />
            <Route path="diseno-tactico" element={<TeamOnly><TacticsPage /></TeamOnly>} />
            <Route path="diseno-tactico/:playId" element={<TeamOnly><TacticalEditorPage /></TeamOnly>} />
            <Route path="comparacion" element={<TeamOnly><ComparisonPage /></TeamOnly>} />
            <Route path="evolucion" element={<TeamOnly><EvolutionPage /></TeamOnly>} />
            <Route path="reportes" element={<TeamOnly><ReportsPage /></TeamOnly>} />
            <Route path="reportes/:reportId" element={<TeamOnly><ReportDetailPage /></TeamOnly>} />
            <Route path="estructuras" element={<TeamOnly><StructuresPage /></TeamOnly>} />
            <Route path="perfil" element={<ProfilePage onLogout={onLogout} />} />
            <Route path="restablecer" element={<Navigate to="/perfil" replace />} />
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
