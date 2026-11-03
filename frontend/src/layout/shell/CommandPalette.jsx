import { useEffect, useMemo, useState } from "react";
import * as Icons from "@layout/ui/icons";
import { CornerDownLeft, Search } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useLocation } from "wouter";
import { useSelector } from "react-redux";
import { cn } from "@layout/lib/utils";
import { getLayoutConfig } from "@layout/config/registry";
import { useGetPublicAppConfigQuery, isModuleAvailable } from "@layout/store/appConfigApi";
import { Dialog, DialogContent, DialogTitle } from "@layout/ui/dialog";
import { useLayout } from "./LayoutContext";

/**
 * Quick search (Ctrl/Cmd + K): jump to any page you can access. Items are
 * built from `apps` and filtered by `access`.
 */
export function CommandPalette() {
  const { isSearchOpen, closeSearch, setActiveApp } = useLayout();
  const [, navigate] = useLocation();
  const user = useSelector((s) => s.auth?.user || null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const { data: publicConfig } = useGetPublicAppConfigQuery();
  const enabledModules = publicConfig?.modules;

  const items = useMemo(() => {
    const { apps, access } = getLayoutConfig();
    const out = [];
    for (const app of apps) {
      if (!access.canAccessApp(user, app)) continue;
      for (const m of app.modules || []) {
        if (!access.canAccessModule(user, m) || !isModuleAvailable(m, enabledModules)) continue;
        const targets = m.submodules?.length ? m.submodules.map((s) => ({ ...s, icon: m.icon, parent: m.name })) : [m];
        for (const t of targets) {
          if (!t.path) continue;
          out.push({
            id: `${app.id}-${t.id}`,
            label: t.parent ? `${t.parent} / ${t.name}` : t.name,
            hint: app.name,
            icon: t.icon || m.icon || "FileText",
            run: () => {
              setActiveApp(app.id);
              navigate(t.path);
            },
          });
        }
      }
    }
    return out;
  }, [user, navigate, setActiveApp, enabledModules]);

  const results = items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(query.trim().toLowerCase()));

  const choose = (item) => {
    closeSearch();
    item?.run();
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    setQuery("");
    setSelected(0);
  }, [isSearchOpen]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((p) => Math.min(p + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[selected]);
    }
  };

  return (
    <Dialog open={isSearchOpen} onOpenChange={(o) => !o && closeSearch()}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <VisuallyHidden.Root>
          <DialogTitle>Search</DialogTitle>
        </VisuallyHidden.Root>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages"
            aria-label="Search pages"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.map((item, i) => {
            const Icon = Icons[item.icon] || Icons.FileText;
            return (
              <li key={item.id} role="option" aria-selected={i === selected}>
                <button
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                    i === selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.hint}</span>
                  {i === selected && <CornerDownLeft className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">No matches for "{query}"</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
