const express = require("express");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireRoles } = require("../middleware/auth");
const {
  getProjectById,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} = require("../services/dynamo");
const { badRequest, notFound } = require("../utils/errors");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const projects = await listProjects();
    res.json({ projects });
  })
);

router.get(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const project = await getProjectById(req.params.projectId);

    if (!project) {
      throw notFound("Project not found");
    }

    res.json({ project });
  })
);

router.post(
  "/",
  requireRoles("MANAGER"),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || !String(name).trim()) {
      throw badRequest("Project name is required");
    }

    const now = new Date().toISOString();
    const project = {
      projectId: uuidv4(),
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      createdBy: req.user.userId,
      createdAt: now,
      updatedAt: now,
    };

    await createProject(project);
    res.status(201).json({ project });
  })
);

router.put(
  "/:projectId",
  requireRoles("MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await getProjectById(req.params.projectId);

    if (!existing) {
      throw notFound("Project not found");
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };

    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim()) {
        throw badRequest("Project name cannot be empty");
      }

      updates.name = String(req.body.name).trim();
    }

    if (req.body.description !== undefined) {
      updates.description = String(req.body.description).trim();
    }

    const project = await updateProject(req.params.projectId, updates);
    res.json({ project });
  })
);

router.delete(
  "/:projectId",
  requireRoles("MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await getProjectById(req.params.projectId);

    if (!existing) {
      throw notFound("Project not found");
    }

    await deleteProject(req.params.projectId);
    res.status(204).send();
  })
);

module.exports = router;
