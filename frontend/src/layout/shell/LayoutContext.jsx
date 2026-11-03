import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useSelector } from "react-redux";
import { getLayoutConfig } from "@layout/config/registry";

const LayoutContext = createContext(undefined);

const findAppById = (appId) =>
  getLayoutConfig().apps.find((app) => app.id === appId) || null;

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode etc. */
  }
};

/**
 * Holds the shell state: theme, active application (drives the sidebar) and
 * sidebar expanded/collapsed. The application catalogue comes from `apps` in
 * app.config.js.
 */
export function LayoutProvider({ children }) {
  const [location] = useLocation();
  const apps = getLayoutConfig().apps;

  // ---- theme
  const [theme, setTheme] = useState(() => safeGet("theme") || "light");
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    safeSet("theme", theme);
  }, [theme]);
  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
    []
  );

  // ---- active application (restored after a refresh)
  const userId = useSelector((s) => s.auth?.user?.id ?? s.auth?.user?.userId ?? null);
  const [activeAppId, setActiveAppId] = useState(() => {
    const saved = safeGet("activeAppId");
    return saved && findAppById(saved) ? saved : null;
  });
  const activeApp = useMemo(() => findAppById(activeAppId), [activeAppId]);

  const persistActiveApp = useCallback(
    (appId) => {
      safeSet("activeAppId", appId);
      if (userId) safeSet("activeAppOwner", String(userId));
    },
    [userId]
  );

  // A different user logging in must not inherit the previous user's module.
  useEffect(() => {
    if (!userId) return;
    const owner = safeGet("activeAppOwner");
    if (owner && owner !== String(userId)) {
      try {
        localStorage.removeItem("activeAppId");
      } catch {
        /* ignore */
      }
      setActiveAppId(null);
    }
    safeSet("activeAppOwner", String(userId));
  }, [userId]);

  const setActiveApp = useCallback(
    (appId) => {
      if (!findAppById(appId)) return;
      setActiveAppId(appId);
      persistActiveApp(appId);
    },
    [persistActiveApp]
  );

  // Follow the URL: opening any module path activates its application.
  useEffect(() => {
    const matched = apps.find((app) =>
      app.modules?.some((m) => m.path && location.startsWith(m.path))
    );
    if (matched && matched.id !== activeAppId) {
      setActiveAppId(matched.id);
      persistActiveApp(matched.id);
    }
  }, [location, activeAppId, apps, persistActiveApp]);

  // ---- sidebar
  const isMobileViewport = () => typeof window !== "undefined" && window.innerWidth < 1024;
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => !isMobileViewport());
  const toggleSidebar = useCallback(() => setIsSidebarExpanded((p) => !p), []);

  useEffect(() => {
    let wasMobile = isMobileViewport();
    const onResize = () => {
      const nowMobile = isMobileViewport();
      if (nowMobile !== wasMobile) {
        setIsSidebarExpanded(!nowMobile);
        wasMobile = nowMobile;
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---- mobile navigation drawer (sidebar slides over the page below md)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  useEffect(() => setIsMobileNavOpen(false), [location]);

  // ---- command palette (Ctrl/Cmd + K)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // ---- keyboard: Ctrl/Cmd + K toggles the search
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = {
    theme,
    toggleTheme,
    activeAppId,
    activeApp,
    setActiveApp,
    isSidebarExpanded,
    toggleSidebar,
    setSidebarExpanded: setIsSidebarExpanded,
    isMobileNavOpen,
    openMobileNav,
    closeMobileNav,
    isSearchOpen,
    openSearch,
    closeSearch,
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (ctx === undefined) throw new Error("useLayout must be used within a LayoutProvider");
  return ctx;
}
