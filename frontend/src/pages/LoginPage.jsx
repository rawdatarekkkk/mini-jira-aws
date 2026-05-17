import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signInEmailPassword, isConfigured } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  // Navigate only after the user state has been committed to context.
  // Calling navigate() synchronously inside handleSubmit races against
  // the setUser() call inside refreshSession — ProtectedRoute would see
  // user=null and bounce back to /login before the re-render lands.
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isConfigured) {
      showToast(
        "Cognito is not configured. Copy frontend/.env.example to frontend/.env and add your User Pool ID and App Client ID from Member 5.",
        "error"
      );
      return;
    }
    setLoading(true);
    try {
      await signInEmailPassword(email, password);
      showToast("Signed in successfully.", "success");
      // Navigation is handled by the useEffect above once user state updates.
    } catch (err) {
      const name = err?.name || err?.code;
      if (name === "UserNotConfirmedException") {
        showToast("Please confirm your email before signing in.", "info");
        navigate(`/confirm-signup?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      showToast(err?.message || "Sign in failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use the company account created in Cognito (role and team are stored on the user).
        </p>

        {!isConfigured ? (
          <div
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            role="alert"
          >
            Auth env vars are missing. Set{" "}
            <code className="rounded bg-amber-100 px-1">VITE_COGNITO_USER_POOL_ID</code> and{" "}
            <code className="rounded bg-amber-100 px-1">VITE_COGNITO_CLIENT_ID</code> in{" "}
            <code className="rounded bg-amber-100 px-1">frontend/.env</code>.
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          No account yet?{" "}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-800">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
