import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Loader2,
  LayoutGrid,
  List,
  Calendar,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import KanbanBoard from '../components/tasks/KanbanBoard.jsx';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal.jsx';

// ─── colour maps (shared between views) ──────────────────────────────────────

const STATUS_COLORS = {
  'To Do':       'bg-slate-100  text-slate-700',
  'In Progress': 'bg-blue-100   text-blue-700',
  'In Review':   'bg-amber-100  text-amber-700',
  Done:          'bg-emerald-100 text-emerald-700',
};

const PRIORITY_COLORS = {
  Low:      'bg-slate-100  text-slate-600',
  Medium:   'bg-blue-100   text-blue-700',
  High:     'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100    text-red-700',
};

// ─── small shared helpers ─────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function Badge({ text, colorClass }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {text}
    </span>
  );
}

function deadlineLabel(iso, status) {
  if (!iso) return null;
  const d = new Date(iso);
  const overdue = d < new Date() && status !== 'Done';
  return {
    label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    overdue,
  };
}

// ─── list view ────────────────────────────────────────────────────────────────

function ListView({ tasks, onTaskClick }) {
  if (tasks.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {['Title', 'Status', 'Priority', 'Assignee', 'Deadline'].map(h => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map(task => {
            const dl = deadlineLabel(task.deadline, task.status);
            return (
              <tr
                key={task.taskId}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => onTaskClick(task)}
              >
                <td className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-900" title={task.title}>
                  {task.title}
                </td>
                <td className="px-4 py-3">
                  <Badge text={task.status} colorClass={STATUS_COLORS[task.status] ?? 'bg-slate-100 text-slate-600'} />
                </td>
                <td className="px-4 py-3">
                  {task.priority && (
                    <Badge text={task.priority} colorClass={PRIORITY_COLORS[task.priority] ?? 'bg-slate-100 text-slate-600'} />
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{task.assigneeName || '—'}</td>
                <td className={`px-4 py-3 text-xs ${dl?.overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                  {dl ? (
                    <span className="flex items-center gap-1">
                      {dl.overdue && <AlertTriangle className="h-3 w-3" />}
                      {dl.label}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
        {tasks.length} task{tasks.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ─── main dashboard ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const { claims } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [view, setView]                 = useState('board'); // 'board' | 'list'

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

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── derived stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:   tasks.length,
    mine:    tasks.filter(t => t.assigneeId === userId).length,
    overdue: tasks.filter(t =>
      t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Done'
    ).length,
    done:    tasks.filter(t => t.status === 'Done').length,
  }), [tasks, userId]);

  // ── status change (drag-and-drop or modal button) ─────────────────────────

  async function handleStatusChange(taskId, newStatus, prevStatus) {
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
      setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: prevStatus } : t));
      if (selectedTask?.taskId === taskId) {
        setSelectedTask(prev => ({ ...prev, status: prevStatus }));
      }
      showToast(err?.response?.data?.message ?? 'Failed to update status', 'error');
    }
  }

  function handleModalStatusChange(updatedTask) {
    setTasks(prev => prev.map(t => t.taskId === updatedTask.taskId ? updatedTask : t));
    setSelectedTask(updatedTask);
  }

  // ── loading ───────────────────────────────────────────────────────────────

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
          <h2 className="text-2xl font-bold text-slate-900">My Team's Tasks</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Team:{' '}
            <span className="font-medium capitalize text-slate-700">
              {claims?.teamId ?? '—'}
            </span>
            {' · '}
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView('board')}
              title="Board view"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${view === 'board'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              title="List view"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${view === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>

          {/* Refresh */}
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
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Team Tasks"  value={stats.total}   accent="text-slate-900"   />
        <StatCard label="My Tasks"    value={stats.mine}    accent="text-indigo-600"  />
        <StatCard label="Overdue"     value={stats.overdue} accent="text-red-600"     />
        <StatCard label="Done"        value={stats.done}    accent="text-emerald-600" />
      </div>

      {/* Empty state */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-24 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No tasks assigned to your team yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Tasks will appear here once your manager assigns them
          </p>
        </div>
      ) : view === 'board' ? (
        /* ── Board view (Kanban with drag-and-drop) ── */
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onTaskClick={task => setSelectedTask(task)}
        />
      ) : (
        /* ── List view (sortable table) ── */
        <ListView tasks={tasks} onTaskClick={task => setSelectedTask(task)} />
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
