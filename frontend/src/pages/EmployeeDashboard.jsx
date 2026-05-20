import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Loader2, LayoutGrid } from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import KanbanBoard from '../components/tasks/KanbanBoard.jsx';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal.jsx';

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { claims } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const userId = claims?.raw?.sub ?? null;

  // ── data fetching ─────────────────────────────────────────────────────────

  const fetchTasks = useCallback(
    async (quiet = false) => {
      quiet ? setRefreshing(true) : setLoading(true);
      try {
        const params = claims?.teamId ? { teamId: claims.teamId } : {};
        const data = await taskService.list(params);
        setTasks(data ?? []);
      } catch (err) {
        showToast(
          err?.response?.data?.error ?? err?.response?.data?.message ?? 'Failed to load tasks',
          'error',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [claims?.teamId, showToast],
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── derived stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:   tasks.length,
    mine:    tasks.filter(t => t.assigneeId === userId).length,
    overdue: tasks.filter(t =>
      t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Done'
    ).length,
    done:    tasks.filter(t => t.status === 'Done').length,
  }), [tasks, userId]);

  // ── status change (from drag-and-drop or modal button) ───────────────────

  async function handleStatusChange(taskId, newStatus, prevStatus) {
    // Optimistic update
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: newStatus } : t));
    if (selectedTask?.taskId === taskId) {
      setSelectedTask(prev => ({ ...prev, status: newStatus }));
    }

    try {
      const updated = await taskService.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t.taskId === taskId ? updated : t));
      if (selectedTask?.taskId === taskId) setSelectedTask(updated);
      showToast(`Moved to "${newStatus}"`, 'success');
    } catch (err) {
      // Revert on failure
      setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: prevStatus } : t));
      if (selectedTask?.taskId === taskId) {
        setSelectedTask(prev => ({ ...prev, status: prevStatus }));
      }
      showToast(err?.response?.data?.message ?? 'Failed to update status', 'error');
    }
  }

  // Called when the modal's own Move-to button updates status
  function handleModalStatusChange(updatedTask) {
    setTasks(prev => prev.map(t => t.taskId === updatedTask.taskId ? updatedTask : t));
    setSelectedTask(updatedTask);
  }

  // ── loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team Board</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Team:{' '}
            <span className="font-medium capitalize text-slate-700">
              {claims?.teamId ?? '—'}
            </span>
            {' · '}
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchTasks(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
            font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Team Tasks"  value={stats.total}   accent="text-slate-900"   />
        <StatCard label="My Tasks"    value={stats.mine}    accent="text-indigo-600"  />
        <StatCard label="Overdue"     value={stats.overdue} accent="text-red-600"     />
        <StatCard label="Done"        value={stats.done}    accent="text-emerald-600" />
      </div>

      {/* Kanban board or empty state */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-24 text-center">
          <LayoutGrid className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No tasks assigned to your team yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Tasks will appear here once your manager assigns them
          </p>
        </div>
      ) : (
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onTaskClick={task => setSelectedTask(task)}
        />
      )}

      {/* Task detail modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        onStatusChange={handleModalStatusChange}
      />
    </div>
  );
}
