const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { authenticate } = require("../middleware/auth");
const {
  uploadImage,
  getPresignedUrl,
  ORIGINAL_BUCKET,
  RESIZED_BUCKET,
} = require("../services/s3");
const asyncHandler = require("../utils/asyncHandler");
const { badRequest } = require("../utils/errors");

const router = express.Router();

// Store the uploaded file in memory (as a Buffer) so we can send it straight to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// POST /api/upload
// Accepts a multipart form field named "image"
// Returns { key } — the S3 key to save on the task record
router.post(
  "/",
  authenticate,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw badRequest("No image file provided");
    }

    const ext = req.file.originalname.split(".").pop().toLowerCase();
    const key = `tasks/${uuidv4()}.${ext}`;

    await uploadImage(key, req.file.buffer, req.file.mimetype);

    res.status(201).json({ key });
  })
);

function resolveBucket(bucketParam) {
  const bucket = (bucketParam || "original").toLowerCase();

  if (bucket === "original") {
    return ORIGINAL_BUCKET;
  }

  if (bucket === "resized") {
    return RESIZED_BUCKET;
  }

  throw badRequest('bucket must be "original" or "resized"');
}

// GET /api/upload/url?key=...&bucket=original|resized
router.get(
  "/url",
  authenticate,
  asyncHandler(async (req, res) => {
    const key = req.query.key;

    if (!key || !String(key).trim()) {
      throw badRequest("key query parameter is required");
    }

    const bucketName = resolveBucket(req.query.bucket);
    const url = await getPresignedUrl(bucketName, String(key).trim());

    res.json({ url });
  })
);

module.exports = router;
