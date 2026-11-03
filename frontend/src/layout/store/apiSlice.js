import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getLayoutConfig } from "@layout/config/registry";
import { isPublicPath } from "@layout/utils/publicPaths";
import { expireSession } from "./authSlice";

/**
 * One shared RTK Query API for the whole app.
 *
 * Add your own endpoints from a feature folder with `injectEndpoints`:
 *
 *   export const itemsApi = apiSlice.injectEndpoints({
 *     endpoints: (b) => ({ getItems: b.query({ query: () => "/api/items", providesTags: ["Items"] }) }),
 *   });
 *
 * and declare cache tags with apiSlice.enhanceEndpoints({ addTagTypes: ["Items"] }).
 *
 * Base URL: `api.baseUrl` in app.config.js, falling back to VITE_API_BASE_URL.
 *
 * Auth: the backend keeps the tokens in httpOnly cookies, so every request
 * goes out with `credentials: "include"` and the CSRF token (the readable
 * XSRF-TOKEN cookie) copied into the X-XSRF-TOKEN header. A 401 triggers one
 * call to auth.refreshUrl and the request is retried; only when that fails is
 * the session cleared.
 */
const readCookie = (name) => {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

const rawBaseQuery = (args, api, extra) =>
  fetchBaseQuery({
    baseUrl: getLayoutConfig().api.baseUrl || import.meta.env.VITE_API_BASE_URL || "",
    credentials: "include",
    prepareHeaders: (headers) => {
      const xsrf = readCookie("XSRF-TOKEN");
      if (xsrf) headers.set("X-XSRF-TOKEN", xsrf);
      return headers;
    },
  })(args, api, extra);

// File-download endpoints read failures as a Blob; turn the error body back
// into JSON so screens can show `error.data.message`.
const readableErrorData = async (data) => {
  if (!(data instanceof Blob)) return data;
  try {
    const text = await data.text();
    try {
      return JSON.parse(text);
    } catch {
      return text ? { message: text } : data;
    }
  } catch {
    return data;
  }
};

// Endpoints that must never trigger a refresh (they are the auth flow itself).
const NO_REFRESH = new Set(["login", "refresh", "logout", "forgotPassword", "resetPassword"]);

// One refresh at a time: requests that fail together wait for the same call.
let refreshing = null;
const refreshSession = (api, extraOptions) => {
  if (!refreshing) {
    refreshing = rawBaseQuery(
      { url: getLayoutConfig().auth.refreshUrl, method: "POST" },
      api,
      extraOptions
    ).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
};

const baseQueryWithRefresh = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !NO_REFRESH.has(api.endpoint) && !getLayoutConfig().auth.demo) {
    const refreshed = await refreshSession(api, extraOptions);
    if (!refreshed.error) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else if (!isPublicPath(window.location.pathname)) {
      // Refresh token expired or revoked: AuthExpiryWatcher shows the modal
      // and redirects to login.
      api.dispatch(expireSession());
    }
  }

  if (result.error) {
    result.error = { ...result.error, data: await readableErrorData(result.error.data) };
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: [],
  endpoints: () => ({}),
});
