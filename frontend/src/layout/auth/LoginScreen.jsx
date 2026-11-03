import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  ArrowUp, // Caps Lock hint icon
  Eye,
  EyeOff,
  Loader,
  Lock,
  User,
} from "lucide-react";
import SvgComponent from "@layout/ui/SvgComponent";
import { withLoginAppParam } from "@layout/utils/loginApp";
import AuthShell, {
  AuthHeading,
  authAlertClass,
  authButtonClass,
  authFieldErrorClass,
  authFieldIconSize,
  authIconClass,
  authInputClass,
  authLabelClass,
  authToggleClass,
} from "./AuthShell";

/**
 * App-agnostic login screen (brand poster + form), driven entirely by the
 * object returned from `resolveLoginApp()` in `utils/loginApp.js`.
 *
 * Reuse in another application: copy this file, `AuthShell.jsx`,
 * `LoginBrandPanel.jsx`, `LoginIllustration.jsx`, `CompanyLinks.jsx`,
 * `utils/loginApp.js`, `config/loginApps.json`, the `.auth-*` block of
 * index.css and the logo asset, then change nothing but `loginApps.json`
 * (app name, tagline, post-login route, social links) and pass your own
 * `onSubmit`. No application-specific text is hardcoded here.
 *
 * Layout (see AuthShell):
 *  - wide landscape screens -> brand poster with the glass illustration on
 *                              the left, the form on the right.
 *  - phones/tablets         -> compact brand row above the form, one column.
 *
 * @param {object}   app          resolved app config (see utils/loginApp.js)
 * @param {Function} onSubmit     `({ identifier, password }) => void`
 * @param {boolean}  isSubmitting shows the button's busy state + overlay
 * @param {string}   error        message rendered in the inline alert
 * @param {Function} [onGoogleLogin]  enabling `socialLogin` in loginApps.json
 *                                    and passing this renders the OAuth button
 */
