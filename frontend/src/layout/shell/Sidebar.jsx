import { useState, useEffect } from "react";
import * as Icons from "@layout/ui/icons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSelector } from "react-redux";
import { cn } from "@layout/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@layout/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@layout/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@layout/ui/dropdown-menu";
import { getLayoutConfig } from "@layout/config/registry";
import { useGetPublicAppConfigQuery, isModuleAvailable } from "@layout/store/appConfigApi";
import { useLayout } from "./LayoutContext";

// HRMS look: 40px rows, solid primary pill for the active item.
const itemBase =
  "relative flex w-full items-center gap-3 rounded-md px-3 h-10 text-sm transition-colors";
const itemIdle = "text-muted-foreground hover:bg-muted/50 hover:text-foreground";
const itemActive = "bg-primary text-primary-foreground";

const makeMatcher = (location) => (m) => {
  if (!m.path) return false;
  if (m.exact) return location === m.path;
  return location === m.path || location.startsWith(m.path + "/");
};

const isPhone = () => typeof window !== "undefined" && window.innerWidth < 768;

/**
 * Sidebar for the active application. Items come from `apps[].modules` in
 * apps.json: { id, name, path, icon (lucide name), submodules?: [...] }.
 * Same on every screen size (as in HRMS): a fixed rail that starts collapsed
 * to icons below 1024px and can be expanded with the Collapse/Expand button.
 * On phones, an expanded sidebar overlays the page and folds back to the
 * icon rail when you pick a page.
 */
export function Sidebar() {
  const { activeApp, isSidebarExpanded: expanded, toggleSidebar } = useLayout();
  const brandName = getLayoutConfig().brand.name;
  const user = useSelector((s) => s.auth?.user || null);
  const { canAccessModule } = getLayoutConfig().access;
  const { data: publicConfig } = useGetPublicAppConfigQuery();
  const enabledModules = publicConfig?.modules;

  if (!activeApp) return null;

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 left-0 top-[var(--nav-height)] z-40 flex flex-col border-r border-border bg-card shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-[width] duration-300 ease-in-out",
        expanded ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-collapsed)]"
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border/50",
          expanded ? "justify-start px-4" : "justify-center px-2"
        )}
      >
        {expanded ? (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight">{activeApp.name}</p>
            {/* The brand line only when it adds something: in a generated project
                the app and the brand usually share the display name. */}
            {brandName && brandName.toLowerCase() !== activeApp.name?.toLowerCase() && (
              <p className="truncate text-xs text-muted-foreground">{brandName}</p>
            )}
          </div>
        ) : (
          <div className="flex h-8 min-w-10 items-center justify-center whitespace-nowrap rounded-md bg-primary/10 px-2 text-xs font-bold leading-none tracking-wide text-primary">
            {activeApp.shortName || activeApp.name.slice(0, 3)}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 thin-scrollbar">
        {activeApp.modules
          .filter((m) => canAccessModule(user, m) && isModuleAvailable(m, enabledModules))
          .map((m) => (
            <SidebarItem key={m.id} item={m} expanded={expanded} />
          ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={toggleSidebar}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(itemBase, itemIdle, !expanded && "justify-center px-0")}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {expanded && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({ item, expanded }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { toggleSidebar } = useLayout();
  // On phones the expanded sidebar overlays the page: fold it away after a pick.
  const closeOnPhone = () => {
    if (isPhone()) toggleSidebar();
  };

  const subs = item.submodules || [];
  const hasSubs = subs.length > 0;
  const Icon = Icons[item.icon] || Icons.FileText;
  const target = item.path || subs[0]?.path || "#";

  const matches = makeMatcher(location);
  const isActive = matches(item) || subs.some(matches);

  useEffect(() => {
    if (hasSubs) setIsOpen(subs.some(makeMatcher(location)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const activeBar = null;

  if (!expanded) {
    // Phones: tapping a parent opens its pages in a menu beside the icon.
    if (isPhone() && hasSubs) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label={item.name} className={cn(itemBase, "justify-center px-0", isActive ? itemActive : itemIdle)}>
              <Icon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-44">
            {subs.map((sub) => (
              <DropdownMenuItem key={sub.id} asChild>
                <Link href={sub.path || "#"} className={cn("cursor-pointer", matches(sub) && "font-medium text-primary")}>
                  {sub.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={target}
              aria-label={item.name}
              className={cn(itemBase, "justify-center px-0", isActive ? itemActive : itemIdle)}
            >
              {activeBar}
              <Icon className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="z-50 font-medium">
            {item.name}
            {hasSubs && (
              <div className="mt-1 flex flex-col gap-0.5 border-t border-border/50 pt-1 text-xs">
                {subs.map((sub) => (
                  <Link key={sub.id} href={sub.path || "#"} className={cn("rounded px-2 py-1 hover:text-primary", matches(sub) && "text-primary")}>
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (hasSubs) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className={cn(itemBase, "justify-between", isOpen || isActive ? "bg-primary/5 text-primary" : itemIdle)}>
            {activeBar}
            <span className="flex items-center gap-3 text-xs">
              <Icon className="h-4 w-4" />
              {item.name}
            </span>
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-[1.35rem] mt-0.5 space-y-0.5 border-l border-border pl-2">
            {subs.map((sub) => (
              <Link
                key={sub.id}
                href={sub.path || "#"}
                onClick={closeOnPhone}
                className={cn(
                  "flex h-8 items-center rounded-md px-3 text-sm transition-colors",
                  matches(sub) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Link href={target} onClick={closeOnPhone} className={cn(itemBase, isActive ? itemActive : itemIdle)}>
      {activeBar}
      <Icon className="h-4 w-4" />
      {item.name}
    </Link>
  );
}
