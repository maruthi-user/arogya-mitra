import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { authButtonClass } from "@layout/auth/AuthShell";
import { LOGIN_PATH } from "@layout/utils/loginApp";

/**
 * Confirmation shown inside the auth shell once a request went through
 * (reset email sent, password changed). The icon pops in with a soft ripple,
 * then the text rises in. Pass `onRetry` to offer a way back to the form.
 */
const SuccessScreen = ({
  icon: Icon = CheckCircle2,
  title,
  message,
  note,
  buttonLabel = "Sign in",
  buttonHref = LOGIN_PATH,
  retryPrompt,
  retryLabel = "Try again",
  onRetry,
}) => (
  <div className="flex flex-col items-center text-center">
    <div className="auth-pop relative mb-[1.75em]">
      <span
        aria-hidden="true"
        className="auth-ripple absolute inset-0 rounded-full bg-[#4495FB]/30"
      />
      <div className="relative flex h-[4.5em] w-[4.5em] items-center justify-center rounded-full bg-[linear-gradient(140deg,#3b8bff,#3a46e8)] text-white shadow-[0_1.1em_1.9em_-0.9em_rgba(47,96,240,0.75)]">
        <Icon className="h-[2em] w-[2em]" strokeWidth={1.75} />
      </div>
    </div>

    <h2
      className="auth-rise text-[1.75em] font-bold leading-[1.15] tracking-[-0.025em] text-[#0b1437] md:text-[2em]"
      style={{ "--rise": 1 }}
    >
      {title}
    </h2>
    <p
      className="auth-rise mt-[0.625em] text-[0.9375em] leading-relaxed text-[#5a6482]"
      style={{ "--rise": 2 }}
    >
      {message}
    </p>
    {note && (
      <p
        className="auth-rise mt-[0.375em] text-[0.8125em] leading-relaxed text-[#8a97b5]"
        style={{ "--rise": 2 }}
      >
        {note}
      </p>
    )}

    <div className="auth-rise mt-[2em] w-full" style={{ "--rise": 3 }}>
      <Link href={buttonHref} className={authButtonClass}>
        {buttonLabel}
      </Link>
    </div>

    {onRetry && (
      <p
        className="auth-rise mt-[1.25em] text-[0.875em] text-[#5a6482]"
        style={{ "--rise": 4 }}
      >
        {retryPrompt}{" "}
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3b82f6]/20"
        >
          {retryLabel}
        </button>
      </p>
    )}
  </div>
);

export default SuccessScreen;
