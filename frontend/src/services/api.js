import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify, isAuthConfigured } from "../config/amplify.js";

configureAmplify();

// Sends the Cognito ID token (has `aud` = app client id). Member 4's middleware verifies it with JWKS.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  if (isAuthConfigured()) {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      const token =
        idToken && typeof idToken.toString === "function"
          ? idToken.toString()
          : undefined;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Unauthenticated or session expired; request proceeds without bearer.
    }
  } else {
    const legacy = localStorage.getItem("token");
    if (legacy) {
      config.headers.Authorization = `Bearer ${legacy}`;
    }
  }
  return config;
});

export default api;
