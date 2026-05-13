import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function HomeRedirect() {
  const { initialized, user } = useAuth();

  if (!initialized) {
    return <FullPageSpinner label="Starting…" />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export function FullPageSpinner({ label = "Loading…" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
          aria-hidden
        />
        <p className="text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { initialized, user } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return <FullPageSpinner label="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function GuestRoute({ children }) {
  const { initialized, user } = useAuth();

  if (!initialized) {
    return <FullPageSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
