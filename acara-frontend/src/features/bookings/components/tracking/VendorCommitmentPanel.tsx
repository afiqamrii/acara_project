import { IconCalendarCheck, IconLock, IconMessageCircle, IconInfoCircle } from "@tabler/icons-react";
import type { BookingItem } from "../../api";
import type { TrackingRole } from "../../utils/orderTracking";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

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

const formatRM = (value = 0) =>
  `RM ${Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const VendorCommitmentPanel = ({
  booking,
  role,
  counterpartLabel,
  onMessage,
}: {
  booking: BookingItem;
  role: TrackingRole;
  counterpartLabel: string;
  onMessage?: () => void;
}) => {
  const amount = booking.quotation?.total_amount ?? booking.price_value;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {role === "vendor" ? "Your commitment" : "Vendor commitment"}
      </p>
      <h2 className="mt-1 text-base font-bold text-slate-900">Locked event terms</h2>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-500"><IconCalendarCheck size={15} /> Committed on</dt>
          <dd className="text-right font-bold text-slate-800">{formatDateTime(booking.confirmed_at)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-500"><IconLock size={15} /> Locked event date</dt>
          <dd className="text-right font-bold text-slate-800">{formatDate(booking.selected_date)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-500"><IconLock size={15} /> Locked price</dt>
          <dd className="text-right font-bold text-slate-800">
            {formatRM(amount)}
            {booking.quotation?.reference && <span className="ml-1 font-normal text-slate-400">({booking.quotation.reference})</span>}
          </dd>
        </div>
      </dl>

      {onMessage && (
        <button
          type="button"
          onClick={onMessage}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
        >
          <IconMessageCircle size={17} />
          Message {counterpartLabel}
        </button>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
        <IconInfoCircle size={15} className="mt-0.5 shrink-0" />
        <span>
          Cancellations should be requested as early as possible. Once the event date has passed, the booking can no
          longer be cancelled — {role === "admin" ? "encourage both parties to resolve last-minute changes through messaging" : `use messaging to resolve any last-minute changes directly with ${role === "vendor" ? "the organizer" : "the vendor"}`}.
        </span>
      </div>
    </section>
  );
};

export default VendorCommitmentPanel;
