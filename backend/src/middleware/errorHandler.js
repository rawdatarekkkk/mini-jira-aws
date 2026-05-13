const { AppError } = require("../utils/errors");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Multer upload errors (file too large = LIMIT_FILE_SIZE, wrong type = plain Error)
  if ((err.code && err.code.startsWith("LIMIT_")) || err.message === "Only image files are allowed") {
    return res.status(400).json({ error: err.message });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError ? err.message : "Internal server error";

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
