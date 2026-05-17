/* eslint-disable react-refresh/only-export-components -- React context + provider in one module */
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";
import { configureAmplify, isAuthConfigured } from "../config/amplify.js";
import { parseIdTokenClaims } from "../utils/cognitoClaims.js";

export const AuthContext = createContext(null);

async function loadSessionProfile() {
  const session = await fetchAuthSession();
  const payload = session.tokens?.idToken?.payload ?? null;
  const claims = parseIdTokenClaims(payload);
  return { session, claims };
}

export function AuthProvider({ children }) {
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [authError, setAuthError] = useState(null);

  const refreshSession = useCallback(async () => {
    if (!isAuthConfigured()) {
      setUser(null);
      setClaims(null);
      return;
    }
    try {
      const current = await getCurrentUser();
      const { claims: nextClaims } = await loadSessionProfile();
      setUser(current);
      setClaims(nextClaims);
      setAuthError(null);
    } catch {
      // Fallback: getCurrentUser() can fail immediately after signIn() due to
      // Amplify v6 async storage timing. If we still have valid tokens, use them.
      try {
        const session = await fetchAuthSession();
        const payload = session.tokens?.idToken?.payload ?? null;
        if (payload) {
          const nextClaims = parseIdTokenClaims(payload);
          setUser({ userId: payload.sub, username: nextClaims.username || nextClaims.email });
          setClaims(nextClaims);
          setAuthError(null);
          return;
        }
      } catch {
        // Session is genuinely gone — fall through to signed-out state
      }
      setUser(null);
      setClaims(null);
    }
  }, []);

  useEffect(() => {
    configureAmplify();
    let cancelled = false;
    (async () => {
      await refreshSession();
      if (!cancelled) setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const signInEmailPassword = useCallback(
    async (email, password) => {
      if (!isAuthConfigured()) {
        const err = new Error(
          "Cognito is not configured. Add VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID to frontend/.env (from Member 5)."
        );
        err.code = "AuthNotConfigured";
        throw err;
      }
      const result = await signIn({
        username: email.trim(),
        password,
      });
      // Amplify returns isSignedIn:false when Cognito requires an extra step
      // (e.g. FORCE_CHANGE_PASSWORD on admin-created accounts). Surface it so
      // the catch in LoginPage can show a useful message instead of a silent failure.
      if (!result.isSignedIn) {
        const step = result.nextStep?.signInStep ?? "UNKNOWN";
        const err = new Error(
          step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
            ? "Your account has a temporary password. Ask your administrator to reset it in Cognito, or re-register through the sign-up page."
            : `Sign-in requires an additional step: ${step}`
        );
        err.code = step;
        throw err;
      }
      await refreshSession();
    },
    [refreshSession]
  );

  const register = useCallback(
    async ({ email, password, role, teamId }) => {
      if (!isAuthConfigured()) {
        const err = new Error(
          "Cognito is not configured. Add pool and client IDs to frontend/.env."
        );
        err.code = "AuthNotConfigured";
        throw err;
      }
      const attrs = { email: email.trim() };
      if (role) attrs["custom:role"] = role.trim().toLowerCase();
      if (teamId) attrs["custom:teamId"] = String(teamId).trim();

      const result = await signUp({
        username: email.trim(),
        password,
        options: { userAttributes: attrs },
      });
      return result;
    },
    []
  );

  const confirmRegistration = useCallback(async (email, code) => {
    await confirmSignUp({ username: email.trim(), confirmationCode: code });
  }, []);

  const sendVerificationAgain = useCallback(async (email) => {
    await resendSignUpCode({ username: email.trim() });
  }, []);

  const logOut = useCallback(async () => {
    if (!isAuthConfigured()) {
      setUser(null);
      setClaims(null);
      return;
    }
    try {
      await signOut();
    } finally {
      setUser(null);
      setClaims(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      initialized,
      user,
      claims,
      authError,
      setAuthError,
      isConfigured: isAuthConfigured(),
      refreshSession,
      signInEmailPassword,
      register,
      confirmRegistration,
      sendVerificationAgain,
      logOut,
    }),
    [
      initialized,
      user,
      claims,
      authError,
      refreshSession,
      signInEmailPassword,
      register,
      confirmRegistration,
      sendVerificationAgain,
      logOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
