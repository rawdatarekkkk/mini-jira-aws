import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { userService } from "../../services/userService.js";

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export function AppLayout() {
  const { claims, logOut } = useAuth();

  // Calling /me on mount triggers the authenticate middleware on the backend,
  // which upserts this user's record into DynamoDB. This ensures accounts
  // created directly in the Cognito console appear in GET /api/users.
  useEffect(() => {
    userService.me().catch(() => {});
  }, []);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const displayName = claims?.email || claims?.username || "User";
  const roleLabel = claims?.role ? claims.role : "role not set";
  const teamLabel = claims?.teamId ? `Team ${claims.teamId}` : "No team";

  async function handleSignOut() {
    try {
      await logOut();
      navigate("/login", { replace: true });
    } catch (e) {
      showToast(e?.message || "Could not sign out.", "error");
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Mini Jira
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Workspace</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink to="/dashboard" className={navLinkClass} end>
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
            Dashboard
          </NavLink>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="truncate text-sm font-medium text-slate-900" title={displayName}>
              {displayName}
            </p>
            <p className="mt-1 text-xs capitalize text-slate-500">{roleLabel}</p>
            <p className="text-xs text-slate-500">{teamLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-base font-semibold text-slate-900">Mini Jira on AWS</h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
