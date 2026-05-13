const express = require("express");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("../utils/asyncHandler");
const {
  authenticate,
  isManager,
  assertEmployeeTeamAccess,
} = require("../middleware/auth");
const {
  getTaskById,
  listCommentsForTask,
  createComment,
} = require("../services/dynamo");
const { badRequest, notFound } = require("../utils/errors");

const router = express.Router({ mergeParams: true });

router.use(authenticate);

async function loadTaskForComment(req, res, next) {
  const task = await getTaskById(req.params.taskId);

  if (!task) {
    return next(notFound("Task not found"));
  }

  assertEmployeeTeamAccess(req.user, task.teamId);
  req.task = task;
  return next();
}

router.get(
  "/",
  loadTaskForComment,
  asyncHandler(async (req, res) => {
    const comments = await listCommentsForTask(req.params.taskId);
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ comments });
  })
);

router.post(
  "/",
  loadTaskForComment,
  asyncHandler(async (req, res) => {
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      throw badRequest("Comment text is required");
    }

    const comment = {
      commentId: uuidv4(),
      taskId: req.params.taskId,
      userId: req.user.userId,
      userName: req.user.name,
      text: String(text).trim(),
      createdAt: new Date().toISOString(),
    };

    await createComment(comment);
    res.status(201).json({ comment });
  })
);

module.exports = router;
