import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import PasswordRecoveryLayout from "../components/PasswordRecoveryLayout";
import { resetPassword } from "../api";
import { usePageTitle } from "../../../utils/usePageTitle";

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

const requirements = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "Uppercase and lowercase letters", test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: "At least one number", test: (value: string) => /\d/.test(value) },
  { label: "At least one symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const ResetPassword = () => {
  usePageTitle("Reset Password");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const linkIsComplete = Boolean(token && email);

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const passedRequirements = useMemo(
    () => requirements.map((requirement) => requirement.test(password)),
    [password],
  );
  const passwordIsStrong = passedRequirements.every(Boolean);
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const canSubmit = linkIsComplete && passwordIsStrong && passwordsMatch && !loading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      await resetPassword({
        email,
        token,
        password,
        password_confirmation: confirmation,
      });
      setComplete(true);
    } catch (caught) {
      const apiError = caught as AxiosError<ApiError>;
      const errors = apiError.response?.data.errors;
      setError(
        errors?.token?.[0] ??
          errors?.password?.[0] ??
          errors?.email?.[0] ??
          apiError.response?.data.message ??
          "We could not reset your password. Please request a new link.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!linkIsComplete) {
    return (
      <PasswordRecoveryLayout
        eyebrow="Invalid recovery link"
        title="This link is incomplete"
        description="The reset link is missing required security information. Request a fresh link to continue safely."
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <XCircle className="mt-0.5 shrink-0" size={22} />
            <p className="text-sm leading-6">
              Do not edit or reuse a password reset URL. Each complete link works only once and expires after 60 minutes.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="block rounded-xl bg-purple-600 px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Request a new reset link
          </Link>
        </div>
      </PasswordRecoveryLayout>
    );
  }

  return (
    <PasswordRecoveryLayout
      eyebrow="Secure password reset"
      title={complete ? "Password updated" : "Create a new password"}
      description={
        complete
          ? "Your account is secured with the new password and all previous sessions have been signed out."
          : `Choose a strong password for ${email}. This reset link can only be used once.`
      }
    >
      {complete ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
            <div>
              <p className="font-semibold">Password changed successfully</p>
              <p className="mt-1 text-sm leading-6 text-emerald-800">
                A confirmation email has been sent. Sign in again on each device using your new password.
              </p>
            </div>
          </div>
          <Link
            to="/login?password_reset=1"
            className="block rounded-xl bg-purple-600 px-5 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
          >
            Continue to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">New password</span>
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-950 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide new password" : "Show new password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-purple-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            {requirements.map((requirement, index) => (
              <div
                key={requirement.label}
                className={`flex items-center gap-2 text-xs font-medium ${
                  passedRequirements[index] ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${passedRequirements[index] ? "bg-emerald-100" : "bg-slate-200"}`}>
                  <Check size={12} aria-hidden="true" />
                </span>
                {requirement.label}
              </div>
            ))}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm new password</span>
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showConfirmation ? "text" : "password"}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-950 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((current) => !current)}
                aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-purple-600"
              >
                {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            {confirmation && !passwordsMatch && (
              <span className="mt-2 block text-xs font-medium text-red-600">Passwords do not match.</span>
            )}
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(126,87,194,0.28)] transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Securing your account..." : "Reset password"}
          </button>
        </form>
      )}
    </PasswordRecoveryLayout>
  );
};

export default ResetPassword;
