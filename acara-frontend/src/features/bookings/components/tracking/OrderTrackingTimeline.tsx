import type { ReactNode } from "react";
import { IconBuildingStore, IconUser, IconRobot, IconShieldCheck, IconMapPin } from "@tabler/icons-react";
import type { BookingItem } from "../../api";
import { mergeTrackingTimeline, type ActorRole } from "../../utils/orderTracking";

const formatTimestamp = (value: string) =>
  new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const ACTOR_META: Record<ActorRole, { label: string; className: string; icon: ReactNode }> = {
  customer: { label: "Organizer", className: "bg-indigo-50 text-indigo-700", icon: <IconUser size={12} /> },
  vendor: { label: "Vendor", className: "bg-purple-50 text-purple-700", icon: <IconBuildingStore size={12} /> },
  admin: { label: "Admin", className: "bg-red-50 text-red-700", icon: <IconShieldCheck size={12} /> },
  system: { label: "System", className: "bg-slate-100 text-slate-600", icon: <IconRobot size={12} /> },
};

const OrderTrackingTimeline = ({ booking }: { booking: BookingItem }) => {
  const entries = mergeTrackingTimeline(booking);

  if (!entries.length) {
    return <p className="text-sm text-slate-500">No tracking activity is available yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry, index) => {
        const actor = ACTOR_META[entry.actor];
        return (
          <li key={entry.key} className="relative flex gap-3">
            {index < entries.length - 1 && (
              <span className="absolute left-4 top-8 h-[calc(100%+0.25rem)] w-px bg-slate-200" aria-hidden="true" />
            )}
            <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <span className="h-2 w-2 rounded-full bg-current" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-slate-800">{entry.label}</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${actor.className}`}>
                  {actor.icon}
                  {actor.label}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{entry.description}</p>
              <time className="mt-1 block text-[11px] font-medium text-slate-400">{formatTimestamp(entry.occurred_at)}</time>
              {(entry.photoUrl || entry.mapUrl) && (
                <div className="mt-2 flex items-center gap-3">
                  {entry.photoUrl && (
                    <a href={entry.photoUrl} target="_blank" rel="noreferrer">
                      <img src={entry.photoUrl} alt="Arrival verification" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                    </a>
                  )}
                  {entry.mapUrl && (
                    <a
                      href={entry.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800"
                    >
                      <IconMapPin size={13} /> View location
                    </a>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default OrderTrackingTimeline;
