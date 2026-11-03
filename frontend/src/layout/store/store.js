import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import authReducer from "./authSlice";
import processingReducer from "./processingSlice";

const layoutReducers = {
  auth: authReducer,
  // Global "processing lock": form submits / exports block the page while they
  // run (see processingSlice + feedback/ProcessingOverlay).
  processing: processingReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
};

let extraReducers = {};

export const store = configureStore({
  reducer: combineReducers(layoutReducers),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

/**
 * Register the application's own slices:
 *   registerReducers({ items: itemsReducer })
 * Call it at start-up (src/app/configure.js) before rendering.
 */
export function registerReducers(reducers) {
  extraReducers = { ...extraReducers, ...reducers };
  store.replaceReducer(combineReducers({ ...layoutReducers, ...extraReducers }));
}
