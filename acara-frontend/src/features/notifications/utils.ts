import {
  IconAlertTriangle,
  IconBell,
  IconCalendarCheck,
  IconCircleCheck,
  IconCircleX,
  IconClipboardCheck,
  IconClock,
  IconMessageCircle,
  IconStar,
} from "@tabler/icons-react";

export const notificationStyle = (type: string) => {
  switch (type) {
    case "booking_request":
      return { icon: IconClipboardCheck, className: "bg-purple-100 text-purple-700" };
    case "booking_message":
      return { icon: IconMessageCircle, className: "bg-indigo-100 text-indigo-700" };
    case "booking_approved":
      return { icon: IconCircleCheck, className: "bg-emerald-100 text-emerald-700" };
    case "booking_rejected":
      return { icon: IconCircleX, className: "bg-orange-100 text-orange-700" };
    case "booking_cancelled":
      return { icon: IconAlertTriangle, className: "bg-red-100 text-red-700" };
    case "booking_completed":
      return { icon: IconCalendarCheck, className: "bg-blue-100 text-blue-700" };
    case "booking_expiry_reminder":
      return { icon: IconClock, className: "bg-amber-100 text-amber-700" };
    case "booking_expired":
      return { icon: IconClock, className: "bg-slate-200 text-slate-700" };
    case "review_received":
      return { icon: IconStar, className: "bg-amber-100 text-amber-700" };
    case "service_approved":
      return { icon: IconCircleCheck, className: "bg-emerald-100 text-emerald-700" };
    case "service_rejected":
      return { icon: IconAlertTriangle, className: "bg-orange-100 text-orange-700" };
    case "account_suspended":
      return { icon: IconAlertTriangle, className: "bg-red-100 text-red-700" };
    case "account_reactivated":
      return { icon: IconCircleCheck, className: "bg-emerald-100 text-emerald-700" };
    default:
      return { icon: IconBell, className: "bg-gray-100 text-gray-600" };
  }
};

export const notificationActionLabel = (type: string) => {
  if (type === "booking_message") return "Open conversation";
  if (type === "review_received") return "View review";
  if (type === "service_approved" || type === "service_rejected") return "Manage service";
  if (type === "account_reactivated") return "View account";
  return "View booking";
};

export const relativeTime = (value: string) => {
  const timestamp = new Date(value.replace(" ", "T")).getTime();
  const difference = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(difference / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(timestamp).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
