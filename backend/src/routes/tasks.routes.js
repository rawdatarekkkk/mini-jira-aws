const express = require("express");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("../utils/asyncHandler");
const {
  authenticate,
  requireRoles,
  isManager,
  assertEmployeeTeamAccess,
} = require("../middleware/auth");
const {
  getProjectById,
  getTaskById,
  listTasksForTeam,
  listAllTasks,
  createTask,
  updateTask,
  deleteTask,
  createActivityLog,
  listActivityLogsForTask,
} = require("../services/dynamo");
const {
  isValidStatus,
  isValidPriority,
  canTransitionStatus,
} = require("../utils/taskConstants");
const { badRequest, forbidden, notFound } = require("../utils/errors");
const commentsRoutes = require("./comments.routes");

const router = express.Router();

router.use(authenticate);

function pickTaskFields(body) {
  return {
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    deadline: body.deadline,
    assigneeId: body.assigneeId,
    assigneeName: body.assigneeName,
    teamId: body.teamId,
    projectId: body.projectId,
    imageOriginalKey: body.imageOriginalKey,
    imageResizedKey: body.imageResizedKey,
  };
}

async function loadTask(req, res, next) {
  const task = await getTaskById(req.params.taskId);

  if (!task) {
    return next(notFound("Task not found"));
  }

  assertEmployeeTeamAccess(req.user, task.teamId);
  req.task = task;
  return next();
}

async function recordStatusChange(task, userId, previousStatus, status) {
  if (previousStatus === status) {
    return;
  }

  await createActivityLog({
    logId: uuidv4(),
    eventType: "STATUS_CHANGE",
    taskId: task.taskId,
    teamId: task.teamId,
    assigneeId: userId,
    message: `Status changed from ${previousStatus} to ${status}`,
    createdAt: new Date().toISOString(),
  });
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { teamId } = req.query;

    if (isManager(req.user)) {
      let tasks = await listAllTasks();

      if (teamId) {
        tasks = tasks.filter((task) => task.teamId === teamId);
      }

      res.json({ tasks });
      return;
    }

    if (teamId && teamId !== req.user.teamId) {
      throw forbidden("You do not have access to this team's tasks");
    }

    if (!req.user.teamId) {
      throw forbidden("Employee account is missing a team assignment");
    }

    const tasks = await listTasksForTeam(req.user.teamId);
    res.json({ tasks });
  })
);

router.get(
  "/:taskId/activity",
  loadTask,
  asyncHandler(async (req, res) => {
    const activity = await listActivityLogsForTask(req.params.taskId);
    activity.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ activity });
  })
);

router.get(
  "/:taskId",
  loadTask,
  asyncHandler(async (req, res) => {
    res.json({ task: req.task });
  })
);

router.post(
  "/",
  requireRoles("MANAGER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const fields = pickTaskFields(req.body);

    if (!fields.title || !String(fields.title).trim()) {
      throw badRequest("Task title is required");
    }

    if (!fields.projectId) {
      throw badRequest("projectId is required");
    }

    if (!fields.teamId) {
      throw badRequest("teamId is required");
    }

    if (!fields.assigneeId) {
      throw badRequest("assigneeId is required");
    }

    const project = await getProjectById(fields.projectId);

    if (!project) {
      throw notFound("Project not found");
    }

    const status = fields.status || "To Do";

    if (!isValidStatus(status)) {
      throw badRequest("Invalid task status");
    }

    if (fields.priority && !isValidPriority(fields.priority)) {
      throw badRequest("Invalid task priority");
    }

    const now = new Date().toISOString();
    const task = {
      taskId: uuidv4(),
      projectId: fields.projectId,
      title: String(fields.title).trim(),
      description: fields.description ? String(fields.description).trim() : "",
      status,
      priority: fields.priority || "Medium",
      deadline: fields.deadline || null,
      assigneeId: fields.assigneeId,
      assigneeName: fields.assigneeName || "",
      teamId: fields.teamId,
      imageOriginalKey: fields.imageOriginalKey || null,
      imageResizedKey: fields.imageResizedKey || null,
      createdBy: req.user.userId,
      createdAt: now,
      updatedAt: now,
      closedAt: status === "Done" ? now : null,
    };

    await createTask(task);
    res.status(201).json({ task });
  })
);

router.put(
  "/:taskId",
  requireRoles("MANAGER", "ADMIN"),
  loadTask,
  asyncHandler(async (req, res) => {
    const fields = pickTaskFields(req.body);
    const updates = {
      updatedAt: new Date().toISOString(),
    };

    if (fields.title !== undefined) {
      if (!String(fields.title).trim()) {
        throw badRequest("Task title cannot be empty");
      }

      updates.title = String(fields.title).trim();
    }

    if (fields.description !== undefined) {
      updates.description = String(fields.description).trim();
    }

    if (fields.priority !== undefined) {
      if (!isValidPriority(fields.priority)) {
        throw badRequest("Invalid task priority");
      }

      updates.priority = fields.priority;
    }

    if (fields.deadline !== undefined) {
      updates.deadline = fields.deadline;
    }

    if (fields.assigneeId !== undefined) {
      updates.assigneeId = fields.assigneeId;
    }

    if (fields.assigneeName !== undefined) {
      updates.assigneeName = fields.assigneeName;
    }

    if (fields.teamId !== undefined) {
      updates.teamId = fields.teamId;
    }

    if (fields.projectId !== undefined) {
      const project = await getProjectById(fields.projectId);

      if (!project) {
        throw notFound("Project not found");
      }

      updates.projectId = fields.projectId;
    }

    if (fields.status !== undefined) {
      if (!isValidStatus(fields.status)) {
        throw badRequest("Invalid task status");
      }

      updates.status = fields.status;

      if (fields.status === "Done") {
        updates.closedAt = new Date().toISOString();
      } else if (req.task.closedAt) {
        updates.closedAt = null;
      }
    }

    if (fields.imageOriginalKey !== undefined) {
      updates.imageOriginalKey = fields.imageOriginalKey;
    }

    if (fields.imageResizedKey !== undefined) {
      updates.imageResizedKey = fields.imageResizedKey;
    }

    const task = await updateTask(req.params.taskId, updates);

    if (fields.status !== undefined) {
      await recordStatusChange(
        req.task,
        req.user.userId,
        req.task.status,
        fields.status
      );
    }

    res.json({ task });
  })
);

router.patch(
  "/:taskId/status",
  loadTask,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!status || !isValidStatus(status)) {
      throw badRequest("Valid status is required");
    }

    if (!isManager(req.user)) {
      if (req.task.assigneeId !== req.user.userId) {
        throw forbidden("You can only update tasks assigned to you");
      }

      if (!canTransitionStatus(req.task.status, status)) {
        throw badRequest("Invalid status transition");
      }
    }

    const previousStatus = req.task.status;
    const now = new Date().toISOString();
    const updates = {
      status,
      updatedAt: now,
      closedAt: status === "Done" ? now : null,
    };

    const task = await updateTask(req.params.taskId, updates);

    await recordStatusChange(req.task, req.user.userId, previousStatus, status);

    res.json({ task });
  })
);

router.delete(
  "/:taskId",
  requireRoles("MANAGER", "ADMIN"),
  loadTask,
  asyncHandler(async (req, res) => {
    await deleteTask(req.params.taskId);
    res.status(204).send();
  })
);

router.use("/:taskId/comments", commentsRoutes);

module.exports = router;
