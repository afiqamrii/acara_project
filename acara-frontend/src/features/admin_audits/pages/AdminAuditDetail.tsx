import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconDeviceDesktop,
  IconFingerprint,
  IconHistory,
  IconNetwork,
  IconRefresh,
  IconRoute,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import { fetchAdminAuditLog } from "../api";

const titleCase = (value: string) => value
  .split("_")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const formatDate = (value: string) => new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value).replaceAll("_", " ");
};

const moduleStyle = (module: string) => {
  if (module === "users") return "border-purple-300/30 bg-purple-400/10 text-purple-200";
  if (module === "services") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  if (module === "vendors") return "border-indigo-300/30 bg-indigo-400/10 text-indigo-200";
  if (module === "bookings") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  return "border-slate-300/30 bg-white/10 text-slate-200";
};

const SnapshotCard = ({ title, values, tone }: {
  title: string;
  values: Record<string, unknown> | null;
  tone: "before" | "after";
}) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className={`border-b px-5 py-4 ${tone === "before" ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}>
      <div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone === "before" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{tone === "before" ? <IconHistory size={15} /> : <IconCheck size={15} />}</span><h2 className="text-sm font-semibold text-slate-900">{title}</h2></div>
    </div>
    {values && Object.keys(values).length > 0 ? (
      <dl className="divide-y divide-slate-100">
        {Object.entries(values).map(([key, value]) => <div key={key} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)]"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{titleCase(key)}</dt><dd className="whitespace-pre-wrap break-words text-sm font-medium capitalize text-slate-800">{formatValue(value)}</dd></div>)}
      </dl>
    ) : <div className="px-5 py-10 text-center text-sm text-slate-400">No state snapshot was required.</div>}
  </section>
);

const ContextRow = ({ icon: Icon, label, value }: { icon: typeof IconUser; label: string; value: string }) => (
  <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon size={16} /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-1 break-words text-xs leading-5 text-slate-700">{value}</p></div></div>
);

const AdminAuditDetail = () => {
  usePageTitle("Audit Record");
  const params = useParams();
  const logId = Number(params.auditLogId);
  const detailQuery = useQuery({
    queryKey: ["admin-audit-log", logId],
    queryFn: () => fetchAdminAuditLog(logId),
    enabled: Number.isInteger(logId) && logId > 0,
  });

  if (detailQuery.isPending) return <Loader message="Verifying immutable audit record..." />;
  if (detailQuery.isError || !detailQuery.data) {
    return <main className="flex flex-1 items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"><IconAlertCircle className="mx-auto text-red-600" size={34} /><h1 className="mt-4 text-xl font-semibold text-slate-950">Audit record unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-600">The record may not exist or may be outside your visibility scope.</p><div className="mt-5 flex justify-center gap-2"><Link to="/admin/audit-logs" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Back to audit logs</Link><button onClick={() => detailQuery.refetch()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><IconRefresh size={17} /> Retry</button></div></section></main>;
  }

  const { log, scope } = detailQuery.data;
  const metadata = log.metadata ?? {};
  const requestPath = formatValue(metadata.request_path);
  const requestMethod = formatValue(metadata.request_method);
  const subjectLink = log.subject_type?.endsWith("\\User") && log.subject_id
    ? `/admin/users/${log.subject_id}`
    : log.subject_type?.endsWith("\\Booking") && log.subject_id
      ? `/admin/bookings/${log.subject_id}`
      : null;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link to="/admin/audit-logs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-700"><IconArrowLeft size={18} /> Back to audit log</Link>

        <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg shadow-slate-300/30 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">{log.reference}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${moduleStyle(log.module)}`}>{log.module}</span></div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Immutable administrative action</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{titleCase(log.action)}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{log.description}</p></div>
            <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Recorded at</p><p className="mt-1 text-sm font-semibold">{formatDate(log.created_at)}</p><p className="mt-1 text-[11px] text-indigo-300">{scope === "platform" ? "Platform scope" : "Personal admin scope"}</p></div>
          </div>
        </header>

        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800"><IconShieldCheck className="mt-0.5 shrink-0" size={18} /><p><span className="font-semibold">Integrity verified:</span> this record is append-only and cannot be edited or deleted through ACARA.</p></div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Decision context</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Actor and affected record</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><IconUser size={20} /></span><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Administrator</p><p className="mt-1 text-sm font-semibold text-slate-900">{log.actor?.name ?? "Former administrator"}</p><p className="mt-0.5 text-xs text-slate-500">{log.actor?.email ?? "Actor account removed"}</p></div></div></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><IconFingerprint size={20} /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Affected record</p>{subjectLink ? <Link to={subjectLink} className="mt-1 block truncate text-sm font-semibold text-indigo-700 hover:underline">{log.subject_label}</Link> : <p className="mt-1 truncate text-sm font-semibold text-slate-900">{log.subject_label}</p>}<p className="mt-0.5 text-xs font-medium text-slate-500">{log.subject_reference ?? "No stable reference"}</p></div></div></div>
              </div>
              {log.reason && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">Administrative reason</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">{log.reason}</p></div>}
            </section>

            <div className="grid gap-5 lg:grid-cols-2"><SnapshotCard title="Previous state" values={log.before_values} tone="before" /><SnapshotCard title="Resulting state" values={log.after_values} tone="after" /></div>

            {Object.keys(metadata).filter((key) => !["request_method", "request_path"].includes(key)).length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Supporting metadata</p><h2 className="mt-1 text-base font-semibold text-slate-950">Related identifiers</h2></div><dl className="divide-y divide-slate-100">{Object.entries(metadata).filter(([key]) => !["request_method", "request_path"].includes(key)).map(([key, value]) => <div key={key} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[190px_minmax(0,1fr)]"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{titleCase(key)}</dt><dd className="break-words text-sm font-medium text-slate-800">{formatValue(value)}</dd></div>)}</dl></section>
            )}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><IconNetwork className="text-indigo-600" size={19} /><h2 className="text-base font-semibold text-slate-950">Request context</h2></div><div className="mt-5 space-y-5"><ContextRow icon={IconRoute} label="Endpoint" value={`${requestMethod} /${requestPath}`} /><ContextRow icon={IconNetwork} label="IP address" value={log.ip_address ?? "Not captured"} /><ContextRow icon={IconDeviceDesktop} label="Client" value={log.user_agent ?? "Not captured"} /><ContextRow icon={IconCalendar} label="Server timestamp" value={formatDate(log.created_at)} /></div></section>
            <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300">Retention note</p><h2 className="mt-3 text-lg font-semibold">Historical labels are preserved</h2><p className="mt-2 text-xs leading-5 text-slate-300">The administrator, subject reference and safe state snapshot remain readable even if the original operational record is removed later.</p></section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default AdminAuditDetail;
