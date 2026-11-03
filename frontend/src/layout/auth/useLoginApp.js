import { useMemo } from "react";
import { useSearch } from "wouter";
import { getAppIdFromSearch, resolveLoginApp } from "@layout/utils/loginApp";

/**
 * The login-app config for the current `?app=` param (see utils/loginApp.js).
 * Re-resolved when the query string changes, so the branding follows
 * redirects without a full reload.
 */
export default function useLoginApp() {
  const search = useSearch();
  return useMemo(() => resolveLoginApp(getAppIdFromSearch(search)), [search]);
}
