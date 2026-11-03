import { Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { Loader as Spinner } from "lucide-react";
import { Toaster } from "@layout/ui/toaster";
import { TooltipProvider } from "@layout/ui/tooltip";
import SvgComponent from "@layout/ui/SvgComponent";
import AuthExpiryWatcher from "@layout/feedback/AuthExpiryWatcher";
import ProcessingOverlay from "@layout/feedback/ProcessingOverlay";
import LoginPage from "@layout/auth/LoginPage";
import ForgotPassword from "@layout/auth/ForgotPassword";
import RestorePassword from "@layout/auth/RestorePassword";
import { isPublicPath } from "@layout/utils/publicPaths";
import { LayoutProvider } from "./LayoutContext";
import { AppShell } from "./AppShell";
import ProtectedRoute from "./ProtectedRoute";
import NotFound from "./NotFound";
import ManageAccount from "@layout/account/ManageAccount";
import { getLayoutConfig } from "@layout/config/registry";

const PublicFallback = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background">
    <div className="w-52 max-w-full px-6">
      <SvgComponent className="h-auto w-full" />
    </div>
    <Spinner className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const AppFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Spinner className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/**
 * Everything around your pages, in one component:
 *  - public routes (login, forgot/restore password + any `publicRoutes`)
 *  - authenticated routes (`children`) inside the shell: navbar, sidebar,
 *    9-dot launcher; redirects to login when signed out
 *  - toasts, session-expiry watcher, global processing overlay
 *
 * Usage (src/app/App.jsx):
 *   <LayoutRoot publicRoutes={<Route path="/auth/register" component={Register} />}>
 *     <Route path="/app/items" component={Items} />
 *   </LayoutRoot>
 */
export default function LayoutRoot({ publicRoutes = null, children }) {
  const [location] = useLocation();

  return (
    <LayoutProvider>
      <TooltipProvider>
        {isPublicPath(location) ? (
          <Suspense fallback={<PublicFallback />}>
            <Switch>
              <Route path="/">
                <Redirect to="/auth/login" />
              </Route>
              <Route path="/auth/login" component={LoginPage} />
              <Route path="/auth/forgot-password" component={ForgotPassword} />
              <Route path="/auth/restore-password" component={RestorePassword} />
              {publicRoutes}
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        ) : (
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<AppFallback />}>
                <Switch>
                  {/* Built in: Manage Account lives at paths.profile */}
                  <Route path={getLayoutConfig().paths.profile} component={ManageAccount} />
                  {children}
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        )}
        <AuthExpiryWatcher />
        <Toaster />
        <ProcessingOverlay />
      </TooltipProvider>
    </LayoutProvider>
  );
}
