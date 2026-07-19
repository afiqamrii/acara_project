import { IconChevronRight } from "@tabler/icons-react";
import type { BookingItem } from "../../api";
import { mergeTrackingTimeline, type ActorRole } from "../../utils/orderTracking";

const ACTOR_LABEL: Record<ActorRole, string> = {
  customer: "Organizer",
  vendor: "Vendor",
  admin: "Admin",
  system: "System",
};

const formatTimestamp = (value: string) =>
  new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const TrackingSummaryCard = ({ booking, onViewDetails }: { booking: BookingItem; onViewDetails: () => void }) => {
  const entries = mergeTrackingTimeline(booking);
  const latest = entries[entries.length - 1];

  if (!latest) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {booking.portfolio_url ? (
          <img src={booking.portfolio_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="h-12 w-12 shrink-0 rounded-xl bg-slate-100" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Latest update · {ACTOR_LABEL[latest.actor]}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{latest.label}</p>
          <p className="mt-0.5 text-xs text-slate-400">{formatTimestamp(latest.occurred_at)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onViewDetails}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
      >
        View Full Details
        <IconChevronRight size={15} />
      </button>
    </div>
  );
};

export default TrackingSummaryCard;
