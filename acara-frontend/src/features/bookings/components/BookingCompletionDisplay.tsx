import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconFileDescription,
  IconShieldCheck,
} from "@tabler/icons-react";
import type { BookingCompletion } from "../api";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusMeta: Record<string, { label: string; classes: string; icon: typeof IconClock }> = {
  pending: { label: "Awaiting organizer", classes: "bg-amber-50 text-amber-700 ring-amber-200", icon: IconClock },
  disputed: { label: "Admin review", classes: "bg-red-50 text-red-700 ring-red-200", icon: IconAlertTriangle },
  confirmed: { label: "Organizer confirmed", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: IconCheck },
  auto_confirmed: { label: "Auto-confirmed", classes: "bg-blue-50 text-blue-700 ring-blue-200", icon: IconClock },
  resolved_completed: { label: "Admin approved", classes: "bg-indigo-50 text-indigo-700 ring-indigo-200", icon: IconShieldCheck },
  resolved_reopened: { label: "Returned to vendor", classes: "bg-orange-50 text-orange-700 ring-orange-200", icon: IconShieldCheck },
};

const BookingCompletionDisplay = ({
  completion,
  compact = false,
  showDisputeReason = true,
}: {
  completion: BookingCompletion;
  compact?: boolean;
  showDisputeReason?: boolean;
}) => {
  const meta = statusMeta[completion.status] ?? statusMeta.pending;
  const StatusIcon = meta.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Completion submission</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Submitted {formatDateTime(completion.submitted_at)}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${meta.classes}`}>
          <StatusIcon size={14} />
          {meta.label}
        </span>
      </div>

      <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 ${compact ? "line-clamp-3" : ""}`}>
        {completion.completion_note}
      </p>

      {completion.proof_url && (
        <a
          href={completion.proof_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
        >
          <IconFileDescription size={16} />
          <span className="max-w-[220px] truncate">{completion.proof_name || "View completion proof"}</span>
          <IconExternalLink size={14} />
        </a>
      )}

      {completion.status === "pending" && (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
          <IconClock size={15} /> Response due {formatDateTime(completion.response_due_at)}
        </p>
      )}

      {showDisputeReason && completion.dispute_reason && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-red-600">Organizer issue</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-red-900">{completion.dispute_reason}</p>
        </div>
      )}

      {completion.resolution_note && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">Administrator resolution</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-indigo-900">{completion.resolution_note}</p>
        </div>
      )}
    </div>
  );
};

export default BookingCompletionDisplay;
