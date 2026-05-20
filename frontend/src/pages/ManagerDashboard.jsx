import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  ClipboardList,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { userService } from '../services/userService.js';
import { useToast } from '../hooks/useToast.js';
import CreateTaskModal from '../components/tasks/CreateTaskModal.jsx';
import CreateProjectModal from '../components/manager/CreateProjectModal.jsx';
import ProjectList from '../components/manager/ProjectList.jsx';
import TeamFilter from '../components/manager/TeamFilter.jsx';

// ─── Colour maps ───────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  'To Do': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'In Review': 'bg-amber-100 text-amber-700',
  Done: 'bg-green-100 text-green-700',
};
const PRIORITY_COLORS = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-600',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
function Badge({ text, colorClass }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {text}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function deadlineInfo(iso, status) {
  if (!iso) return { label: '—', overdue: false };
  const d = new Date(iso);
  const label = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const overdue = d < new Date() && status !== 'Done';
  return { label, overdue };
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { showToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('tasks');
  const [teamFilter, setTeamFilter] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [projectModal, setProjectModal] = useState({ open: false, project: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, item }

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(
    async (quiet = false) => {
      quiet ? setRefreshing(true) : setLoading(true);
      try {
        const [t, p, u] = await Promise.all([
          taskService.list(),
          projectService.list(),
          userService.list(),
        ]);
        setTasks(t ?? []);
        setProjects(p ?? []);
        setUsers(u ?? []);
      } catch (err) {
        showToast(
          err?.response?.data?.error || err?.response?.data?.message || 'Failed to load data',
          'error',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const teams = useMemo(() => {
    const map = new Map();
    users.forEach(u => {
      if (u.teamId && !map.has(u.teamId)) {
        map.set(u.teamId, { teamId: u.teamId, teamName: u.teamName || u.teamId });
      }
    });
    return [...map.values()];
  }, [users]);

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => {
      m[p.projectId] = p.name;
    });
    return m;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (teamFilter) list = list.filter(t => t.teamId === teamFilter);
    if (statusFilter) list = list.filter(t => t.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        t =>
          t.title?.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q) ||
          t.teamId?.toLowerCase().includes(q) ||
          projectMap[t.projectId]?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tasks, teamFilter, statusFilter, search, projectMap]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      inReview: tasks.filter(t => t.status === 'In Review').length,
      done: tasks.filter(t => t.status === 'Done').length,
    }),
    [tasks],
  );

  // ── CRUD handlers ────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteConfirm) return;
    const { type, item } = deleteConfirm;
    try {
      if (type === 'task') {
        await taskService.remove(item.taskId);
        setTasks(prev => prev.filter(t => t.taskId !== item.taskId));
        showToast('Task deleted', 'success');
      } else {
        await projectService.remove(item.projectId);
        setProjects(prev => prev.filter(p => p.projectId !== item.projectId));
        showToast('Project deleted', 'success');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  }

  function handleTaskSaved(saved) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.taskId === saved.taskId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  function handleProjectSaved(saved) {
    setProjects(prev => {
      const idx = prev.findIndex(p => p.projectId === saved.projectId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manager Dashboard</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {projects.length} project{projects.length !== 1 ? 's' : ''} ·{' '}
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} ·{' '}
            {teams.length} team{teams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Tasks" value={stats.total} accent="text-slate-900" />
        <StatCard label="In Progress" value={stats.inProgress} accent="text-blue-600" />
        <StatCard label="In Review" value={stats.inReview} accent="text-amber-600" />
        <StatCard label="Done" value={stats.done} accent="text-green-600" />
      </div>

      {/* Tab nav */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'tasks', label: `Tasks (${tasks.length})` },
            { id: 'projects', label: `Projects (${projects.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tasks tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <input
                type="search"
                placeholder="Search tasks…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-52 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-300 py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  {['To Do', 'In Progress', 'In Review', 'Done'].map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Team filter chips */}
              <TeamFilter teams={teams} value={teamFilter} onChange={setTeamFilter} />
            </div>

            <button
              type="button"
              onClick={() => setTaskModal({ open: true, task: null })}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>

          {/* Tasks table */}
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
              <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                {search || teamFilter || statusFilter
                  ? 'No tasks match your filters'
                  : 'No tasks yet'}
              </p>
              {!search && !teamFilter && !statusFilter && (
                <button
                  type="button"
                  onClick={() => setTaskModal({ open: true, task: null })}
                  className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
                >
                  Create the first task
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {['Title', 'Project', 'Assignee', 'Team', 'Status', 'Priority', 'Deadline', ''].map(
                      h => (
                        <th key={h} className="px-4 py-3 text-left">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map(task => {
                    const dl = deadlineInfo(task.deadline, task.status);
                    return (
                      <tr key={task.taskId} className="group hover:bg-slate-50">
                        {/* Title */}
                        <td
                          className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-900"
                          title={task.title}
                        >
                          {task.title}
                          {task.imageOriginalKey && (
                            <span
                              className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 align-middle"
                              title="Has image attachment"
                            />
                          )}
                        </td>
                        {/* Project */}
                        <td className="max-w-[130px] truncate px-4 py-3 text-slate-500">
                          {projectMap[task.projectId] ?? (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        {/* Assignee */}
                        <td className="px-4 py-3 text-slate-600">
                          {task.assigneeName || '—'}
                        </td>
                        {/* Team */}
                        <td className="px-4 py-3 capitalize text-slate-500">
                          {task.teamId || '—'}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge
                            text={task.status}
                            colorClass={
                              STATUS_COLORS[task.status] ?? 'bg-slate-100 text-slate-600'
                            }
                          />
                        </td>
                        {/* Priority */}
                        <td className="px-4 py-3">
                          <Badge
                            text={task.priority}
                            colorClass={
                              PRIORITY_COLORS[task.priority] ?? 'bg-slate-100 text-slate-600'
                            }
                          />
                        </td>
                        {/* Deadline */}
                        <td
                          className={`px-4 py-3 text-xs ${
                            dl.overdue
                              ? 'font-semibold text-red-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {dl.label}
                          {dl.overdue && (
                            <span className="ml-1 text-red-400">⚠</span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              title="Edit task"
                              onClick={() => setTaskModal({ open: true, task })}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete task"
                              onClick={() =>
                                setDeleteConfirm({ type: 'task', item: task })
                              }
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Projects tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setProjectModal({ open: true, project: null })}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
          <ProjectList
            projects={projects}
            onEdit={project => setProjectModal({ open: true, project })}
            onDelete={project => setDeleteConfirm({ type: 'project', item: project })}
            loading={false}
          />
        </div>
      )}

      {/* ── Delete confirmation ────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
              <h3 className="font-semibold text-slate-900">
                Delete {deleteConfirm.type === 'task' ? 'Task' : 'Project'}?
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">
                &ldquo;{deleteConfirm.item.title ?? deleteConfirm.item.name}&rdquo;
              </span>
              ? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      <CreateTaskModal
        isOpen={taskModal.open}
        task={taskModal.task}
        onClose={() => setTaskModal({ open: false, task: null })}
        onSaved={handleTaskSaved}
        projects={projects}
        users={users}
      />
      <CreateProjectModal
        isOpen={projectModal.open}
        project={projectModal.project}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSaved={handleProjectSaved}
      />
    </div>
  );
}
