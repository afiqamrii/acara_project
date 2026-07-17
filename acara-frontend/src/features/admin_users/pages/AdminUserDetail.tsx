import { useState, type ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { AxiosError } from "axios";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBan,
  IconBriefcase,
  IconCalendarEvent,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconFileDescription,
  IconHistory,
  IconMail,
  IconMapPin,
  IconPhone,
  IconRefresh,
  IconShieldCheck,
  IconShoppingBag,
  IconUser,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  fetchAdminUser,
  reactivateAdminUser,
  suspendAdminUser,
  type AccountRole,
  type AdminUserDetail as AdminUserDetailResponse,
} from "../api";

const ROLE_LABELS: Record<AccountRole, string> = {
  user: "Organizer",
  vendor: "Vendor",
  crew: "Crew",
  admin: "Administrator",
  super_admin: "Super Administrator",
};

const formatDate = (value: string | null, includeTime = false) => {
  if (!value) return "Not recorded";
  return new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};

const formatMoney = (value: number | null) => value === null
  ? "—"
  : new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);

const statusClass = (status: string) => {
  if (["active", "approved", "confirmed", "completed"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["suspended", "cancelled", "rejected", "expired"].includes(status)) return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const SummaryCard = ({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: number;
  detail: string;
  icon: ElementType;
  tone: string;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={19} /></span>
    </div>
  </section>
);

const InformationRow = ({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"><Icon size={16} /></span>
    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-800">{value}</p></div>
  </div>
);

type ModerationAction = "suspend" | "reactivate";

const ModerationModal = ({ action, userName, loading, error, onClose, onConfirm }: {
  action: ModerationAction;
  userName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const isSuspension = action === "suspend";
  const valid = reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="moderation-title">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isSuspension ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {isSuspension ? <IconBan size={22} /> : <IconUserCheck size={22} />}
            </span>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Documented moderation action</p><h2 id="moderation-title" className="mt-1 text-xl font-semibold text-slate-950">{isSuspension ? "Suspend account" : "Reactivate account"}</h2></div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><IconX size={19} /></button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className={`rounded-xl border p-4 text-sm leading-6 ${isSuspension ? "border-red-100 bg-red-50 text-red-800" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`}>
            {isSuspension
              ? <><span className="font-semibold">{userName}</span> will be signed out immediately and prevented from accessing ACARA until reactivated.</>
              : <><span className="font-semibold">{userName}</span> will regain sign-in access. Previous moderation history will remain available.</>}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Administrative reason <span className="text-red-500">*</span></span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">Be specific and factual. This note is recorded in the audit history and shared with the account holder.</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} maxLength={1000} placeholder={isSuspension ? "Describe the policy or account issue requiring suspension..." : "Explain why access is being restored..."} className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-6 text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50" />
            <span className={`mt-1.5 block text-right text-[11px] ${valid ? "text-emerald-600" : "text-slate-400"}`}>{reason.trim().length}/1000 · minimum 10 characters</span>
          </label>

          {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><IconAlertCircle className="mt-0.5 shrink-0" size={17} /><span>{error}</span></div>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end sm:px-6">
          <button onClick={onClose} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={() => onConfirm(reason.trim())} disabled={!valid || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${isSuspension ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
            {loading ? "Saving decision..." : isSuspension ? <><IconBan size={17} /> Suspend and revoke access</> : <><IconCheck size={17} /> Reactivate account</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminUserDetail = () => {
  usePageTitle("User Record");
  const params = useParams();
  const userId = Number(params.userId);
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchAdminUser(userId),
    enabled: Number.isInteger(userId) && userId > 0,
  });

  const moderationMutation = useMutation({
    mutationFn: ({ action, reason }: { action: ModerationAction; reason: string }) => action === "suspend"
      ? suspendAdminUser({ id: userId, reason })
      : reactivateAdminUser({ id: userId, reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-user", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
      setAction(null);
      setActionError(null);
    },
    onError: (error) => {
      const apiError = error as AxiosError<{ message?: string; errors?: { reason?: string[] } }>;
      setActionError(apiError.response?.data?.errors?.reason?.[0] ?? apiError.response?.data?.message ?? "The moderation action could not be saved.");
    },
  });

  if (detailQuery.isPending) return <Loader message="Loading account record..." />;

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"><IconAlertCircle className="mx-auto text-red-600" size={34} /><h1 className="mt-4 text-xl font-semibold text-slate-950">Account record unavailable</h1><p className="mt-2 text-sm text-slate-600">The record may no longer exist or could not be loaded.</p><div className="mt-5 flex justify-center gap-2"><Link to="/admin/users" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Back to users</Link><button onClick={() => detailQuery.refetch()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><IconRefresh size={17} /> Retry</button></div></section>
      </main>
    );
  }

  const data: AdminUserDetailResponse = detailQuery.data;
  const { user, permissions } = data;
  const initials = user.name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  const totalBookings = data.booking_summary.made.total + data.booking_summary.received.total;
  const completedBookings = data.booking_summary.made.completed + data.booking_summary.received.completed;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-700"><IconArrowLeft size={18} /> Back to user management</Link>

        <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg shadow-slate-300/30 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-white/15 object-cover sm:h-20 sm:w-20" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold ring-1 ring-white/15 sm:h-20 sm:w-20">{initials || "U"}</span>}
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-100">USR-{String(user.id).padStart(6, "0")}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${user.status === "active" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>{user.status}</span></div><h1 className="mt-3 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{user.name || "Profile incomplete"}</h1><p className="mt-1 truncate text-sm text-slate-300">{user.email}</p><p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300">{ROLE_LABELS[user.role]}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-slate-400">Member since</p><p className="mt-1 text-sm font-semibold">{formatDate(user.created_at)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-slate-400">Last access</p><p className="mt-1 text-sm font-semibold">{formatDate(user.last_login_at, true)}</p></div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Booking activity" value={totalBookings} detail={`${data.booking_summary.made.total} organized · ${data.booking_summary.received.total} received`} icon={IconCalendarEvent} tone="bg-indigo-50 text-indigo-700" />
          <SummaryCard label="Completed" value={completedBookings} detail="Closed successfully" icon={IconCircleCheck} tone="bg-emerald-50 text-emerald-700" />
          <SummaryCard label="Vendor services" value={user.services_count} detail={data.vendor_profile?.status ? `Business ${data.vendor_profile.status.replaceAll("_", " ")}` : "No vendor profile"} icon={IconShoppingBag} tone="bg-blue-50 text-blue-700" />
          <SummaryCard label="Moderation events" value={data.moderation_history.length} detail="Permanent decision history" icon={IconHistory} tone="bg-amber-50 text-amber-700" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Account record</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Identity and access</h2></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InformationRow icon={IconMail} label="Email address" value={user.email} />
                <InformationRow icon={IconPhone} label="Phone number" value={user.phone_number || "Not provided"} />
                <InformationRow icon={IconUser} label="Account role" value={ROLE_LABELS[user.role]} />
                <InformationRow icon={user.email_verified_at ? IconShieldCheck : IconAlertCircle} label="Email verification" value={user.email_verified_at ? `Verified ${formatDate(user.email_verified_at)}` : "Verification pending"} />
                <InformationRow icon={user.profile_completed ? IconCheck : IconClock} label="Profile completion" value={user.profile_completed ? "Complete" : "Incomplete"} />
                <InformationRow icon={IconClock} label="Last successful login" value={formatDate(user.last_login_at, true)} />
              </div>
            </section>

            {data.vendor_profile && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">Vendor operations</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Business and services</h2></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(data.vendor_profile.status)}`}>{data.vendor_profile.status.replaceAll("_", " ")}</span></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3"><InformationRow icon={IconBriefcase} label="Business name" value={data.vendor_profile.business_name} /><InformationRow icon={IconFileDescription} label="SSM number" value={data.vendor_profile.ssm_number || "Not provided"} /><InformationRow icon={IconMapPin} label="Service area" value={[data.vendor_profile.service_area_town, data.vendor_profile.service_area_state].filter(Boolean).join(", ") || "Not provided"} /></div>
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  {data.services.length > 0 ? <div className="divide-y divide-slate-100">{data.services.map((service) => <div key={service.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900">{service.name}</p><p className="mt-1 text-xs text-slate-500">{service.category} · From {formatMoney(service.starting_price)}</p></div><div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(service.status)}`}>{service.status.replaceAll("_", " ")}</span>{service.status === "approved" && <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${service.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{service.is_active ? "Visible" : "Paused"}</span>}</div></div>)}</div> : <p className="p-6 text-center text-sm text-slate-500">No service records submitted.</p>}
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5 sm:px-6"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Operational context</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Recent booking activity</h2></div>
              {data.recent_bookings.length > 0 ? <div className="divide-y divide-slate-100">{data.recent_bookings.map((booking) => <div key={`${booking.relationship}-${booking.id}`} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_150px_120px] sm:items-center sm:px-6"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-indigo-700">{booking.reference}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">{booking.relationship}</span></div><p className="mt-1 text-sm font-semibold text-slate-900">{booking.service_name || "Service record"}</p><p className="mt-0.5 text-xs text-slate-500">With {booking.counterparty || "another ACARA member"}</p></div><div><p className="text-sm font-medium text-slate-700">{formatDate(booking.selected_date)}</p><p className="mt-1 text-xs text-slate-400">{formatMoney(booking.value)}</p></div><span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(booking.status)}`}>{booking.status}</span></div>)}</div> : <div className="p-10 text-center"><IconCalendarEvent className="mx-auto text-slate-300" size={32} /><p className="mt-3 text-sm font-medium text-slate-700">No submitted booking activity</p></div>}
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className={`rounded-2xl border p-5 shadow-sm ${user.status === "active" ? "border-emerald-200 bg-white" : "border-red-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Account standing</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{user.status === "active" ? "Active access" : "Access suspended"}</h2></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.status === "active" ? <IconUserCheck size={21} /> : <IconBan size={21} />}</span></div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{user.status === "active" ? "This account can sign in and perform actions allowed by its role." : `Suspended ${formatDate(user.suspended_at, true)}${user.suspended_by ? ` by ${user.suspended_by.name}` : ""}.`}</p>
              {user.suspension_reason && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Current suspension reason</p><p className="mt-1.5 text-xs leading-5 text-red-800">{user.suspension_reason}</p></div>}
              <div className="mt-5 border-t border-slate-100 pt-5">
                {permissions.can_suspend && <button onClick={() => { setActionError(null); setAction("suspend"); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-red-100 transition hover:bg-red-700"><IconBan size={18} /> Suspend account</button>}
                {permissions.can_reactivate && <button onClick={() => { setActionError(null); setAction("reactivate"); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-100 transition hover:bg-emerald-700"><IconUserCheck size={18} /> Reactivate account</button>}
                {permissions.blocked_reason && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><IconShieldCheck className="mt-0.5 shrink-0" size={16} /><span>{permissions.blocked_reason}</span></div>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><IconHistory className="text-indigo-600" size={19} /><h2 className="text-base font-semibold text-slate-950">Moderation history</h2></div>
              {data.moderation_history.length > 0 ? <div className="mt-5 space-y-5">{data.moderation_history.map((event, index) => <div key={event.id} className="relative flex gap-3">{index < data.moderation_history.length - 1 && <span className="absolute left-3.5 top-7 h-[calc(100%+0.5rem)] w-px bg-slate-200" />}<span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${event.action === "suspended" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>{event.action === "suspended" ? <IconBan size={14} /> : <IconCheck size={14} />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold capitalize text-slate-900">Account {event.action}</p><span className="text-[10px] text-slate-400">{formatDate(event.created_at, true)}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{event.reason}</p><p className="mt-1 text-[11px] font-medium text-slate-400">By {event.admin?.name ?? "Former administrator"}</p></div></div>)}</div> : <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center"><IconShieldCheck className="mx-auto text-slate-300" size={26} /><p className="mt-2 text-xs leading-5 text-slate-500">No moderation actions have been recorded for this account.</p></div>}
            </section>
          </aside>
        </div>
      </div>

      {action && <ModerationModal action={action} userName={user.name || user.email} loading={moderationMutation.isPending} error={actionError} onClose={() => { if (!moderationMutation.isPending) { setAction(null); setActionError(null); } }} onConfirm={(reason) => moderationMutation.mutate({ action, reason })} />}
    </main>
  );
};

export default AdminUserDetail;
