import { IconCheck, IconClock, IconX } from "@tabler/icons-react";

export type BookingTimelineEvent = {
  type: string;
  label: string;
  description: string;
  occurred_at: string;
};

const formatTimestamp = (value: string) =>
  new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const eventStyle = (type: string) => {
  if (["rejected", "cancelled"].includes(type)) {
    return { icon: IconX, dot: "bg-red-500", iconClass: "bg-red-50 text-red-600" };
  }

  if (type === "expired") {
    return { icon: IconClock, dot: "bg-slate-500", iconClass: "bg-slate-100 text-slate-600" };
  }

  if (type === "reminder") {
    return { icon: IconClock, dot: "bg-amber-500", iconClass: "bg-amber-50 text-amber-600" };
  }

  return { icon: IconCheck, dot: "bg-indigo-500", iconClass: "bg-indigo-50 text-indigo-600" };
};

const BookingTimeline = ({ events, compact = false }: { events: BookingTimelineEvent[]; compact?: boolean }) => {
  if (!events.length) return null;

  return (
    <ol className={compact ? "space-y-3" : "space-y-4"}>
      {events.map((event, index) => {
        const style = eventStyle(event.type);
        const Icon = style.icon;

        return (
          <li key={`${event.type}-${event.occurred_at}`} className="relative flex gap-3">
            {index < events.length - 1 && (
              <span className="absolute left-4 top-8 h-[calc(100%+0.25rem)] w-px bg-slate-200" aria-hidden="true" />
            )}
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconClass}`}>
              <Icon size={15} stroke={2.2} />
              <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-white ${style.dot}`} />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <p className="text-sm font-bold text-slate-800">{event.label}</p>
                <time className="shrink-0 text-[11px] font-medium text-slate-400">{formatTimestamp(event.occurred_at)}</time>
              </div>
              {!compact && <p className="mt-1 text-xs leading-5 text-slate-500">{event.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default BookingTimeline;
