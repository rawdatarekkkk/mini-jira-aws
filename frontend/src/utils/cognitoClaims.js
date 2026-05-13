export function parseIdTokenClaims(payload) {
  if (!payload) {
    return { email: null, username: null, role: null, teamId: null, raw: {} };
  }
  const email = payload.email ?? null;
  const username = payload["cognito:username"] ?? payload.sub ?? null;
  const roleRaw = payload["custom:role"] ?? payload.role ?? null;
  const teamId = payload["custom:teamId"] ?? payload.teamId ?? null;
  const role =
    typeof roleRaw === "string" ? roleRaw.trim().toLowerCase() : null;

  return {
    email,
    username,
    role: role || null,
    teamId: teamId ? String(teamId) : null,
    raw: payload,
  };
}
