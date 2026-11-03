import { useCallback } from "react";
import { useSelector } from "react-redux";
import { selectIsProcessing, selectProcessingLabel } from "@layout/store/processingSlice";
import { runWithProcessingLock } from "@layout/utils/processingLock";

/**
 * Component-side access to the global processing lock.
 *
 *   const { run, isProcessing } = useProcessingLock();
 *   const onSubmit = (data) => run(() => saveUser(data).unwrap(), "Saving user…");
 *
 * `run` locks the whole page (see ProcessingOverlay) until the returned
 * promise settles; `isProcessing` lets a component reflect the lock itself
 * (a disabled button, a spinner in the header) if it wants to.
 */
export function useProcessingLock() {
  const isProcessing = useSelector(selectIsProcessing);
  const label = useSelector(selectProcessingLabel);
  const run = useCallback((task, taskLabel) => runWithProcessingLock(task, taskLabel), []);
  return { run, isProcessing, label };
}

export default useProcessingLock;
