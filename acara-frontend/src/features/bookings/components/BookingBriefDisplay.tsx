import type { BookingBrief } from "../api";

const formatTime = (value?: string | null) => {
  if (!value) return "Not specified";

  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-100">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-5 text-slate-800">{value}</p>
  </div>
);

const BookingBriefDisplay = ({
  brief,
  notes,
  compact = false,
}: {
  brief?: BookingBrief | null;
  notes?: string | null;
  compact?: boolean;
}) => {
  if (!brief) return null;

  const schedule = brief.end_time
    ? `${formatTime(brief.start_time)} – ${formatTime(brief.end_time)}`
    : formatTime(brief.start_time);

  if (compact) {
    return (
      <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/70 px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Event brief</p>
        <p className="mt-1 truncate text-sm font-black text-purple-950">{brief.event_title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-purple-700">
          {brief.event_type} · {brief.venue_name} · {schedule}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-indigo-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Event brief</p>
          <h3 className="mt-1 text-base font-black text-slate-900">{brief.event_title}</h3>
          <p className="mt-0.5 text-xs font-semibold text-purple-700">{brief.event_type}</p>
        </div>
        {brief.is_locked && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            Submitted details
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Event schedule" value={schedule} />
        <Detail label="Vendor setup" value={formatTime(brief.setup_time)} />
        <Detail label="Estimated guests" value={brief.guest_count ? brief.guest_count.toLocaleString("en-MY") : "Not specified"} />
        <Detail label="Venue" value={brief.venue_name} />
        <Detail label="Venue address" value={brief.venue_address} />
        <Detail label="On-day contact" value={`${brief.contact_name}\n${brief.contact_phone}`} />
      </div>

      {(brief.requirements || notes) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {brief.requirements && <Detail label="Service requirements" value={brief.requirements} />}
          {notes && <Detail label="Additional notes" value={notes} />}
        </div>
      )}
    </div>
  );
};

export default BookingBriefDisplay;
