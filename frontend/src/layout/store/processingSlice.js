import { createSlice } from "@reduxjs/toolkit";

/**
 * Application-level "processing lock".
 *
 * While `count > 0` the app is considered busy with a write the user must
 * not interfere with (a form submit, an export, an approve/reject) and
 * ProcessingOverlay blocks interaction with the page - the page, not the
 * browser: tabs, the address bar, devtools and browser shortcuts all keep
 * working, only this document stops taking clicks and keys.
 *
 * A counter rather than a boolean so overlapping operations (an export
 * kicked off while a save is still in flight) release in any order without
 * one of them unlocking the page early. `label` is whatever the most recent
 * operation said it was doing; `since` is when the page first locked, which
 * the overlay's watchdog uses to force-release a lock nobody ended.
 *
 * Nothing dispatches these directly except utils/processingLock.js -
 * callers go through runWithProcessingLock / useProcessingLock so the
 * end is always paired with the begin (finally), even when the work throws.
 */
const initialState = {
  count: 0,
  label: "",
  since: null,
};

const processingSlice = createSlice({
  name: "processing",
  initialState,
  reducers: {
    beginProcessing(state, action) {
      state.count += 1;
      state.label = action.payload || state.label || "Processing…";
      if (state.since == null) state.since = Date.now();
    },
    endProcessing(state) {
      state.count = Math.max(0, state.count - 1);
      if (state.count === 0) {
        state.label = "";
        state.since = null;
      }
    },
    /** Watchdog / recovery only: drops every outstanding lock at once. */
    resetProcessing() {
      return initialState;
    },
  },
});

export const { beginProcessing, endProcessing, resetProcessing } = processingSlice.actions;

export const selectIsProcessing = (state) => state.processing.count > 0;
export const selectProcessingLabel = (state) => state.processing.label;
export const selectProcessingSince = (state) => state.processing.since;

export default processingSlice.reducer;
