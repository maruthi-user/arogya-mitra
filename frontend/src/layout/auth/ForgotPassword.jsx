import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader,
  MailCheck,
  User,
} from "lucide-react";
import AuthShell, {
  AuthHeading,
  authAlertClass,
  authButtonClass,
  authFieldErrorClass,
  authFieldIconSize,
  authIconClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
} from "@layout/auth/AuthShell";
import useLoginApp from "@layout/auth/useLoginApp";
import { LOGIN_PATH, withLoginAppParam } from "@layout/utils/loginApp";
import SuccessScreen from "./SuccessScreen";
import { useForgotPasswordMutation } from "@layout/store/authApi";
import { runWithProcessingLock } from "@layout/utils/processingLock";

const parseErrorMessage = (data) => {
  if (!data) return "";
  if (typeof data === "string") {
    if (data.includes("Error:")) return data.replace("Error: ", "").trim();
    try {
      const parsed = JSON.parse(data);
      if (parsed?.message) return parsed.message;
    } catch {
      // not JSON, fall through
    }
    return data;
  }
  return data?.message || "";
};

const ForgotPassword = () => {
  const app = useLoginApp();
  const idLabel = app?.credentialsLabel || "Username";
  // Back to the same app's login screen (keeps `?app=`).
  const loginHref = withLoginAppParam(LOGIN_PATH, app?.id);

  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm({
    defaultValues: { identifier: "" },
  });

  // Cursor on the ID field (also after "Try again"). Skipped on touch
  // screens so the phone keyboard doesn't pop up over the page on load.
  useEffect(() => {
    if (successMessage) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    setFocus("identifier");
  }, [setFocus, successMessage]);

  const onSubmit = async (formData) => {
    setApiError("");

    try {
      // The reset link always goes to an e-mail address, regardless of
      // whether login itself uses a username or an e-mail as the ID.
      const res = await forgotPassword({ email: formData.identifier }).unwrap();
      setSuccessMessage(res?.message || "Password reset email sent.");
    } catch (error) {
      setApiError(
        parseErrorMessage(error?.data) ||
          "Unable to send the reset link. Please try again."
      );
    }
  };

  if (successMessage) {
    return (
      <AuthShell app={app} showCompanyLinks={false}>
        <SuccessScreen
          icon={MailCheck}
          title="Check your email"
          message={successMessage}
          note={`If an account exists for this ${idLabel}, the link will reach its registered email shortly. Check your spam folder too.`}
          buttonLabel="Sign in"
          buttonHref={loginHref}
          retryPrompt="Didn't get the email?"
          retryLabel="Try again"
          onRetry={() => setSuccessMessage("")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell app={app} showCompanyLinks={false}>
      <AuthHeading
        className="auth-rise"
        title="Forgot Password"
        subtitle={`Enter your ${idLabel} and we'll email you a link to reset your password.`}
      />

      <form
        onSubmit={handleSubmit((data) =>
          runWithProcessingLock(() => onSubmit(data), "Sending reset link…")
        )}
        className="mt-[2em]"
        noValidate
      >
        <div className="auth-rise" style={{ "--rise": 1 }}>
          <label htmlFor="forgot-sma-id" className={authLabelClass}>
            {idLabel}
          </label>
          <div className="group relative">
            <span aria-hidden="true" className={authIconClass}>
              <User className={authFieldIconSize} strokeWidth={1.75} />
            </span>
            <input
              id="forgot-sma-id"
              type="text"
              placeholder={app?.credentialsPlaceholder || `Enter your ${idLabel}`}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.identifier)}
              aria-describedby={errors.identifier ? "forgot-sma-id-error" : undefined}
              {...register("identifier", { required: `${idLabel} is required` })}
              className={authInputClass(Boolean(errors.identifier))}
            />
          </div>
          {errors.identifier && (
            <p id="forgot-sma-id-error" className={authFieldErrorClass}>
              {errors.identifier.message}
            </p>
          )}
        </div>

        {apiError && (
          <div role="alert" className={`${authAlertClass} mt-[1.25em]`}>
            <AlertCircle className="mt-[0.1em] h-[1.25em] w-[1.25em] shrink-0" />
            <span className="min-w-0 break-words">{apiError}</span>
          </div>
        )}

        <div className="auth-rise mt-[1.5em]" style={{ "--rise": 2 }}>
          <button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? (
              <>
                <Loader className="h-[1.15em] w-[1.15em] animate-spin" />
                Sending…
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight
                  strokeWidth={2}
                  className="h-[1.1em] w-[1.1em] transition-transform group-hover:translate-x-1"
                />
              </>
            )}
          </button>
        </div>

        <div
          className="auth-rise mt-[1.5em] text-center"
          style={{ "--rise": 3 }}
        >
          <Link href={loginHref} className={authLinkClass}>
            <ArrowLeft className="h-[1.1em] w-[1.1em] transition-transform group-hover:-translate-x-1" />
            Sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
