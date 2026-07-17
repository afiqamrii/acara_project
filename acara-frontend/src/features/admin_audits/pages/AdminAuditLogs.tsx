import { useDeferredValue, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  IconAlertCircle,
  IconBan,
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconFileCheck,
  IconFilter,
  IconHistory,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import { fetchAdminAuditLogs, type AdminAuditLog } from "../api";

const MODULES = ["users", "vendors", "services", "bookings", "administration", "settings"];

const titleCase = (value: string) => value
  .split("_")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const formatDate = (value: string) => new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const moduleStyle = (module: string) => {
  if (module === "users") return "border-purple-200 bg-purple-50 text-purple-700";
  if (module === "services") return "border-blue-200 bg-blue-50 text-blue-700";
  if (module === "vendors") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (module === "bookings") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (module === "settings") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const actionTone = (action: string) => {
  if (action.includes("rejected") || action.includes("suspended")) return { icon: IconBan, className: "bg-red-50 text-red-700" };
  if (action.includes("approved") || action.includes("reactivated") || action.includes("resolved")) return { icon: IconCheck, className: "bg-emerald-50 text-emerald-700" };
  return { icon: IconFileCheck, className: "bg-indigo-50 text-indigo-700" };
};

const StatCard = ({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: number;
  detail: string;
  icon: ElementType;
  tone: string;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span></div>
  </section>
);

const AuditRow = ({ log, onOpen }: { log: AdminAuditLog; onOpen: () => void }) => {
  const tone = actionTone(log.action);
  const Icon = tone.icon;
  return (
    <button onClick={onOpen} className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-indigo-50/40 sm:px-5 lg:grid-cols-[44px_minmax(220px,1.2fr)_minmax(170px,0.75fr)_minmax(160px,0.7fr)_170px_24px] lg:items-center">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.className}`}><Icon size={19} /></span>
      <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-950">{titleCase(log.action)}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${moduleStyle(log.module)}`}>{log.module}</span></span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{log.description}</span></span>
      <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{log.subject_label}</span><span className="mt-1 block text-xs font-medium text-indigo-600">{log.subject_reference ?? "No reference"}</span></span>
      <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-700">{log.actor?.name ?? "Former administrator"}</span><span className="mt-1 block truncate text-xs text-slate-400">{log.actor?.email ?? "Account removed"}</span></span>
      <span><span className="block text-sm text-slate-700">{formatDate(log.created_at)}</span><span className="mt-1 block text-[11px] font-medium text-slate-400">{log.reference}</span></span>
      <IconChevronRight className="hidden text-slate-300 lg:block" size={18} />
    </button>
  );
};

const AdminAuditLogs = () => {
  usePageTitle("Audit Logs");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [module, setModule] = useState("all");
  const [action, setAction] = useState("all");
  const [actorId, setActorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const filters = { search: deferredSearch, module, action, actor_id: actorId, date_from: dateFrom, date_to: dateTo, page };

  const auditQuery = useQuery({
    queryKey: ["admin-audit-logs", filters],
    queryFn: () => fetchAdminAuditLogs(filters),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });

  const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  const hasFilters = Boolean(search || module !== "all" || action !== "all" || actorId || dateFrom || dateTo);
  const reset = () => { setSearch(""); setModule("all"); setAction("all"); setActorId(""); setDateFrom(""); setDateTo(""); setPage(1); };

  if (auditQuery.isPending) return <Loader message="Loading immutable audit records..." />;
  if (auditQuery.isError || !auditQuery.data) {
    return <main className="flex flex-1 items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"><IconAlertCircle className="mx-auto text-red-600" size={34} /><h1 className="mt-4 text-xl font-semibold text-slate-950">Audit records could not be loaded</h1><p className="mt-2 text-sm text-slate-600">No compliance records have been changed.</p><button onClick={() => auditQuery.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><IconRefresh size={17} /> Try again</button></section></main>;
  }

  const { logs, stats, meta, scope } = auditQuery.data;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><IconShieldCheck size={17} /> Governance and compliance</div><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Administrative audit log</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review an immutable record of administrative decisions, affected records, state changes and request context.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Visibility scope</p><p className="mt-1 text-sm font-semibold text-slate-900">{scope === "platform" ? "Platform-wide history" : "Your administrative actions"}</p><p className="mt-1 text-xs text-slate-500">{scope === "platform" ? "Super administrator access" : "Role-limited access"}</p></div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Audit records" value={stats.total} detail={scope === "platform" ? "Across all administrators" : "Created by your account"} icon={IconHistory} tone="bg-slate-100 text-slate-700" />
          <StatCard label="Today" value={stats.today} detail="Recorded since midnight" icon={IconClock} tone="bg-indigo-50 text-indigo-700" />
          <StatCard label="This week" value={stats.this_week} detail="Current operational week" icon={IconCalendar} tone="bg-blue-50 text-blue-700" />
          <StatCard label="High impact" value={stats.high_impact} detail="Access, rejection and resolution" icon={IconAlertCircle} tone="bg-amber-50 text-amber-700" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className={`grid gap-3 ${scope === "platform" ? "xl:grid-cols-[minmax(260px,1fr)_repeat(5,minmax(140px,0.4fr))_auto]" : "xl:grid-cols-[minmax(280px,1fr)_repeat(4,minmax(150px,0.45fr))_auto]"}`}>
            <label className="relative block"><IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search actor, subject, reference or reason" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50" /></label>
            <select value={module} onChange={(event) => setFilter(setModule, event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"><option value="all">All modules</option>{MODULES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select>
            <select value={action} onChange={(event) => setFilter(setAction, event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"><option value="all">All actions</option>{auditQuery.data.filters.actions.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select>
            {scope === "platform" && <select value={actorId} onChange={(event) => setFilter(setActorId, event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"><option value="">All administrators</option>{auditQuery.data.filters.actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name || actor.email}</option>)}</select>}
            <label className="relative"><span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">From</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setFilter(setDateFrom, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pt-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50" /></label>
            <label className="relative"><span className="pointer-events-none absolute left-3 top-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">To</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setFilter(setDateTo, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pt-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50" /></label>
            <button onClick={reset} disabled={!hasFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><IconFilter size={17} /> Reset</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid lg:grid-cols-[44px_minmax(220px,1.2fr)_minmax(170px,0.75fr)_minmax(160px,0.7fr)_170px_24px] lg:gap-3"><span /><span>Administrative action</span><span>Affected record</span><span>Administrator</span><span>Recorded</span><span /></div>
          <div className="divide-y divide-slate-100">{logs.map((log) => <AuditRow key={log.id} log={log} onOpen={() => navigate(`/admin/audit-logs/${log.id}`)} />)}</div>
          {logs.length === 0 && <div className="px-6 py-14 text-center"><IconHistory className="mx-auto text-slate-300" size={36} /><h2 className="mt-3 text-base font-semibold text-slate-900">No audit records match</h2><p className="mt-1 text-sm text-slate-500">Broaden the search or reset the compliance filters.</p></div>}
          {meta.last_page > 1 && <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5"><p className="text-xs text-slate-500">Page <span className="font-semibold text-slate-800">{meta.current_page}</span> of {meta.last_page}</p><div className="flex gap-2"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={meta.current_page === 1 || auditQuery.isFetching} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><IconChevronLeft size={17} /></button><button onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))} disabled={meta.current_page === meta.last_page || auditQuery.isFetching} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><IconChevronRight size={17} /></button></div></div>}
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-5 text-indigo-800"><IconShieldCheck className="mt-0.5 shrink-0" size={17} /><p><span className="font-semibold">Integrity policy:</span> audit records cannot be edited or deleted through ACARA. Subject labels and state snapshots remain available even when the original record is later removed.</p></div>
      </div>
    </main>
  );
};

export default AdminAuditLogs;
