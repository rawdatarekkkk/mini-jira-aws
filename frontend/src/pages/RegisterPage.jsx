import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, isConfigured } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isConfigured) {
      showToast("Configure Cognito pool and client in frontend/.env first.", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (password.length < 8) {
      showToast("Use at least 8 characters for the password.", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        email,
        password,
        role,
        teamId: role === "employee" ? teamId : "",
      });
      const needsConfirm = result?.nextStep?.signUpStep === "CONFIRM_SIGN_UP";
      if (needsConfirm) {
        showToast("Check your email for a verification code.", "success");
        navigate(`/confirm-signup?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      showToast("Account created. You can sign in.", "success");
      navigate("/login");
    } catch (err) {
      showToast(err?.message || "Registration failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your User Pool must allow <code className="text-xs">custom:role</code> and optional{" "}
          <code className="text-xs">custom:teamId</code> attributes (Member 5).
        </p>

        {!isConfigured ? (
          <div
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            role="alert"
          >
            Add Cognito IDs to <code className="rounded bg-amber-100 px-1">frontend/.env</code> before
            registering.
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label htmlFor="reg-role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          {role === "employee" ? (
            <div>
              <label htmlFor="reg-team" className="block text-sm font-medium text-slate-700">
                Team ID
              </label>
              <input
                id="reg-team"
                type="text"
                placeholder="e.g. team-sara"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <p className="mt-1 text-xs text-slate-500">
                Must match the team identifier your admin uses in DynamoDB.
              </p>
            </div>
          ) : null}
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
