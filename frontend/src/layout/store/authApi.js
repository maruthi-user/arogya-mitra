import { getLayoutConfig } from "@layout/config/registry";
import { apiSlice } from "./apiSlice";

// Endpoint URLs come from `auth.*` in app.config.js, so a new app only changes
// config to point at its own backend.
const url = (key) => getLayoutConfig().auth[key];

const withSessions = apiSlice.enhanceEndpoints({ addTagTypes: ["Sessions"] });

export const authApi = withSessions.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: url("loginUrl"), method: "POST", body }),
    }),
    logout: builder.mutation({
      query: () => ({ url: url("logoutUrl"), method: "POST" }),
    }),
    getMe: builder.query({
      query: () => url("profileUrl"),
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({ url: url("forgotPasswordUrl"), method: "POST", body }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: url("resetPasswordUrl"), method: "POST", body }),
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: url("changePasswordUrl"), method: "POST", body }),
      invalidatesTags: ["Sessions"],
    }),
    // Signed-in devices of the current user: [{ id, ipAddress, userAgent,
    // createdAt, lastSeenAt, expiresAt, current }]
    getSessions: builder.query({
      query: () => url("sessionsUrl"),
      providesTags: ["Sessions"],
    }),
    revokeSession: builder.mutation({
      query: (id) => ({ url: `${url("sessionsUrl")}/${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: ["Sessions"],
    }),
    revokeOtherSessions: builder.mutation({
      query: () => ({ url: `${url("sessionsUrl")}/revoke-others`, method: "POST" }),
      invalidatesTags: ["Sessions"],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useLazyGetMeQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
} = authApi;
