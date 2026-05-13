import { useAuth } from "../hooks/useAuth.js";
import EmployeeDashboard from "./EmployeeDashboard.jsx";
import ManagerDashboard from "./ManagerDashboard.jsx";

function RoleMissingNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Your Cognito user has no role claim yet.</p>
      <p className="mt-1 text-amber-800">
        Ask Member 5 to set the <code className="rounded bg-amber-100 px-1">custom:role</code> attribute
        (and <code className="rounded bg-amber-100 px-1">custom:teamId</code> for employees), then sign out
        and sign in again.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { claims } = useAuth();
  const role = claims?.role;

  if (!role) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <RoleMissingNotice />
      </div>
    );
  }

  if (role === "manager" || role === "admin") {
    return <ManagerDashboard />;
  }

  return <EmployeeDashboard />;
}
