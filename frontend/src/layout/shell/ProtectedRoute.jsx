import { Redirect } from "wouter";
import { useSelector } from "react-redux";
import { getLayoutConfig } from "@layout/config/registry";

/**
 * Gate for authenticated routes.
 *   <ProtectedRoute>…</ProtectedRoute>                       signed-in users only
 *   <ProtectedRoute allow={(user) => user.isAdmin}>…         extra check
 */
export default function ProtectedRoute({ children, allow, redirectTo }) {
  // Signed in = a user in the store. The tokens are httpOnly cookies; if they
  // have expired, the first API call refreshes them or expires the session.
  const user = useSelector((s) => s.auth?.user);
  const { paths } = getLayoutConfig();

  if (!user) return <Redirect to={paths.login} />;
  if (allow && !allow(user)) return <Redirect to={redirectTo || paths.home} />;
  return children;
}
