const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const asyncHandler = require("../utils/asyncHandler");
const { unauthorized, forbidden } = require("../utils/errors");
const { upsertUser } = require("../services/dynamo");

const region = process.env.AWS_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getSigningKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }

    callback(null, key.getPublicKey());
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ["RS256"],
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
        audience: clientId,
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(decoded);
      }
    );
  });
}

function mapUserFromClaims(claims) {
  const role = claims["custom:role"] || claims.role;
  const teamId = claims["custom:teamId"] || claims.teamId || null;

  return {
    userId: claims.sub,
    email: claims.email,
    name: claims.name || claims.email || claims["cognito:username"],
    role: role ? String(role).toUpperCase() : null,
    teamId: teamId || null,
  };
}

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw unauthorized("Missing or invalid authorization header");
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw unauthorized("Missing bearer token");
  }

  let claims;

  try {
    claims = await verifyToken(token);
  } catch {
    throw unauthorized("Invalid or expired token");
  }

  const user = mapUserFromClaims(claims);

  if (!user.role) {
    throw unauthorized("Authenticated user is missing a role claim");
  }

  req.user = user;

  // Fire-and-forget: keep the DynamoDB Users table in sync with Cognito.
  // Runs on every authenticated request so accounts created via the Cognito
  // console (without a Post-Confirmation Lambda) still get a DB record.
  upsertUser({
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId || null,
  }).catch(() => {});

  next();
});

function requireRoles(...roles) {
  const allowed = roles.map((role) => role.toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return next(unauthorized());
    }

    if (!allowed.includes(req.user.role)) {
      return next(forbidden("Insufficient permissions"));
    }

    return next();
  };
}

function isManager(user) {
  return user.role === "MANAGER";
}

function assertEmployeeTeamAccess(user, teamId) {
  if (isManager(user)) {
    return;
  }

  if (user.role === "EMPLOYEE" && user.teamId === teamId) {
    return;
  }

  throw forbidden("You do not have access to this team's resources");
}

module.exports = {
  authenticate,
  requireRoles,
  isManager,
  assertEmployeeTeamAccess,
};
