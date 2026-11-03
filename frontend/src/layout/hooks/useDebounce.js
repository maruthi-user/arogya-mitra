import { useEffect, useState } from "react";

// Returns `value`, updated only after it stops changing for `delay` ms.
// Typical use: debounce a search box before it drives a server query.
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
