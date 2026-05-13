import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";

export default function ConfirmSignUpPage() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { confirmRegistration, sendVerificationAgain, isConfigured } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isConfigured) {
      showToast("Configure Cognito in .env first.", "error");
      return;
    }
    setLoading(true);
    try {
      await confirmRegistration(email, code);
      showToast("Account verified. You can sign in.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      showToast(err?.message || "Verification failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      showToast("Enter your email first.", "error");
      return;
    }
    setLoading(true);
    try {
      await sendVerificationAgain(email);
      showToast("A new code was sent to your email.", "success");
    } catch (err) {
      showToast(err?.message || "Could not resend code.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Confirm your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the verification code sent to your inbox.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="confirm-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="confirm-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700">
              Verification code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify and continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="mt-4 w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          Resend code
        </button>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
