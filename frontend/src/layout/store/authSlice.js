import { createSlice } from "@reduxjs/toolkit";

// The access and refresh tokens are httpOnly cookies set by the backend: this
// code never sees them, so an XSS bug cannot steal them. What is kept here (and
// in localStorage, to survive a reload) is only the profile and permissions;
// "signed in" means a user is present. If the cookies have gone, the first API
// call answers 401, the refresh fails and the session-expired modal shows.
const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode) - the session still works until reload.
  }
};

// Tokens from before the cookie change must not linger in storage.
try {
  localStorage.removeItem("token");
  localStorage.removeItem("expiresIn");
} catch {
  // ignore
}

const initialState = {
  user: read("user"),
  // Permission keys for the signed-in user's role (e.g. "users.view",
  // "audit.view", or "*" for everything) - as returned by the backend's
  // login/me endpoints. Empty until the backend provides them (e.g. demo mode).
  permissions: read("permissions") || [],
  // True only when the session was cleared automatically (refresh failed or a
  // 401 from the API) — drives the "session expired" modal. A manual
  // logout() never sets this, so the modal doesn't show on a deliberate logout.
  sessionExpired: false,
};

const clear = (state) => {
  state.user = null;
  state.permissions = [];
  write("user", null);
  write("permissions", null);
  write("formattedUser", null);
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.user = action.payload;
      state.sessionExpired = false;
      write("user", action.payload);
    },
    setPermissions: (state, action) => {
      state.permissions = action.payload || [];
      write("permissions", state.permissions);
    },
    logout: (state) => {
      clear(state);
      state.sessionExpired = false;
    },
    expireSession: (state) => {
      clear(state);
      state.sessionExpired = true;
    },
  },
});

export const { setUserData, setPermissions, logout, expireSession } = authSlice.actions;
export default authSlice.reducer;
