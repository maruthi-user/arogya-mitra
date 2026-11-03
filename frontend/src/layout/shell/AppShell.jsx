import React from "react";
import { cn } from "@layout/lib/utils";
import { useLayout } from "./LayoutContext";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";

/**
 * The authenticated chrome: navbar, sidebar (an icon rail on phones),
 * the content area, plus the quick-search dialog. The sidebar is hidden
 * until the URL matches one of the active app's own module paths (e.g. the
 * instant between landing on `paths.home` and its redirect resolving).
 */
export const AppShell = React.memo(function AppShell({ children, chromeEnabled = true, workspaceRole }) {
  const { activeAppId, isSidebarExpanded } = useLayout();
  const hasSidebar = chromeEnabled && !!activeAppId;

  return (
    <div data-workspace-role={workspaceRole} className="min-h-screen bg-[var(--background-white)] text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:shadow-[var(--shadow-pop)]"
      >
        Skip to content
      </a>
      {chromeEnabled && <TopNav />}
      {hasSidebar && <Sidebar />}

      <main
        id="main"
        className={cn(
          "min-h-screen transition-[margin] duration-200 ease-out",
          chromeEnabled && "pt-[var(--nav-height)]",
          // Phones: content always sits beside the icon rail; an expanded sidebar overlays it.
          hasSidebar && (isSidebarExpanded ? "ml-[var(--sidebar-collapsed)] sm:ml-[var(--sidebar-width)]" : "ml-[var(--sidebar-collapsed)]")
        )}
      >
        {children}
      </main>

      {chromeEnabled && <CommandPalette />}
    </div>
  );
});
