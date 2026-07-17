import { useMemo, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCalendarStats,
  IconChartBar,
  IconCheck,
  IconClock,
  IconDownload,
  IconFileSpreadsheet,
  IconFilter,
  IconRefresh,
  IconReceipt,
  IconShieldCheck,
  IconTrendingUp,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  downloadAdminOperationsReport,
  fetchAdminOperationsReport,
  type AdminOperationsReport,
  type ReportFilters,
} from "../api";

const inputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const today = inputDate(new Date());
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return inputDate(date);
};

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const formatDateTime = (value: string) => new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const SummaryCard = ({ label, value, detail, icon: Icon, tone, suffix = "" }: {
  label: string;
  value: number;
  detail: string;
  icon: ElementType;
  tone: string;
  suffix?: string;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value.toLocaleString("en-MY")}{suffix}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></span></div>
  </section>
);

const TrendChart = ({ points }: { points: AdminOperationsReport["daily_activity"] }) => {
  const width = 760;
  const height = 230;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 36;
  const max = Math.max(1, ...points.flatMap((point) => [point.bookings, point.accounts]));
  const x = (index: number) => left + (index / Math.max(1, points.length - 1)) * (width - left - right);
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const bookingsLine = points.map((point, index) => `${x(index)},${y(point.bookings)}`).join(" ");
  const accountsLine = points.map((point, index) => `${x(index)},${y(point.accounts)}`).join(" ");
  const area = `${left},${height - bottom} ${bookingsLine} ${width - right},${height - bottom}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Booking requests</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> New accounts</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Daily booking request and account registration trend">
        <defs><linearGradient id="bookingArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" /><stop offset="100%" stopColor="#4f46e5" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((ratio) => { const lineY = top + ratio * (height - top - bottom); const label = Math.round(max * (1 - ratio)); return <g key={ratio}><line x1={left} y1={lineY} x2={width - right} y2={lineY} stroke="#e2e8f0" strokeDasharray="4 5" /><text x={left - 10} y={lineY + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{label}</text></g>; })}
        <polygon points={area} fill="url(#bookingArea)" />
        <polyline points={bookingsLine} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={accountsLine} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.length <= 31 && points.map((point, index) => <g key={point.date}><circle cx={x(index)} cy={y(point.bookings)} r="3" fill="#fff" stroke="#4f46e5" strokeWidth="2" /><circle cx={x(index)} cy={y(point.accounts)} r="2.5" fill="#fff" stroke="#06b6d4" strokeWidth="2" /></g>)}
        {points.length > 0 && <><text x={left} y={height - 10} fontSize="10" fill="#64748b">{formatDate(points[0].date)}</text><text x={width - right} y={height - 10} textAnchor="end" fontSize="10" fill="#64748b">{formatDate(points[points.length - 1].date)}</text></>}
      </svg>
    </div>
  );
};

const FunnelRow = ({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${tone}`} /><span className="text-xs font-medium text-slate-600">{label}</span></div><div className="text-right"><span className="text-sm font-semibold text-slate-900">{value}</span><span className="ml-2 text-[10px] text-slate-400">{percentage}%</span></div></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} /></div>
    </div>
  );
};

const DetailMetric = ({ label, value, helper, icon: Icon, tone }: { label: string; value: number; helper: string; icon: ElementType; tone: string }) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={17} /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 flex items-baseline gap-2"><p className="text-lg font-semibold text-slate-950">{value.toLocaleString("en-MY")}</p><p className="truncate text-[10px] text-slate-500">{helper}</p></div></div></div>
);

