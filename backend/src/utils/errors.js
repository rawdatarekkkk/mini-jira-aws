class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

function badRequest(message) {
  return new AppError(400, message);
}

function unauthorized(message = "Unauthorized") {
  return new AppError(401, message);
}

function forbidden(message = "Forbidden") {
  return new AppError(403, message);
}

function notFound(message = "Not found") {
  return new AppError(404, message);
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
};
