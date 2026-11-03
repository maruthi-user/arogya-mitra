import { store } from "@layout/store/store";
import { beginProcessing, endProcessing } from "@layout/store/processingSlice";

/**
 * Longest a single operation may hold the page lock. A request that hangs
 * (network gone, server stuck) must never leave the user staring at a
 * blocked page: after this the lock is released with a console warning and
 * the operation's own error handling is left to report whatever happens.
 */
export const PROCESSING_LOCK_TIMEOUT_MS = 60_000;

/**
 * Runs `task` under the global processing lock.
 *
 *   await runWithProcessingLock(() => saveUser(payload).unwrap(), "Saving…");
 *
 * `task` may be a function returning a promise, a promise, or a synchronous
 * function/value (the lock is then released straight away - harmless). The
 * lock is always released in `finally`, so a rejected request unlocks the
 * page and the rejection still reaches the caller's catch / toast.
 *
 * Usable anywhere, including outside React (event handlers, plain utils);
 * inside components prefer the useProcessingLock hook, which also exposes
 * whether the page is currently locked.
 */
export async function runWithProcessingLock(task, label = "Processing…") {
  store.dispatch(beginProcessing(label));

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(watchdog);
    store.dispatch(endProcessing());
  };
  const watchdog = setTimeout(() => {
    console.warn(`[processingLock] "${label}" exceeded ${PROCESSING_LOCK_TIMEOUT_MS / 1000}s - releasing the page lock.`);
    release();
  }, PROCESSING_LOCK_TIMEOUT_MS);

  try {
    return await (typeof task === "function" ? task() : task);
  } finally {
    release();
  }
}
