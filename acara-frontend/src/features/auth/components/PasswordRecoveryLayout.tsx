import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Clock3, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import acaraLogo from "../../../img/acara-logo.png";
import loginBackground from "../../../img/bg1_login.jpg";

type PasswordRecoveryLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const PasswordRecoveryLayout = ({
  eyebrow,
  title,
  description,
  children,
}: PasswordRecoveryLayoutProps) => (
  <main className="min-h-screen bg-slate-50 text-slate-950">
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
      <section className="relative hidden overflow-hidden lg:flex lg:min-h-screen lg:items-center">
        <img
          src={loginBackground}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#24185f]/95 via-[#512da8]/88 to-[#9c27b0]/78" />
        <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative z-10 mx-auto w-full max-w-2xl px-14 py-16 xl:px-20">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-lg shadow-purple-950/20 backdrop-blur-sm">
            <ShieldCheck size={28} aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-purple-100">
            Secure account recovery
          </p>
          <h2 className="mt-4 max-w-xl text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-5xl">
            Regain access without compromising your account.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-purple-100/90 xl:text-lg xl:leading-8">
            ACARA uses a short-lived, single-use email link. Your existing
            sessions are signed out after a successful password change.
          </p>

          <div className="mt-10 grid max-w-xl gap-3">
            {[
              {
                icon: Clock3,
                title: "Time-limited link",
                detail: "The recovery link expires automatically after 60 minutes.",
              },
              {
                icon: CheckCircle2,
                title: "Single-use protection",
                detail: "A used reset link cannot be submitted a second time.",
              },
              {
                icon: LogOut,
                title: "Automatic sign-out",
                detail: "Existing sessions are closed when your password changes.",
              },
            ].map(({ icon: Icon, title: itemTitle, detail }) => (
              <div
                key={itemTitle}
                className="flex items-start gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 backdrop-blur-sm"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-purple-100">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{itemTitle}</p>
                  <p className="mt-1 text-xs leading-5 text-purple-100/80">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-16 sm:px-8 lg:px-12">
        <Link
          to="/login"
          className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-purple-200 hover:text-purple-700 sm:left-8 sm:top-8"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to sign in
        </Link>

        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_24px_70px_rgba(41,31,92,0.12)] sm:p-10">
            <div className="mb-8 border-b border-slate-100 pb-8">
              <img src={acaraLogo} alt="ACARA" className="mx-auto h-auto w-36" />
            </div>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-600">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
            {children}
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            For your security, ACARA support will never ask for your password
            or reset token.
          </p>
        </div>
      </section>
    </div>
  </main>
);

export default PasswordRecoveryLayout;
