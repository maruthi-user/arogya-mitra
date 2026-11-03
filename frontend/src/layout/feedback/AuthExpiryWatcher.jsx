import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "wouter";
import { Clock } from "lucide-react";
import { logout } from "@layout/store/authSlice";
import { useLazyGetMeQuery } from "@layout/store/authApi";
import { getLayoutConfig } from "@layout/config/registry";
import { isPublicPath } from "@layout/utils/publicPaths";
import { buildLoginPath } from "@layout/utils/loginApp";

const REDIRECT_COUNTDOWN_SECONDS = 3;

// Unmounted/remounted by the parent whenever `sessionExpired` flips, so each
// occurrence starts its own fresh countdown.
function SessionExpiredModal({ onFinished }) {
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onFinished();
      return;
    }
    const timeoutId = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [secondsLeft, onFinished]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40">
          <Clock className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-[#3c3c3c] dark:text-gray-100">
          Your session has expired
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Please log in again to continue. You&rsquo;ll be redirected to the
          login page in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}.
        </p>
      </div>
    </div>,
    document.body
  );
}

// Mounted once, globally: when the session ends on its own (the refresh token
// expired or was revoked - see apiSlice.js) it shows a "session expired" modal
// and redirects to the login page after a short countdown. The access token
// itself is renewed silently, so its 15-minute expiry never shows here.
export default function AuthExpiryWatcher() {
  const sessionExpired = useSelector((state) => state.auth?.sessionExpired);
  const hasUser = useSelector((state) => Boolean(state.auth?.user));
  const dispatch = useDispatch();
  const [, navigate] = useLocation();
  const [checkSession] = useLazyGetMeQuery();

  // On page load a user may be remembered from localStorage while the
  // cookies have expired: one /me call either succeeds (after a silent
  // refresh) or ends the session, instead of waiting for the first API call.
  useEffect(() => {
    if (hasUser && !getLayoutConfig().auth.demo && !isPublicPath(window.location.pathname)) {
      checkSession();
    }
    // Only once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sessionExpired || isPublicPath(window.location.pathname)) return null;

  const handleFinished = () => {
    // Carries the app the session expired in, so the branded login screen
    // comes back after the redirect.
    let activeAppId = null;
    try {
      activeAppId = localStorage.getItem("activeAppId");
    } catch {
      // Storage unavailable - fall back to the default app's login screen.
    }
    navigate(buildLoginPath(activeAppId), { replace: true });
    // Clears sessionExpired so this modal disappears once the redirect lands.
    dispatch(logout());
  };

  return <SessionExpiredModal onFinished={handleFinished} />;
}