export default function LoginScreen({
  app,
  onSubmit,
  isSubmitting = false,
  error = "",
  onGoogleLogin,
  className = "",
}) {
  const [showPassword, setShowPassword] = useState(false);
  // Shows a "Caps Lock is on" hint under the password field.
  const [capsLockOn, setCapsLockOn] = useState(false);

  const {
    register,
    handleSubmit,
    setFocus, // used to place the cursor on load
    formState: { errors },
  } = useForm({
    defaultValues: { identifier: "", password: "" },
  });

  // Put the cursor on the ID field. Skipped on touch screens so the phone
  // keyboard doesn't pop up over the page on load.
  useEffect(() => {
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    setFocus("identifier");
  }, [setFocus]);

  // Password field registration, extended (not replaced) so react-hook-form
  // keeps its own onBlur while we also hide the Caps Lock hint.
  const passwordField = register("password", {
    required: `${app?.passwordLabel || "Password"} is required`,
  });
  const updateCapsLock = (event) =>
    setCapsLockOn(Boolean(event.getModifierState?.("CapsLock")));

  const handleValidSubmit = (values) => {
    onSubmit?.({ identifier: values.identifier, password: values.password });
  };

  const showSocial =
    Boolean(app?.socialLogin?.enabled) && typeof onGoogleLogin === "function";
  const busyLabel = `${app?.submitLabelBusy || "Signing in"}…`;

  return (
    <>
      <AuthShell app={app} className={className} showCompanyLinks>
        <br/>
        <br/>
        <AuthHeading
          className="auth-rise"
          title={app?.welcomeTitle}
          subtitle={app?.welcomeSubtitle}
        />

        <form
          onSubmit={handleSubmit(handleValidSubmit)}
          className="mt-[2em]"
          noValidate
        >
          {/* Identifier - label comes from loginApps.json */}
          <div className="auth-rise" style={{ "--rise": 1 }}>
            <label htmlFor="login-sma-id" className={authLabelClass}>
              {app?.credentialsLabel}
            </label>
            {/* `group` lets the icon turn blue while the field is focused */}
            <div className="group relative">
              <span aria-hidden="true" className={authIconClass}>
                <User className={authFieldIconSize} strokeWidth={1.75} />
              </span>
              <input
                id="login-sma-id"
                type="text"
                autoComplete={app?.credentialsAutoComplete || "username"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={app?.credentialsPlaceholder}
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? "login-sma-id-error" : undefined}
                className={authInputClass(Boolean(errors.identifier))}
                {...register("identifier", {
                  required: `${app?.credentialsLabel || "Username"} is required`,
                })}
              />
            </div>
            {errors.identifier && (
              <p id="login-sma-id-error" className={authFieldErrorClass}>
                {errors.identifier.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="auth-rise mt-[1.375em]" style={{ "--rise": 2 }}>
            <label htmlFor="login-password" className={authLabelClass}>
              {app?.passwordLabel}
            </label>
            <div className="group relative">
              <span aria-hidden="true" className={authIconClass}>
                <Lock className={authFieldIconSize} strokeWidth={1.75} />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={app?.passwordPlaceholder}
                aria-invalid={Boolean(errors.password)}
                className={authInputClass(Boolean(errors.password), true)}
                {...passwordField}
                onKeyDown={updateCapsLock}
                onKeyUp={updateCapsLock}
                onBlur={(event) => {
                  passwordField.onBlur(event);
                  setCapsLockOn(false);
                }}
                aria-describedby={
                  [
                    errors.password && "login-password-error",
                    capsLockOn && "login-caps-lock",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className={authToggleClass}
              >
                {/* Slashed eye while the password is masked, open eye while it
                    is visible; the aria-label still names the action. */}
                {showPassword ? (
                  <Eye className={authFieldIconSize} strokeWidth={1.75} />
                ) : (
                  <EyeOff className={authFieldIconSize} strokeWidth={1.75} />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="login-password-error" className={authFieldErrorClass}>
                {errors.password.message}
              </p>
            )}
            {capsLockOn && (
              <p
                id="login-caps-lock"
                role="status"
                className="auth-fade-in mt-[0.5em] flex items-center gap-[0.375em] pl-[0.25em] text-[0.8125em] font-semibold text-[#b4540a]"
              >
                <ArrowUp className="h-[1.1em] w-[1.1em]" strokeWidth={2.5} />
                Caps Lock is on
              </p>
            )}
          </div>

          <div
            className="auth-rise mt-[1em] flex justify-between gap-[1em]"
            style={{ "--rise": 3 }}
          >
            {app?.showRegisterLink && (
              <p>
                {app?.registerPrompt}{" "}
                <Link
                  href={app?.registerPath || "/auth/register"}
                  className="rounded-md font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3b82f6]/20"
                >
                  {app?.registerLabel}
                </Link>
              </p>
            )}
            <Link
              href={withLoginAppParam(
                app?.forgotPasswordPath || "/auth/forgot-password",
                app?.id
              )}
              className="rounded-md text-[0.9375em] font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3b82f6]/20"
            >
              {app?.forgotPasswordLabel}
            </Link>
          </div>

          {error && (
            <div role="alert" className={`${authAlertClass} mt-[1.25em]`}>
              <AlertCircle className="mt-[0.1em] h-[1.25em] w-[1.25em] shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          <div className="auth-rise mt-[1.5em]" style={{ "--rise": 4 }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={authButtonClass}
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-[1.15em] w-[1.15em] animate-spin" />
                  {busyLabel}
                </>
              ) : (
                <>
                  {app?.submitLabel}
                  <ArrowRight
                    strokeWidth={2}
                    className="h-[1.1em] w-[1.1em] transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </div>

          {/* Rendered only when an app enables `socialLogin` in
              config/loginApps.json AND an `onGoogleLogin` handler is passed -
              an unconfigured provider never shows a dead button. */}
          {showSocial && (
            <div className="auth-rise mt-[1.25em]" style={{ "--rise": 5 }}>
              <div className="flex items-center gap-[1em]">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[0.75em] font-medium text-[#94a3b8]">
                  {app?.dividerLabel}
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={onGoogleLogin}
                className="mt-[1.25em] flex h-[3.25em] w-full items-center justify-center gap-[0.75em] rounded-full border border-slate-200 bg-white text-[1em] font-medium text-[#334155] transition hover:bg-slate-50 active:scale-[0.99]"
              >
                <GoogleMark />
                {app.socialLogin.label}
              </button>
            </div>
          )}

          {/* Second path, under the main action: off by default
              (`showRegisterLink` in config/loginApps.json). */}

        </form>
      </AuthShell>

      {isSubmitting && <LoginLoadingOverlay label={busyLabel} />}
    </>
  );
}

/* --------------------------------------------------------------------------
   Local helpers
   -------------------------------------------------------------------------- */


// Google's mark, inlined so the button needs no extra network request.
function GoogleMark() {
  return (
    <svg className="h-[1.25em] w-[1.25em]" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.27-3.14.76-4.59l-7.97-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Full-screen branded loader shown while the credentials are being verified
 * and the profile is loading. It deliberately covers the form until the route
 * changes (see LoginPage), so there is no flash of the empty form between the
 * login call finishing and the dashboard mounting.
 */
function LoginLoadingOverlay({ label }) {
  return (
    <div
      role="status"
      className="auth-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-white"
    >
      <div className="w-52 max-w-full px-6">
        <SvgComponent className="w-full h-auto" />
      </div>
      <div className="flex items-center gap-2 text-sm text-[#3c3c3c]/60">
        <Loader className="h-5 w-5 animate-spin text-[#3b82f6]" />
        <span>{label}</span>
      </div>
    </div>
  );
}
