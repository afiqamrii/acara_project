import { IconAlertTriangle } from "@tabler/icons-react";
import type { BookingItem } from "../../api";
import { STAGE_ORDER } from "../../utils/orderTracking";

const daysSince = (value: string) => {
  const then = new Date(`${value}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then) / (1000 * 60 * 60 * 24));
};

const computeRiskFlags = (booking: BookingItem): string[] => {
  const flags: string[] = [];
  const status = booking.status;
  const eventPassedDays = daysSince(booking.selected_date);

  if (status === "confirmed" && eventPassedDays > 2) {
    flags.push("Event date has passed but the service has not been marked completed.");
  }

  if (status === "confirmed" && eventPassedDays >= -1) {
    const latestStage = booking.tracking_updates?.length
      ? STAGE_ORDER.indexOf(booking.tracking_updates[booking.tracking_updates.length - 1].stage)
      : -1;
    if (latestStage < 1) {
      flags.push("The vendor has not posted a tracking update as the event date approaches.");
    }
  }

  if (status === "completion_disputed") {
    flags.push("Completion is disputed and needs administrator resolution.");
  }

  return flags;
};

const AdminRiskFlags = ({ booking }: { booking: BookingItem }) => {
  const flags = computeRiskFlags(booking);
  if (!flags.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((flag) => (
        <span key={flag} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
          <IconAlertTriangle size={14} />
          {flag}
        </span>
      ))}
    </div>
  );
};

export default AdminRiskFlags;
