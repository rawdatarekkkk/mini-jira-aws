import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard.jsx';

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

const COLUMN_CONFIG = {
  'To Do':       { dot: 'bg-slate-400',  header: 'text-slate-700  bg-slate-100',  drop: 'border-slate-300  bg-slate-50/60'  },
  'In Progress': { dot: 'bg-blue-500',   header: 'text-blue-700   bg-blue-50',    drop: 'border-blue-300   bg-blue-50/60'   },
  'In Review':   { dot: 'bg-amber-500',  header: 'text-amber-700  bg-amber-50',   drop: 'border-amber-300  bg-amber-50/60'  },
  'Done':        { dot: 'bg-emerald-500',header: 'text-emerald-700 bg-emerald-50',drop: 'border-emerald-300 bg-emerald-50/60'},
};

function DroppableColumn({ status, tasks, onTaskClick }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const cfg = COLUMN_CONFIG[status];

  return (
    <div className="flex min-w-0 flex-col">
      {/* Column header */}
      <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 ${cfg.header}`}>
        <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
        <span className="text-sm font-semibold">{status}</span>
        <span className="ml-auto rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-medium tabular-nums">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 border-dashed p-2 transition-colors duration-150
          ${isOver ? cfg.drop : 'border-transparent'}`}
        style={{ minHeight: 200 }}
      >
        {tasks.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center text-xs text-slate-400">
            Drop tasks here
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskCard
                key={task.taskId}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, onStatusChange, onTaskClick }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col] = tasks.filter(t => t.status === col);
    return acc;
  }, {});

  function handleDragStart({ active }) {
    setActiveTask(tasks.find(t => t.taskId === active.id) ?? null);
  }

  function handleDragEnd({ active, over }) {
    setActiveTask(null);
    if (!over) return;
    const newStatus = over.id;
    if (!COLUMNS.includes(newStatus)) return;
    const task = tasks.find(t => t.taskId === active.id);
    if (!task || task.status === newStatus) return;
    onStatusChange(task.taskId, newStatus, task.status);
  }

  function handleDragCancel() {
    setActiveTask(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(col => (
          <DroppableColumn
            key={col}
            status={col}
            tasks={tasksByStatus[col]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="rotate-1 scale-105 opacity-95 shadow-2xl">
            <TaskCard task={activeTask} onClick={() => {}} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
