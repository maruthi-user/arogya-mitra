import { useSyncExternalStore } from "react";

/** Live `matchMedia` result, e.g. useMediaQuery("(max-width: 767px)"). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** True below the `md` breakpoint (768px): the sidebar becomes a drawer. */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
