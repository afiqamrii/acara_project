import { useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import PasswordRecoveryLayout from "../components/PasswordRecoveryLayout";
import { requestPasswordReset } from "../api";
import { usePageTitle } from "../../../utils/usePageTitle";

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

const ForgotPassword = () => {
  usePageTitle("Forgot Password");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestPasswordReset(email.trim());
      setSubmittedEmail(email.trim());
      setSent(true);
    } catch (caught) {
      const apiError = caught as AxiosError<ApiError>;
      setError(
        apiError.response?.data.errors?.email?.[0] ??
          apiError.response?.data.message ??
          "We could not process the request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PasswordRecoveryLayout
      eyebrow="Password recovery"
      title={sent ? "Check your email" : "Forgot your password?"}
      description={
        sent
          ? "If the address belongs to an ACARA account, a secure reset link is on its way."
          : "Enter the email used for your ACARA account and we will send you a secure, time-limited reset link."
      }
    >
      {sent ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
              <div>
                <p className="font-semibold text-emerald-950">Request received</p>
                <p className="mt-1 break-all text-sm leading-6 text-emerald-800">
                  Check <span className="font-semibold">{submittedEmail}</span> and its spam folder. The link expires in 60 minutes.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setError("");
              }}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-purple-200 hover:bg-purple-50"
            >
              Use another email
            </button>
            <Link
              to="/login"
              className="rounded-xl bg-purple-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Account email
            </span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(126,87,194,0.28)] transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={17} aria-hidden="true" />
            {loading ? "Sending secure link..." : "Send reset link"}
          </button>
        </form>
      )}
    </PasswordRecoveryLayout>
  );
};

export default ForgotPassword;
