import { useAuth } from "../hooks/useAuth.js";

export default function EmployeeDashboard() {
  const { claims } = useAuth();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Employee dashboard</h2>
      <p className="mt-2 text-sm text-slate-600">
        You belong to team{" "}
        <span className="font-medium text-slate-800">
          {claims?.teamId || "— (set custom:teamId in Cognito)"}
        </span>
        . Member 2 will add the Kanban board and task list scoped to your team; the backend must still
        enforce team isolation.
      </p>
    </div>
  );
}
