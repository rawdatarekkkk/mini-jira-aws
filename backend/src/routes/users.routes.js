const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { getUserById } = require("../services/dynamo");

const router = express.Router();

router.get(
  "/me",
  authenticate,
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

module.exports = router;
