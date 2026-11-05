import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearch } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader,
  ShieldAlert,
} from "lucide-react";
import AuthLayout from "./AuthLayout";
import SuccessScreen from "./SuccessScreen";
import {
  AuthHeading,
  authButtonClass,
  authIconClass,
  authInputClass,
  authLinkClass,
} from "@layout/auth/AuthShell";
import { useResetPasswordMutation } from "@layout/store/authApi";
import { runWithProcessingLock } from "@layout/utils/processingLock";

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: "Minimum 8 characters" },
  { test: (value) => /[A-Z]/.test(value), label: "One uppercase letter" },
  { test: (value) => /[a-z]/.test(value), label: "One lowercase letter" },
  { test: (value) => /[0-9]/.test(value), label: "One number" },
  {
    test: (value) => /[^A-Za-z0-9]/.test(value),
    label: "One special character",
  },
];

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

const getErrorMessage = (error) => {
  let message = parseErrorMessage(error?.data);

  if (message.includes("expired")) {
    return "This reset link has expired. Please request a new one.";
  }

  if (message.includes("Passwords do not match")) {
    return "Passwords do not match.";
  }

  return message || "Unable to reset your password. Please try again.";
};

const RestorePassword = () => {
  const search = useSearch();
  const token = useMemo(
    () => new URLSearchParams(search).get("token") || "",
    [search]
  );

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const password = watch("newPassword") || "";

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const requirementChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  const allRequirementsMet = requirementChecks.every((rule) => rule.passed);

  const onSubmit = async (formData) => {
    setApiError("");

    try {
      // confirmPassword is a client-side check only (see validate() above) -
      // the backend's ResetPasswordRequest only accepts token/newPassword and
      // rejects unknown fields.
      const res = await resetPassword({
        token,
        newPassword: formData.newPassword,
      }).unwrap();

      setSuccessMessage(res?.message || "Password reset successfully.");
    } catch (error) {
      setApiError(getErrorMessage(error));
    }
  };

  if (successMessage) {
    return (
      <AuthLayout>
        <SuccessScreen
          title="Password Reset"
          message={successMessage}
          note="You can now sign in with your new password."
          buttonLabel="Sign in"
        />
      </AuthLayout>
    );
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[22px] bg-red-50 text-red-500 ring-8 ring-red-50/60">
            <ShieldAlert className="h-10 w-10" strokeWidth={1.6} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0f1b2d]">
            Invalid Reset Link
          </h2>
          <p className="mt-2.5 text-base text-[#6b7a90]">
            This password reset link is missing a valid token.
          </p>
          <Link
            href="/auth/forgot-password"
            className={`${authButtonClass} mt-8`}
          >
            Request New Link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthHeading
        title="Restore Password"
        subtitle="Choose a new password for your account."
      />

      <form
        onSubmit={handleSubmit((data) =>
          runWithProcessingLock(() => onSubmit(data), "Updating password…")
        )}
        className="mt-8 space-y-3"
        noValidate
      >
        <div>
          <div className="relative">
            <span aria-hidden="true" className={authIconClass}>
              <KeyRound className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              aria-label="New password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              {...register("newPassword", {
                required: "Password is required",
                validate: (value) =>
                  PASSWORD_RULES.every((rule) => rule.test(value)) ||
                  "Password requirements not met",
              })}
              className={authInputClass(errors.newPassword, true)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#4a5b78] transition hover:bg-white hover:text-[#1a6ff0]"
            >
              {showPassword ? (
                <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} />
              ) : (
                <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {errors.newPassword && (
            <p className="mt-1.5 pl-1 text-sm text-red-500">
              {errors.newPassword.message}
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-x-2 gap-y-1 rounded-2xl border border-white/80 bg-white/60 p-3 sm:grid-cols-2">
            {requirementChecks.map((rule) => (
              <p
                key={rule.label}
                className={`flex items-center gap-2 whitespace-nowrap text-xs ${
                  password && rule.passed
                    ? "text-emerald-600"
                    : "text-[#7b8aa3]"
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-xs ${
                    password && rule.passed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-[#b6c2d2] text-transparent"
                  }`}
                >
                  ✓
                </span>
                {rule.label}
              </p>
            ))}
          </div>
        </div>

        <div>
          <div className="relative">
            <span aria-hidden="true" className={authIconClass}>
              <KeyRound className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm password"
              aria-label="Confirm password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword", {
                required: "Confirm password is required",
                validate: (value) =>
                  value === password || "Passwords do not match.",
              })}
              className={authInputClass(errors.confirmPassword)}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 pl-1 text-sm text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {apiError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="min-w-0 break-words">{apiError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !allRequirementsMet}
          className={`${authButtonClass} mt-3`}
        >
          {isLoading ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Resetting…
            </>
          ) : (
            <>
              Reset Password
              <ArrowRight
                strokeWidth={1.75}
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>

        <div className="pt-3 text-center">
          <Link href="/auth/login" className={authLinkClass}>
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default RestorePassword;
