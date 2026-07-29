import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import acaraLogo from "../../../img/acara-logo.png";

type PasswordRecoveryLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const securityDetails = [
  {
    icon: Clock3,
    title: "60-minute expiry",
    detail: "Your recovery link is automatically retired after one hour.",
  },
  {
    icon: CheckCircle2,
    title: "Single-use link",
    detail: "The link becomes invalid immediately after your password changes.",
  },
  {
    icon: LogOut,
    title: "Session protection",
    detail: "Existing sessions are signed out to protect your account.",
  },
];

const PasswordRecoveryLayout = ({
  eyebrow,
  title,
  description,
  children,
}: PasswordRecoveryLayoutProps) => (
  <main className="relative min-h-screen overflow-hidden bg-[#f5f6fb] text-slate-950">
    <div className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-purple-200/55 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-48 right-0 h-[30rem] w-[30rem] rounded-full bg-fuchsia-100/70 blur-3xl" />

    <div className="relative mx-auto flex min-h-screen w-full max-w-[1180px] flex-col justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-purple-200 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to sign in
        </Link>
        <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
          <ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" />
          Secure account recovery
        </div>
      </div>

      <div className="grid overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_28px_90px_rgba(46,35,91,0.14)] lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#24185f] via-[#42218a] to-[#7b2cbf] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-12">
          <div className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                <ShieldCheck size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-200">
                  ACARA
                </p>
                <p className="text-sm font-semibold text-white">Account security</p>
              </div>
            </div>

            <h2 className="mt-9 max-w-sm text-3xl font-bold leading-tight tracking-tight xl:text-[2.15rem]">
              A secure way back into your account.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-purple-100/85">
              Your reset request is protected from the moment you open the link
              until your new password is saved.
            </p>

            <div className="mt-9 space-y-3">
              {securityDetails.map(({ icon: Icon, title: itemTitle, detail }) => (
                <div
                  key={itemTitle}
                  className="flex gap-3.5 rounded-2xl border border-white/12 bg-white/[0.08] p-4 backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 text-purple-100">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{itemTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-purple-100/70">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-10 flex items-center gap-3 border-t border-white/15 pt-5 text-xs leading-5 text-purple-100/75">
            <KeyRound className="shrink-0" size={17} aria-hidden="true" />
            ACARA support will never ask for your password or reset token.
          </div>
        </aside>

        <section className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 xl:px-16">
          <div className="mb-9 flex items-center justify-between border-b border-slate-100 pb-7">
            <img src={acaraLogo} alt="ACARA" className="h-auto w-36 sm:w-40" />
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700 sm:inline-flex">
              <ShieldCheck size={14} aria-hidden="true" />
              Protected
            </span>
          </div>

          <div className="mb-8 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-600">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2rem]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
          </div>

          {children}

          <p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400 lg:hidden">
            ACARA support will never ask for your password or reset token.
          </p>
        </section>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Secure account services provided by ACARA
      </p>
    </div>
  </main>
);

export default PasswordRecoveryLayout;
