import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    IconAlertCircle,
    IconArrowLeft,
    IconCheck,
    IconCopy,
    IconKey,
    IconLoader2,
    IconLock,
    IconMail,
    IconShieldCheck,
    IconUserPlus,
} from "@tabler/icons-react";
import api from "../../../lib/Api";
import { usePageTitle } from "../../../utils/usePageTitle";

type InviteAdminResponse = {
    default_password: string;
};

const invitationSteps = [
    "An administrator account is created for the email address.",
    "ACARA sends the temporary password and verification link by email.",
    "The administrator signs in and completes their profile.",
    "They replace the temporary password before starting work.",
];

const Register_admin: React.FC = () => {
    usePageTitle("Invite Administrator");
    const navigate = useNavigate();
    const [email, setEmail] = React.useState("");
    const [invitedEmail, setInvitedEmail] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState(false);
    const [defaultPassword, setDefaultPassword] = React.useState("");
    const [emailError, setEmailError] = React.useState(false);
    const [passwordCopied, setPasswordCopied] = React.useState(false);

    const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setEmailError(false);

        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
            setEmailError(true);
            setError("Email address is required.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            setEmailError(true);
            setError("Enter a valid email address.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.post<InviteAdminResponse>("/admin/invite", {
                email: normalizedEmail,
            });
            setDefaultPassword(response.data.default_password);
            setInvitedEmail(normalizedEmail);
            setSuccess(true);
            setEmail("");
        } catch (err: unknown) {
            console.error("Invitation failed:", err);
            const message = axios.isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || "The invitation could not be sent. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSuccess(false);
        setDefaultPassword("");
        setInvitedEmail("");
        setEmail("");
        setError("");
        setEmailError(false);
        setPasswordCopied(false);
    };

    const handleCopyPassword = async () => {
        if (!defaultPassword || !navigator.clipboard) return;

        try {
            await navigator.clipboard.writeText(defaultPassword);
            setPasswordCopied(true);
        } catch {
            setPasswordCopied(false);
        }
    };

    return (
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 md:py-9 lg:px-8">
                <button
                    type="button"
                    onClick={() => navigate("/admin/users")}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                    <IconArrowLeft size={17} aria-hidden="true" />
                    User management
                </button>

                <header className="mt-6 flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                            <IconShieldCheck size={17} aria-hidden="true" />
                            Access administration
                        </div>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                            Invite an administrator
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            Provision a trusted administrator account and send secure onboarding instructions to their work email.
                        </p>
                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
                        <IconLock size={17} aria-hidden="true" />
                        Super admin only
                    </div>
                </header>

                <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    {!success ? (
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-start gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                                    <IconUserPlus size={22} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-950">Administrator details</h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Use an organization-managed email address whenever possible.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleInvite} noValidate>
                                <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
                                    <div>
                                        <label htmlFor="admin-email" className="text-sm font-semibold text-slate-800">
                                            Work email address
                                        </label>
                                        <p id="admin-email-help" className="mt-1 text-xs leading-5 text-slate-500">
                                            The invitation, verification link and temporary credentials will be sent here.
                                        </p>
                                        <div className="relative mt-3">
                                            <IconMail
                                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={19}
                                                aria-hidden="true"
                                            />
                                            <input
                                                id="admin-email"
                                                name="email"
                                                type="email"
                                                inputMode="email"
                                                autoComplete="email"
                                                autoFocus
                                                value={email}
                                                onChange={(event) => {
                                                    setEmail(event.target.value);
                                                    setEmailError(false);
                                                    setError("");
                                                }}
                                                placeholder="name@company.com"
                                                aria-invalid={emailError}
                                                aria-describedby={emailError ? "admin-email-error" : "admin-email-help"}
                                                className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 ${
                                                    emailError
                                                        ? "border-red-300 ring-4 ring-red-50 focus:border-red-400"
                                                        : "border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                                }`}
                                            />
                                        </div>
                                        {emailError && (
                                            <p id="admin-email-error" className="mt-2 flex items-center gap-2 text-xs font-medium text-red-600">
                                                <IconAlertCircle size={15} aria-hidden="true" />
                                                {error}
                                            </p>
                                        )}
                                    </div>

                                    {error && !emailError && (
                                        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                            <IconAlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                                            <div>
                                                <p className="font-semibold">Invitation not sent</p>
                                                <p className="mt-1 leading-5 text-red-700">{error}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200">
                                            <IconShieldCheck size={18} aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900">Assigned role: Administrator</p>
                                                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                                    Admin
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                This role can manage platform operations, users and verification workflows, but cannot invite other administrators.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/users")}
                                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isLoading ? (
                                            <>
                                                <IconLoader2 className="animate-spin" size={18} aria-hidden="true" />
                                                Sending invitation...
                                            </>
                                        ) : (
                                            <>
                                                <IconMail size={18} aria-hidden="true" />
                                                Send invitation
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </section>
                    ) : (
                        <section aria-live="polite" className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                            <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-7 sm:px-7">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                                    <IconCheck size={25} stroke={2.5} aria-hidden="true" />
                                </span>
                                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">Invitation sent</h2>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                                    ACARA created an administrator account for <span className="font-semibold text-slate-900">{invitedEmail}</span> and sent the onboarding email.
                                </p>
                            </div>

                            <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                                    <div className="flex items-start gap-3">
                                        <IconKey className="mt-0.5 shrink-0 text-amber-700" size={20} aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">Temporary password</p>
                                            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <code className="break-all text-base font-semibold tracking-wide text-slate-950">{defaultPassword}</code>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyPassword}
                                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-amber-100"
                                                    aria-label="Copy temporary password"
                                                >
                                                    {passwordCopied ? <IconCheck size={16} aria-hidden="true" /> : <IconCopy size={16} aria-hidden="true" />}
                                                    {passwordCopied ? "Copied" : "Copy"}
                                                </button>
                                            </div>
                                            <p className="mt-3 text-xs leading-5 text-amber-800">
                                                This password is included in the invitation email. Treat it as sensitive and replace it during profile setup.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    <IconMail className="mt-0.5 shrink-0 text-indigo-700" size={18} aria-hidden="true" />
                                    <p className="leading-6">
                                        Ask the recipient to check their spam folder if the invitation does not arrive within a few minutes.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
                                <button
                                    type="button"
                                    onClick={() => navigate("/admin/users")}
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                                >
                                    Return to user management
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                >
                                    <IconUserPlus size={18} aria-hidden="true" />
                                    Invite another admin
                                </button>
                            </div>
                        </section>
                    )}

                    <aside className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <IconMail size={20} aria-hidden="true" />
                                </span>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Onboarding</p>
                                    <h2 className="mt-1 text-base font-semibold text-slate-950">What happens next</h2>
                                </div>
                            </div>

                            <ol className="mt-6 space-y-5">
                                {invitationSteps.map((step, index) => (
                                    <li key={step} className="flex gap-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                                            {index + 1}
                                        </span>
                                        <p className="pt-0.5 text-xs leading-5 text-slate-600">{step}</p>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        <section className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-200 sm:p-6">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-indigo-200 ring-1 ring-white/10">
                                <IconLock size={20} aria-hidden="true" />
                            </span>
                            <h2 className="mt-5 text-base font-semibold">Protected administrative action</h2>
                            <p className="mt-2 text-xs leading-5 text-slate-300">
                                Only super administrators can create admin accounts. Every successful invitation is recorded in the administrative audit log.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    );
};

export default Register_admin;
