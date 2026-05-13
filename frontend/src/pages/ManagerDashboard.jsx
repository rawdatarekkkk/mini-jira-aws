import { useAuth } from "../hooks/useAuth.js";

export default function ManagerDashboard() {
  const { claims } = useAuth();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Manager dashboard</h2>
      <p className="mt-2 text-sm text-slate-600">
        Signed in as{" "}
        <span className="font-medium capitalize text-slate-800">{claims?.role || "manager"}</span>.
        Member 3 will add project and task creation, assignment, and team filters here. You should see
        tasks across all teams once those APIs are wired.
      </p>
    </div>
  );
}
