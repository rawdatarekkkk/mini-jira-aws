import { Pencil, Trash2, FolderOpen, Loader2 } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ProjectList({ projects, onEdit, onDelete, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
        <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No projects yet</p>
        <p className="mt-1 text-xs text-slate-400">Click "New Project" to create one</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(project => (
        <div
          key={project.projectId}
          className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="break-words font-semibold text-slate-900">{project.name}</h3>
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onEdit(project)}
                title="Edit project"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(project)}
                title="Delete project"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {project.description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-500">{project.description}</p>
          )}

          <p className="mt-3 text-xs text-slate-400">Created {formatDate(project.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}
