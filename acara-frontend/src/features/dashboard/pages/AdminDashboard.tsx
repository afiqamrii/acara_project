import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { ElementType } from "react";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBuildingStore,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconHistory,
  IconRefresh,
  IconReceipt,
  IconShieldCheck,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  fetchAdminDashboard,
  type AdminActivityItem,
  type AdminBookingQueueItem,
  type AdminVerificationQueueItem,
} from "../adminApi";

const titleCase = (value: string) => value
  .split("_")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const parseDate = (value: string) => new Date(value.replace(" ", "T"));

const formatDateTime = (value: string) => parseDate(value).toLocaleString("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const formatEventDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const StatCard = ({ label, value, detail, icon: Icon, tone, to }: {
  label: string;
  value: number;
  detail: string;
  icon: ElementType;
  tone: string;
  to: string;
}) => (
  <Link to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value.toLocaleString("en-MY")}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></span>
    </div>
    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">Open workspace <IconArrowRight className="transition group-hover:translate-x-0.5" size={14} /></span>
  </Link>
);

const EmptyQueue = ({ icon: Icon, title, detail }: { icon: ElementType; title: string; detail: string }) => (
  <div className="px-5 py-12 text-center">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon size={23} /></span>
    <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
  </div>
);

const BookingQueueRow = ({ item }: { item: AdminBookingQueueItem }) => {
  const resolution = item.status === "needs_resolution";
  return (
    <Link to={item.path} className="grid gap-3 px-5 py-4 transition hover:bg-indigo-50/40 md:grid-cols-[minmax(0,1.3fr)_minmax(160px,0.65fr)_minmax(150px,0.55fr)_24px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-950">{item.service_name}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-slate-600">{item.reference}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.organizer_name} · {item.vendor_name}</p>
        <p className={`mt-2 line-clamp-2 text-xs leading-5 ${resolution ? "text-red-700" : "text-slate-600"}`}>{item.detail}</p>
      </div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Event date</p>
        <p className="mt-1 text-sm font-semibold text-slate-800">{formatEventDate(item.event_date)}</p>
      </div>
      <div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${resolution ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
          {resolution ? <IconAlertCircle size={13} /> : <IconClock size={13} />}
          {resolution ? "Needs resolution" : "Awaiting vendor"}
        </span>
        <p className="mt-1.5 text-[10px] text-slate-400">{item.deadline ? `${resolution ? "Reported" : "Due"} ${formatDateTime(item.deadline)}` : "No deadline captured"}</p>
      </div>
      <IconChevronRight className="hidden text-slate-300 md:block" size={18} />
    </Link>
  );
};

const VerificationRow = ({ item }: { item: AdminVerificationQueueItem }) => {
  const vendor = item.type === "vendor";
  return (
    <Link to={item.path} className="flex items-center gap-4 px-5 py-4 transition hover:bg-indigo-50/40">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${vendor ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
        {vendor ? <IconBuildingStore size={19} /> : <IconReceipt size={19} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-slate-900">{item.title}</p><span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{item.type}</span></div>
        <p className="mt-1 truncate text-xs text-slate-500">{item.subtitle}</p>
      </div>
      <div className="hidden text-right sm:block"><p className="text-[10px] font-medium text-slate-500">{item.status === "pending_completion" ? "Profile incomplete" : "Ready for review"}</p><p className="mt-1 text-[10px] text-slate-400">{formatDateTime(item.submitted_at)}</p></div>
      <IconChevronRight className="shrink-0 text-slate-300" size={18} />
    </Link>
  );
};

const activityTone = (action: string) => {
  if (action.includes("rejected") || action.includes("suspended")) return "bg-red-50 text-red-700";
  if (action.includes("approved") || action.includes("reactivated") || action.includes("resolved")) return "bg-emerald-50 text-emerald-700";
  return "bg-indigo-50 text-indigo-700";
};

const ActivityRow = ({ item }: { item: AdminActivityItem }) => (
  <Link to={item.path} className="flex gap-4 px-5 py-4 transition hover:bg-indigo-50/40">
    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activityTone(item.action)}`}><IconHistory size={17} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{titleCase(item.action)}</p><span className="text-[10px] text-slate-400">{formatDateTime(item.created_at)}</span></div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
      <p className="mt-2 text-[10px] font-medium text-slate-400">{item.actor_name} · {item.reference}</p>
    </div>
  </Link>
);

const MetricLine = ({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) => {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs"><span className="font-medium text-slate-600">{label}</span><span className="font-semibold text-slate-900">{value.toLocaleString("en-MY")}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} /></div>
    </div>
  );
};

const AdminDashboard = () => {
  usePageTitle("Admin Operations");
  const dashboardQuery = useQuery({
    queryKey: ["admin-operations-dashboard"],
    queryFn: fetchAdminDashboard,
    staleTime: 30_000,
  });

  if (dashboardQuery.isPending) return <Loader message="Loading live platform operations..." />;
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <main className="flex flex-1 items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"><IconAlertCircle className="mx-auto text-red-600" size={34} /><h1 className="mt-4 text-xl font-semibold text-slate-950">Operations data could not be loaded</h1><p className="mt-2 text-sm leading-6 text-slate-600">No records were changed. Check the connection and try again.</p><button onClick={() => dashboardQuery.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><IconRefresh size={17} /> Try again</button></section></main>;
  }

  const data = dashboardQuery.data;
  const accountHealth = data.accounts.total > 0 ? Math.round((data.accounts.active / data.accounts.total) * 100) : 100;
  const priorityWork = data.verifications.total + data.bookings.needs_resolution;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-200/30 sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300"><IconShieldCheck size={17} /> ACARA operations control</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Platform operations dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Monitor real verification workload, booking health, member access, and administrative activity from one operational view.</p>
              <div className="mt-6 flex flex-wrap gap-3"><Link to="/admin/bookings" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50"><IconReceipt size={17} /> Review bookings</Link><Link to="/admin/audit-logs" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"><IconHistory size={17} /> Audit history</Link></div>
            </div>
            <div className="min-w-[240px] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" /> Live platform data</div><button onClick={() => dashboardQuery.refetch()} disabled={dashboardQuery.isFetching} aria-label="Refresh operations dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200 transition hover:bg-white/15 disabled:opacity-50"><IconRefresh className={dashboardQuery.isFetching ? "animate-spin" : ""} size={16} /></button></div>
              <p className="mt-4 text-3xl font-semibold">{priorityWork}</p><p className="mt-1 text-xs text-slate-300">priority item{priorityWork === 1 ? "" : "s"} across verification and resolution</p><p className="mt-3 border-t border-white/10 pt-3 text-[10px] text-slate-400">Updated {formatDateTime(data.generated_at)}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Marketplace accounts" value={data.accounts.total} detail={`${data.accounts.active} active · ${data.accounts.suspended} suspended`} icon={IconUsers} tone="bg-indigo-50 text-indigo-700" to="/admin/users" />
          <StatCard label="Pending verification" value={data.verifications.total} detail={`${data.verifications.vendors} vendors · ${data.verifications.services} services`} icon={IconUserCheck} tone="bg-purple-50 text-purple-700" to="/admin/verifications/vendors" />
          <StatCard label="Active bookings" value={data.bookings.active} detail={`${data.bookings.pending_vendor} pending · ${data.bookings.confirmed} confirmed`} icon={IconReceipt} tone="bg-blue-50 text-blue-700" to="/admin/bookings" />
          <StatCard label="Needs resolution" value={data.bookings.needs_resolution} detail="Completion issues awaiting an admin decision" icon={IconAlertCircle} tone={data.bookings.needs_resolution > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"} to="/admin/bookings" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.75fr)]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><IconAlertCircle className="text-red-600" size={19} /><h2 className="text-base font-semibold text-slate-950">Booking attention queue</h2></div><p className="mt-1 text-xs text-slate-500">Completion issues first, followed by requests awaiting vendor response.</p></div><Link to="/admin/bookings" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">Open booking monitor <IconArrowRight size={14} /></Link></div>
              <div className="divide-y divide-slate-100">{data.queues.bookings.map((item) => <BookingQueueRow key={item.id} item={item} />)}</div>
              {data.queues.bookings.length === 0 && <EmptyQueue icon={IconCheck} title="No bookings require attention" detail="There are no disputed completions or pending vendor responses." />}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><IconUserCheck className="text-purple-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Verification workload</h2></div><p className="mt-1 text-xs text-slate-500">Latest vendor profiles and service listings waiting for review.</p></div><div className="flex gap-3"><Link to="/admin/verifications/vendors" className="text-xs font-semibold text-indigo-700">Vendors</Link><Link to="/admin/verifications/services" className="text-xs font-semibold text-indigo-700">Services</Link></div></div>
              <div className="divide-y divide-slate-100">{data.queues.verifications.map((item) => <VerificationRow key={item.key} item={item} />)}</div>
              {data.queues.verifications.length === 0 && <EmptyQueue icon={IconCheck} title="Verification queue is clear" detail="No vendor profiles or services are currently waiting for review." />}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Member health</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{accountHealth}% active</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><IconUsers size={20} /></span></div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${accountHealth}%` }} /></div>
              <div className="mt-5 space-y-4"><MetricLine label="Active accounts" value={data.accounts.active} total={data.accounts.total} tone="bg-emerald-500" /><MetricLine label="Organizers" value={data.accounts.organizers} total={data.accounts.total} tone="bg-indigo-500" /><MetricLine label="Vendors" value={data.accounts.vendors} total={data.accounts.total} tone="bg-purple-500" /><MetricLine label="Suspended accounts" value={data.accounts.suspended} total={data.accounts.total} tone="bg-red-500" /></div>
              <Link to="/admin/users" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">Manage account access <IconArrowRight size={14} /></Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><IconCalendar className="text-blue-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Booking workflow</h2></div>
              <dl className="mt-5 divide-y divide-slate-100">
                <div className="flex items-center justify-between py-3 first:pt-0"><dt className="text-xs text-slate-500">Awaiting vendor</dt><dd className="text-sm font-semibold text-amber-700">{data.bookings.pending_vendor}</dd></div>
                <div className="flex items-center justify-between py-3"><dt className="text-xs text-slate-500">Confirmed bookings</dt><dd className="text-sm font-semibold text-blue-700">{data.bookings.confirmed}</dd></div>
                <div className="flex items-center justify-between py-3"><dt className="text-xs text-slate-500">Awaiting organizer confirmation</dt><dd className="text-sm font-semibold text-purple-700">{data.bookings.awaiting_organizer}</dd></div>
                <div className="flex items-center justify-between py-3"><dt className="text-xs text-slate-500">Completed this month</dt><dd className="text-sm font-semibold text-emerald-700">{data.bookings.completed_this_month}</dd></div>
              </dl>
            </section>
          </aside>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><IconHistory className="text-indigo-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Recent administrative activity</h2></div><p className="mt-1 text-xs text-slate-500">{data.activity_scope === "platform" ? "Latest actions across the administration team." : "Your latest recorded administrative actions."}</p></div><Link to="/admin/audit-logs" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">View immutable history <IconArrowRight size={14} /></Link></div>
          <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">{data.recent_activity.map((item) => <ActivityRow key={item.id} item={item} />)}</div>
          {data.recent_activity.length === 0 && <EmptyQueue icon={IconHistory} title="No administrative activity yet" detail="Recorded decisions will appear here after an administrator takes action." />}
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-5 text-indigo-800"><IconShieldCheck className="mt-0.5 shrink-0" size={17} /><p><span className="font-semibold">Operational data policy:</span> every figure on this dashboard comes from current ACARA records. Financial, escrow, crew, and payment information will only appear after those modules are formally implemented.</p></div>
      </div>
    </main>
  );
};

export default AdminDashboard;
