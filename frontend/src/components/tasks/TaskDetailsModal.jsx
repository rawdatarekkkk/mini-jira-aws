import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { commentService } from '../../services/commentService.js';
import { taskService } from '../../services/taskService.js';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../../hooks/useAuth.js';

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  'To Do':       'bg-slate-100  text-slate-700',
  'In Progress': 'bg-blue-100   text-blue-700',
  'In Review':   'bg-amber-100  text-amber-700',
  Done:          'bg-emerald-100 text-emerald-700',
};

const PRIORITY_BADGE = {
  Low:      'bg-slate-100  text-slate-600',
  Medium:   'bg-blue-100   text-blue-700',
  High:     'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100    text-red-700',
};

// Allowed forward transitions (matches backend canTransitionStatus logic)
const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];

function nextStatuses(currentStatus) {
  const idx = STATUSES.indexOf(currentStatus);
  return idx >= 0 ? STATUSES.slice(idx + 1) : [];
}

// ─── small pieces ─────────────────────────────────────────────────────────────

function Badge({ text, colorClass }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {text}
    </span>
  );
}

function MetaRow({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function AvatarInitial({ name, size = 'sm' }) {
  const sz = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 ${sz}`}>
      {(name ?? '?')[0].toUpperCase()}
    </div>
  );
}

// ─── main modal ───────────────────────────────────────────────────────────────

export default function TaskDetailsModal({ task, isOpen, onClose, onStatusChange }) {
  const { claims } = useAuth();
  const { showToast } = useToast();

  const [comments, setComments]         = useState([]);
  const [activity, setActivity]         = useState([]);
  const [commentText, setCommentText]   = useState('');
  const [imageUrl, setImageUrl]         = useState(null);
  const [loadingData, setLoadingData]   = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab]       = useState('comments');

  const userId  = claims?.raw?.sub ?? null;
  const isManager = claims?.role === 'manager' || claims?.role === 'admin';
  const isAssignee = task?.assigneeId === userId;
  const canChangeStatus = isManager || isAssignee;
  const forwardStatuses = task ? nextStatuses(task.status) : [];

  // ── data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!task) return;
    setLoadingData(true);
    try {
      const [cmts, logs] = await Promise.all([
        commentService.list(task.taskId),
        taskService.getActivity(task.taskId),
      ]);
      setComments(cmts ?? []);
      setActivity(logs ?? []);
    } catch {
      // non-fatal — show empty states
    } finally {
      setLoadingData(false);
    }
  }, [task]);

  useEffect(() => {
    if (!isOpen || !task) {
      setComments([]);
      setActivity([]);
      setCommentText('');
      setImageUrl(null);
      return;
    }
    loadData();
    if (task.imageOriginalKey) {
      taskService
        .getImageUrl(task.imageOriginalKey)
        .then(url => setImageUrl(url))
        .catch(() => setImageUrl(null));
    }
  }, [isOpen, task, loadData]);

  // ── handlers ────────────────────────────────────────────────────────────────

  async function handleAddComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setPostingComment(true);
    try {
      const comment = await commentService.create(task.taskId, text);
      setComments(prev => [...prev, comment]);
      setCommentText('');
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Failed to add comment', 'error');
    } finally {
      setPostingComment(false);
    }
  }

  async function handleMoveStatus(newStatus) {
    setUpdatingStatus(true);
    try {
      const updated = await taskService.updateStatus(task.taskId, newStatus);
      showToast(`Moved to "${newStatus}"`, 'success');
      onStatusChange?.(updated);
      // refresh activity log after status change
      taskService.getActivity(task.taskId).then(logs => setActivity(logs ?? [])).catch(() => {});
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────

  if (!isOpen || !task) return null;

  const deadline  = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadline && deadline < new Date() && task.status !== 'Done';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">

        {/* ── header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold leading-snug text-slate-900">{task.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                text={task.status}
                colorClass={STATUS_BADGE[task.status] ?? 'bg-slate-100 text-slate-600'}
              />
              {task.priority && (
                <Badge
                  text={task.priority}
                  colorClass={PRIORITY_BADGE[task.priority] ?? 'bg-slate-100 text-slate-600'}
                />
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── body (two-column on md+) ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row">

          {/* left — description, image, status moves, tabs */}
          <div className="flex-1 space-y-5 p-6 md:border-r md:border-slate-100">

            {/* Description */}
            {task.description ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {task.description}
                </p>
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">No description provided.</p>
            )}

            {/* Image attachment */}
            {imageUrl && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Attachment
                </p>
                <img
                  src={imageUrl}
                  alt="Task attachment"
                  className="max-h-52 w-full rounded-lg border border-slate-200 object-cover"
                />
              </div>
            )}
            {task.imageOriginalKey && !imageUrl && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading attachment…
              </div>
            )}

            {/* Move-to buttons (only for assignee or manager) */}
            {canChangeStatus && forwardStatuses.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Move to
                </p>
                <div className="flex flex-wrap gap-2">
                  {forwardStatuses.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleMoveStatus(s)}
                      disabled={updatingStatus}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium
                        transition-colors hover:ring-2 hover:ring-indigo-300 disabled:opacity-50
                        ${STATUS_BADGE[s] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {updatingStatus
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <ChevronRight className="h-3 w-3" />
                      }
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab nav */}
            <div className="border-b border-slate-100">
              <nav className="-mb-px flex gap-5">
                {[
                  { id: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length },
                  { id: 'activity', label: 'Activity',  icon: Activity,        count: activity.length  },
                ].map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 pb-2.5 text-xs font-medium border-b-2 transition-colors
                      ${activeTab === id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums
                      ${activeTab === id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* ── Comments tab ──────────────────────────────────────────────── */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                {loadingData ? (
                  <div className="flex items-center justify-center py-6 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No comments yet — be the first!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map(c => (
                      <div key={c.commentId} className="flex gap-3">
                        <AvatarInitial name={c.userName} />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span
                              className="max-w-[160px] truncate text-xs font-semibold text-slate-800"
                              title={c.userName ?? 'Unknown'}
                            >
                              {c.userName ?? 'Unknown'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(c.createdAt).toLocaleString(undefined, {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm leading-relaxed text-slate-700">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment form */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm
                      focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || postingComment}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm
                      font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {postingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Post
                  </button>
                </form>
              </div>
            )}

            {/* ── Activity tab ───────────────────────────────────────────────── */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                {loadingData ? (
                  <div className="flex items-center justify-center py-6 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : activity.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">No activity recorded yet.</p>
                ) : (
                  activity.map(log => (
                    <div key={log.logId} className="flex gap-3 items-start">
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                      <div>
                        <p className="text-xs text-slate-700">{log.message}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* right — metadata sidebar */}
          <div className="min-w-0 shrink-0 space-y-5 overflow-hidden rounded-b-2xl bg-slate-50/60 p-6 md:w-56 md:rounded-br-2xl md:rounded-bl-none">

            <MetaRow label="Assignee">
              {task.assigneeName ? (
                <div className="flex min-w-0 items-center gap-2">
                  <AvatarInitial name={task.assigneeName} />
                  <span
                    className="min-w-0 truncate text-sm text-slate-700"
                    title={task.assigneeName}
                  >
                    {task.assigneeName}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Unassigned</span>
              )}
            </MetaRow>

            <MetaRow label="Team">
              <p className="text-sm capitalize text-slate-700">{task.teamId ?? '—'}</p>
            </MetaRow>

            <MetaRow label="Deadline">
              {deadline ? (
                <div className={`flex items-center gap-1.5 text-sm ${isOverdue ? 'font-semibold text-red-600' : 'text-slate-700'}`}>
                  {isOverdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                  <Calendar className={`h-3.5 w-3.5 shrink-0 ${isOverdue ? 'hidden' : ''}`} />
                  {deadline.toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </div>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
              {isOverdue && (
                <p className="mt-0.5 text-xs text-red-500">This task is overdue</p>
              )}
            </MetaRow>

            <MetaRow label="Created">
              <p className="text-sm text-slate-600">
                {task.createdAt
                  ? new Date(task.createdAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })
                  : '—'}
              </p>
            </MetaRow>
          </div>
        </div>
      </div>
    </div>
  );
}