const AdminOperationsReportPage = () => {
  usePageTitle("Operations Reports");
  const initialFilters = useMemo<ReportFilters>(() => ({ date_from: daysAgo(29), date_to: today }), []);
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const draftRangeDays = draft.date_from && draft.date_to
    ? Math.floor((new Date(`${draft.date_to}T00:00:00`).getTime() - new Date(`${draft.date_from}T00:00:00`).getTime()) / 86_400_000) + 1
    : 0;
  const invalidDraftRange = draftRangeDays < 1 || draftRangeDays > 366;

  const reportQuery = useQuery({
    queryKey: ["admin-operations-report", filters],
    queryFn: () => fetchAdminOperationsReport(filters),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const applyPreset = (days: number) => {
    const next = { date_from: daysAgo(days - 1), date_to: today };
    setDraft(next);
    setFilters(next);
  };
  const applyRange = () => {
    if (draft.date_from && draft.date_to && !invalidDraftRange) setFilters(draft);
  };
  const exportCsv = async () => {
    setExporting(true);
    setExportError("");
    try { await downloadAdminOperationsReport(filters); }
    catch { setExportError("The CSV report could not be generated. Please try again."); }
    finally { setExporting(false); }
  };

  if (reportQuery.isPending) return <Loader message="Preparing operations report..." />;
  if (reportQuery.isError || !reportQuery.data) {
    return <main className="flex flex-1 items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"><IconAlertCircle className="mx-auto text-red-600" size={34} /><h1 className="mt-4 text-xl font-semibold text-slate-950">Report could not be generated</h1><p className="mt-2 text-sm leading-6 text-slate-600">No platform data was changed. Check the selected period and try again.</p><button onClick={() => reportQuery.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><IconRefresh size={17} /> Try again</button></section></main>;
  }

  const report = reportQuery.data;
  const funnel = report.booking_funnel;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-200/30 sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300"><IconChartBar size={17} /> Management reporting</div><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Operations performance report</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review booking outcomes, marketplace growth, verification decisions, and completion issue handling for a defined reporting period.</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><IconShieldCheck size={15} className="text-emerald-300" /> Financial, payment, revenue, and escrow figures are intentionally excluded.</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-indigo-200">Reporting period</p><p className="mt-2 text-lg font-semibold">{formatDate(report.period.date_from)} – {formatDate(report.period.date_to)}</p><p className="mt-1 text-xs text-slate-300">{report.period.days} calendar day{report.period.days === 1 ? "" : "s"}</p><p className="mt-3 border-t border-white/10 pt-3 text-[10px] text-slate-400">Generated {formatDateTime(report.generated_at)}</p></div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap gap-2"><button onClick={() => applyPreset(7)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Last 7 days</button><button onClick={() => applyPreset(30)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Last 30 days</button><button onClick={() => applyPreset(90)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Last 90 days</button></div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date from</span><input type="date" value={draft.date_from} max={draft.date_to || today} onChange={(event) => setDraft((current) => ({ ...current, date_from: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50" /></label>
              <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date to</span><input type="date" value={draft.date_to} min={draft.date_from} max={today} onChange={(event) => setDraft((current) => ({ ...current, date_to: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50" /></label>
              <button onClick={applyRange} disabled={!draft.date_from || !draft.date_to || invalidDraftRange} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><IconFilter size={15} /> Apply</button>
              <button onClick={exportCsv} disabled={exporting || reportQuery.isFetching} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"><IconDownload size={15} /> {exporting ? "Exporting..." : "Export CSV"}</button>
            </div>
          </div>
          {invalidDraftRange && draft.date_from && draft.date_to && <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800"><IconAlertCircle size={16} /> Select a valid reporting period of no more than 366 days.</div>}
          {exportError && <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"><IconAlertCircle size={16} /> {exportError}</div>}
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Booking requests" value={report.summary.booking_requests} detail="Submitted during this reporting period" icon={IconReceipt} tone="bg-indigo-50 text-indigo-700" />
          <SummaryCard label="Booking conversion" value={report.summary.conversion_rate} suffix="%" detail="Currently confirmed or completed" icon={IconTrendingUp} tone="bg-emerald-50 text-emerald-700" />
          <SummaryCard label="New accounts" value={report.summary.new_accounts} detail="Organizer and vendor registrations" icon={IconUserPlus} tone="bg-cyan-50 text-cyan-700" />
          <SummaryCard label="Completion issues" value={report.summary.completion_issues} detail="Issues reported during the period" icon={IconAlertCircle} tone={report.summary.completion_issues > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.75fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><IconCalendarStats className="text-indigo-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Daily platform activity</h2></div><p className="mt-1 text-xs text-slate-500">New booking requests and marketplace registrations.</p></div><p className="text-[10px] font-medium text-slate-400">Daily values · MYT</p></div><div className="mt-5"><TrendChart points={report.daily_activity} /></div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><IconTrendingUp className="text-indigo-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Booking funnel</h2></div><p className="mt-1 text-xs text-slate-500">Current outcome of requests created in this period.</p><div className="mt-5 space-y-4"><FunnelRow label="Pending vendor" value={funnel.pending} total={funnel.total} tone="bg-amber-500" /><FunnelRow label="Confirmed" value={funnel.confirmed} total={funnel.total} tone="bg-blue-500" /><FunnelRow label="Completed" value={funnel.completed} total={funnel.total} tone="bg-emerald-500" /><FunnelRow label="Rejected" value={funnel.rejected} total={funnel.total} tone="bg-red-500" /><FunnelRow label="Cancelled" value={funnel.cancelled} total={funnel.total} tone="bg-slate-500" /><FunnelRow label="Expired" value={funnel.expired} total={funnel.total} tone="bg-purple-500" /></div></section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><IconUsers className="text-cyan-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Marketplace growth</h2></div><p className="mt-1 text-xs text-slate-500">New non-administrator accounts in the period.</p><div className="mt-5 space-y-3"><DetailMetric label="Organizers" value={report.accounts.organizers} helper="new accounts" icon={IconUsers} tone="bg-indigo-50 text-indigo-700" /><DetailMetric label="Vendors" value={report.accounts.vendors} helper="new accounts" icon={IconBuildingStore} tone="bg-purple-50 text-purple-700" /><DetailMetric label="Email verified" value={report.accounts.verified} helper="of new accounts" icon={IconCheck} tone="bg-emerald-50 text-emerald-700" /><DetailMetric label="Suspended now" value={report.accounts.suspended_current} helper="platform snapshot" icon={IconAlertCircle} tone="bg-red-50 text-red-700" /></div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><IconFileSpreadsheet className="text-purple-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Verification performance</h2></div><p className="mt-1 text-xs text-slate-500">Profile and service review activity.</p><div className="mt-5 space-y-3"><DetailMetric label="New submissions" value={report.verifications.new_submissions} helper="received" icon={IconClock} tone="bg-amber-50 text-amber-700" /><DetailMetric label="Approved" value={report.verifications.approved} helper="decisions" icon={IconCheck} tone="bg-emerald-50 text-emerald-700" /><DetailMetric label="Rejected" value={report.verifications.rejected} helper="decisions" icon={IconAlertCircle} tone="bg-red-50 text-red-700" /><DetailMetric label="Pending now" value={report.verifications.pending_current} helper={`${report.verifications.vendors_pending} vendors · ${report.verifications.services_pending} services`} icon={IconBuildingStore} tone="bg-purple-50 text-purple-700" /></div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><IconShieldCheck className="text-emerald-700" size={19} /><h2 className="text-base font-semibold text-slate-950">Completion issue handling</h2></div><p className="mt-1 text-xs text-slate-500">Operational disputes, not financial disputes.</p><div className="mt-5 space-y-3"><DetailMetric label="Issues reported" value={report.completion_issues.reported} helper="during period" icon={IconAlertCircle} tone="bg-red-50 text-red-700" /><DetailMetric label="Issues resolved" value={report.completion_issues.resolved} helper="during period" icon={IconCheck} tone="bg-emerald-50 text-emerald-700" /><DetailMetric label="Currently open" value={report.completion_issues.open_current} helper="requires action" icon={IconClock} tone="bg-amber-50 text-amber-700" /></div><div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-[10px] leading-5 text-indigo-700">Open count is a live platform snapshot; reported and resolved counts follow the selected period.</div></section>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 shadow-sm"><IconShieldCheck className="mt-0.5 shrink-0 text-indigo-700" size={17} /><p><span className="font-semibold text-slate-900">Report definition:</span> booking metrics follow requests created within the selected period and exclude cart items. CSV exports contain operational records only, are protected for spreadsheet use, and are recorded in the immutable admin audit log.</p></div>
      </div>
    </main>
  );
};

export default AdminOperationsReportPage;
