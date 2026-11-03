import {useState} from "react";
import {useToast} from "@layout/hooks/use-toast";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "wouter";
import { ChevronDown, HelpCircle, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@layout/lib/utils";
import { formatStatus } from "@layout/utils/formatStatus";
import { buildLoginPath } from "@layout/utils/loginApp";
import { logout } from "@layout/store/authSlice";
import { apiSlice } from "@layout/store/apiSlice";
import { useLogoutMutation } from "@layout/store/authApi";
import { getLayoutConfig } from "@layout/config/registry";
import SvgComponent from "@layout/ui/SvgComponent";
import { Button } from "@layout/ui/button";
import { Avatar, AvatarFallback } from "@layout/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@layout/ui/dropdown-menu";
import { useLayout } from "./LayoutContext";

const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

const iconBtn = "h-9 w-9 text-muted-foreground hover:text-foreground";

/**
 * Top navbar. Left: logo (home link). Right: notifications, any
 * `navbar.renderActions(user)` your app supplies, theme toggle, user menu.
 * Notifications: set `navbar.notifications` to an array of
 * { id, title, description?, time?, href? } (or a function (user) => array).
 */
export function TopNav() {
  const { theme, toggleTheme, activeApp } = useLayout();
  const user = useSelector((s) => s.auth?.user || null);
  const dispatch = useDispatch();
  const [, navigate] = useLocation();
  const { brand, paths, navbar, profileMenu } = getLayoutConfig();

  const notifications =
    (typeof navbar.notifications === "function" ? navbar.notifications(user) : navbar.notifications) || [];

  const [logoutRequest] = useLogoutMutation();
  const [signingOut,setSigningOut]=useState(false);
  const {toast}=useToast();

  const handleLogout = async () => {
    if(signingOut)return;setSigningOut(true);
    const appId = activeApp?.id;
    // Ends the session on the server and clears the cookies; the local
    // sign-out does not wait for it.
    if (!getLayoutConfig().auth.demo) {try {await logoutRequest().unwrap();}catch{setSigningOut(false);toast({title:getLayoutConfig().auth.messages?.logoutFailed||'Could not sign out. Please try again.',variant:'destructive'});return;}}
    await getLayoutConfig().auth.onLogout?.();
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    navigate(paths.login||buildLoginPath(appId));setSigningOut(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[var(--nav-height)] items-center justify-between gap-2 border-b border-border bg-[var(--background-white)] pl-4 pr-2 backdrop-blur-md sm:pr-4 lg:pr-6">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        {/* 44px tall in the 64px bar (36px on phones): sized by height so it keeps
            10px clear space above and below; pl-4 lines it up with the sidebar. */}
        <button
          onClick={() => navigate(paths.home)}
          aria-label={`${brand.name} home`}
          className="flex shrink-0 items-center rounded-md text-gray-800 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-white"
        >
          <SvgComponent className="h-9 w-auto object-contain sm:h-11" />
        </button>
      </div>

      {/* Navbar search - disabled. Re-enable by uncommenting (also restore the
          Search import and openSearch above). The Ctrl/Cmd + K palette in
          CommandPalette.jsx is still mounted and works without it.
      <div className="mx-auto hidden w-full max-w-md md:block">
        <button
          onClick={openSearch}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search pages and apps</span>
          <kbd className="rounded border border-border bg-background px-1.5 text-xs font-medium">Ctrl K</kbd>
        </button>
      </div>
      */}

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Mobile search button - disabled
        <Button variant="ghost" size="icon" onClick={openSearch} className={cn(iconBtn, "md:hidden")} aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>
        */}

        {user && navbar.renderActions ? navbar.renderActions(user) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* <Button variant="ghost" size="icon" className={cn(iconBtn, "relative")} aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </Button> */}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <DropdownMenuLabel className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</DropdownMenuLabel>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">You are all caught up.</div>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem key={n.id} onClick={() => n.href && navigate(n.href)} className="flex-col items-start gap-0.5 px-4 py-3">
                  <span className="text-sm font-medium">{n.title}</span>
                  {n.description && <span className="text-xs text-muted-foreground">{n.description}</span>}
                  {n.time && <span className="text-xs text-muted-foreground">{n.time}</span>}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {navbar.helpPath && (
          <Button variant="ghost" size="icon" onClick={() => navigate(navbar.helpPath)} className={cn(iconBtn, "hidden md:flex")} aria-label="Help">
            <HelpCircle className="h-5 w-5" />
          </Button>
        )}

        <Button variant="ghost" size="icon" onClick={toggleTheme} className={cn(iconBtn, "mr-2 hidden sm:flex")} aria-label="Toggle theme">
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-full pl-2 pr-1 hover:bg-muted/50 sm:rounded-lg" aria-label="Account menu">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                  {getInitials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden flex-col items-start text-left text-xs md:flex">
                <span className="font-medium">{user?.fullName}</span>
                <span className="text-muted-foreground">{formatStatus(user?.role)}</span>
              </span>
              <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 p-2">
            <div className="mb-1 flex items-center gap-3 border-b border-border p-2 pb-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-semibold text-white">
                  {getInitials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" className="mb-2 mt-1 h-8 w-full justify-center text-xs" onClick={() => navigate(paths.profile)}>
              Manage Account
            </Button>
            {profileMenu.map((item) => (
              <DropdownMenuItem key={item.path} className="cursor-pointer" onClick={() => navigate(item.path)}>
                {item.label}
              </DropdownMenuItem>
            ))}
            {navbar.helpPath && (
              <DropdownMenuItem className="cursor-pointer md:hidden" onClick={() => navigate(navbar.helpPath)}>
                <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">Help</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer sm:hidden" onClick={toggleTheme}>
              {theme === "light" ? <Sun className="mr-2 h-4 w-4 text-muted-foreground" /> : <Moon className="mr-2 h-4 w-4 text-muted-foreground" />}
              <span className="flex-1">Dark Mode</span>
              <span className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200", theme === "dark" ? "bg-primary" : "bg-input")}>
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200", theme === "dark" ? "translate-x-4" : "translate-x-0.5")} />
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/20"
              disabled={signingOut} onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
            <p className="pb-1 pt-2 text-center text-xs text-muted-foreground/60">v{brand.version}</p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
