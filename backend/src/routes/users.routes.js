const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const {
  authenticate,
  requireRoles,
  assertEmployeeTeamAccess,
} = require("../middleware/auth");
const { getUserById, listUsers, listUsersByTeam } = require("../services/dynamo");

const router = express.Router();

router.use(authenticate);

function toPublicUser(user) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId || null,
    teamName: user.teamName || null,
  };
}

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const profile = await getUserById(req.user.userId);

    res.json({
      user: {
        userId: req.user.userId,
        email: req.user.email,
        name: profile?.name || req.user.name,
        role: req.user.role,
        teamId: req.user.teamId,
        teamName: profile?.teamName || null,
      },
    });
  })
);

router.get(
  "/",
  requireRoles("MANAGER"),
  asyncHandler(async (req, res) => {
    const users = await listUsers();
    res.json({ users: users.map(toPublicUser) });
  })
);

router.get(
  "/team/:teamId",
  asyncHandler(async (req, res) => {
    assertEmployeeTeamAccess(req.user, req.params.teamId);

    const users = await listUsersByTeam(req.params.teamId);
    res.json({ users: users.map(toPublicUser) });
  })
);

module.exports = router;
