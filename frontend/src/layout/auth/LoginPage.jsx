import { useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "wouter";
import { getLayoutConfig } from "@layout/config/registry";
import { useLoginMutation, useLazyGetMeQuery } from "@layout/store/authApi";
import { setUserData, setPermissions } from "@layout/store/authSlice";
import { apiSlice } from "@layout/store/apiSlice";
import useLoginApp from "./useLoginApp";
import LoginScreen from "./LoginScreen";

/**
 * Login route. Owns the sign-in flow (login call -> profile fetch -> store ->
 * redirect); the look comes from <LoginScreen>.
 *
 * Backend contract (override in app.config.js -> auth):
 *   POST auth.loginUrl   { [identifierField]: id, password }
 *     -> sets the httpOnly token cookies; body { user?, permissions? }
 *   GET  auth.profileUrl (only called when login didn't already return `user`)
 *     -> profile, or { user, permissions }
 *   auth.mapUser(profile)  ->  user kept in the store
 * Both a flat profile and a `{ user, permissions }` wrapper (the app-template
 * backend's shape) are accepted from either call.
 * With `auth.demo: true` no request is made and any credentials work.
 */
export default function LoginPage() {
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const loginApp = useLoginApp();
  const [login] = useLoginMutation();
  const [getMe] = useLazyGetMeQuery();

  const [apiError, setApiError] = useState("");
  // Covers the whole flow so the UI stays busy until the route changes.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async ({ identifier, password }) => {
    const { auth, paths } = getLayoutConfig();
    setApiError("");
    setIsSubmitting(true);

    try {
      let profile;
      let permissions = [];
      if (auth.demo) {
        profile = {
          id: 1,
          fullName: identifier || "Demo User",
          email: `${identifier || "demo"}@example.com`,
          role: "ADMIN",
        };
        permissions = ["*"];
      } else {
        // The tokens arrive as httpOnly cookies; nothing to store here.
        const res = await login({ [auth.identifierField]: identifier, password }).unwrap();

        // The app-template backend already returns the profile + permissions
        // with the login response; only hit /me when it didn't.
        let data = res.user ? res : await getMe().unwrap();
        profile = data.user ?? data;
        permissions = data.permissions ?? [];

        if (!profile) {
          setApiError("Failed to load user profile. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      dispatch(setUserData(auth.mapUser(profile)));
      dispatch(setPermissions(permissions));
      dispatch(apiSlice.util.resetApiState());
      // isSubmitting stays true: the loader covers the form until unmount.
      navigate(loginApp.redirectTo || paths.afterLogin);
    } catch (error) {
      const detail = error?.data?.message || error?.data;
      setApiError(
        typeof detail === "string" && detail.trim() ? detail : "Invalid ID or password"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <LoginScreen
      app={loginApp}
      onSubmit={handleLogin}
      isSubmitting={isSubmitting}
      error={apiError}
    />
  );
}
