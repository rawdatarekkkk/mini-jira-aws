import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, AlertTriangle, Paperclip } from 'lucide-react';

const PRIORITY_BADGE = {
  Low:      'bg-slate-100 text-slate-600',
  Medium:   'bg-blue-100  text-blue-700',
  High:     'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100   text-red-700',
};

const PRIORITY_DOT = {
  Low:      'bg-slate-400',
  Medium:   'bg-blue-500',
  High:     'bg-orange-500',
  Critical: 'bg-red-500',
};

export default function TaskCard({ task, onClick, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.taskId,
    data: { task },
    disabled: overlay,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const deadline = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadline && deadline < new Date() && task.status !== 'Done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border bg-white p-3 shadow-sm transition-all
        ${isDragging
          ? 'opacity-30 border-indigo-300 shadow-none'
          : 'border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-pointer'
        }`}
      onClick={overlay ? undefined : onClick}
    >
      {/* Title row with drag handle */}
      <div className="flex items-start gap-1.5">
        <button
          {...(overlay ? {} : { ...attributes, ...listeners })}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 focus:outline-none"
          tabIndex={-1}
          onClick={e => e.stopPropagation()}
          aria-label="Drag task"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="flex-1 text-sm font-medium text-slate-900 leading-snug line-clamp-2">
          {task.title}
        </p>
      </div>

      {/* Priority + attachment indicator */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.priority && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
              ${PRIORITY_BADGE[task.priority] ?? 'bg-slate-100 text-slate-600'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] ?? 'bg-slate-400'}`} />
            {task.priority}
          </span>
        )}
        {task.imageOriginalKey && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-50 px-1.5 py-0.5 text-xs text-slate-400">
            <Paperclip className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Assignee avatar */}
      {task.assigneeName && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
            {task.assigneeName[0]?.toUpperCase()}
          </div>
          <span className="truncate text-xs text-slate-500">{task.assigneeName}</span>
        </div>
      )}

      {/* Deadline */}
      {deadline && (
        <div
          className={`mt-1.5 flex items-center gap-1 text-xs
            ${isOverdue ? 'font-semibold text-red-600' : 'text-slate-400'}`}
        >
          {isOverdue
            ? <AlertTriangle className="h-3 w-3 shrink-0" />
            : <Calendar className="h-3 w-3 shrink-0" />
          }
          {deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {isOverdue && <span className="ml-0.5">· Overdue</span>}
        </div>
      )}
    </div>
  );
}
