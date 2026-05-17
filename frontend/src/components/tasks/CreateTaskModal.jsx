import { useState, useEffect } from 'react';
import { X, Loader2, Paperclip } from 'lucide-react';
import { taskService } from '../../services/taskService.js';
import { useToast } from '../../hooks/useToast.js';

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const EMPTY_FORM = {
  title: '',
  description: '',
  projectId: '',
  assigneeId: '',
  assigneeName: '',
  teamId: '',
  status: 'To Do',
  priority: 'Medium',
  deadline: '',
};

export default function CreateTaskModal({
  isOpen,
  task,
  onClose,
  onSaved,
  projects = [],
  users = [],
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(task);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setForm({
        title: task.title ?? '',
        description: task.description ?? '',
        projectId: task.projectId ?? '',
        assigneeId: task.assigneeId ?? '',
        assigneeName: task.assigneeName ?? '',
        teamId: task.teamId ?? '',
        status: task.status ?? 'To Do',
        priority: task.priority ?? 'Medium',
        deadline: task.deadline ? task.deadline.slice(0, 10) : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setImageFile(null);
  }, [isOpen, task]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'assigneeId') {
      const user = users.find(u => u.userId === value);
      setForm(p => ({
        ...p,
        assigneeId: value,
        assigneeName: user ? (user.email || user.name || '') : '',
        teamId: user?.teamId ?? p.teamId,
      }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.teamId) {
      showToast('Please select an assignee so the team can be determined', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let imageOriginalKey = task?.imageOriginalKey ?? null;
      if (imageFile) {
        imageOriginalKey = await taskService.uploadImage(imageFile);
      }
      const payload = {
        ...form,
        deadline: form.deadline || null,
        imageOriginalKey,
      };
      const saved = isEdit
        ? await taskService.update(task.taskId, payload)
        : await taskService.create(payload);
      showToast(`Task ${isEdit ? 'updated' : 'created'} successfully`, 'success');
      onSaved(saved);
      onClose();
    } catch (err) {
      showToast(
        err?.response?.data?.message || err.message || 'Failed to save task',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const employees = users.filter(u => (u.role || '').toLowerCase() === 'employee');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[78vh] space-y-4 overflow-y-auto px-6 py-4"
        >
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Task title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe what needs to be done…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Project */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              name="projectId"
              value={form.projectId}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select a project…</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Assignee <span className="text-red-500">*</span>
            </label>
            <select
              name="assigneeId"
              value={form.assigneeId}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select an employee…</option>
              {employees.map(u => (
                <option key={u.userId} value={u.userId}>
                  {u.email || u.name}
                  {u.teamId ? ` — ${u.teamName || u.teamId}` : ''}
                </option>
              ))}
            </select>
            {employees.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No employees found. Users must register with role "employee" first.
              </p>
            )}
          </div>

          {/* Team (read-only, auto-filled from assignee) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Team</label>
            <input
              value={form.teamId}
              readOnly
              placeholder="Auto-filled when you pick an assignee"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm capitalize text-slate-500"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Deadline</label>
            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Image attachment */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Image Attachment
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600">
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {imageFile ? imageFile.name : 'Click to attach an image (max 5 MB)'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={e => setImageFile(e.target.files[0] ?? null)}
              />
            </label>
            {imageFile && (
              <button
                type="button"
                onClick={() => setImageFile(null)}
                className="mt-1 text-xs text-slate-400 hover:text-red-500"
              >
                Remove
              </button>
            )}
            {isEdit && task?.imageOriginalKey && !imageFile && (
              <p className="mt-1 text-xs text-slate-400">
                Current image: {task.imageOriginalKey.split('/').pop()}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
