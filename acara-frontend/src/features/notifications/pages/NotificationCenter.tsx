import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  IconAlertTriangle,
  IconBell,
  IconCalendarCheck,
  IconChecks,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconClipboardCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationFilter,
  type UserNotification,
} from "../api";

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

const notificationStyle = (type: string) => {
  switch (type) {
    case "booking_request":
      return { icon: IconClipboardCheck, className: "bg-purple-100 text-purple-700" };
    case "booking_approved":
      return { icon: IconCircleCheck, className: "bg-emerald-100 text-emerald-700" };
    case "booking_rejected":
      return { icon: IconCircleX, className: "bg-orange-100 text-orange-700" };
    case "booking_cancelled":
      return { icon: IconAlertTriangle, className: "bg-red-100 text-red-700" };
    case "booking_completed":
      return { icon: IconCalendarCheck, className: "bg-blue-100 text-blue-700" };
    default:
      return { icon: IconBell, className: "bg-gray-100 text-gray-600" };
  }
};

const relativeTime = (value: string) => {
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

const dayGroup = (value: string): "Today" | "Yesterday" | "Earlier" => {
  const notificationDate = new Date(value.replace(" ", "T"));
  const today = new Date();
  notificationDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - notificationDate.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return "Earlier";
};

const NotificationCard = ({
  notification,
  onOpen,
  loading,
}: {
  notification: UserNotification;
  onOpen: (notification: UserNotification) => void;
  loading: boolean;
}) => {
  const style = notificationStyle(notification.type);
  const Icon = style.icon;
  const isUnread = !notification.read_at;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      disabled={loading}
      className={`group flex w-full gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md disabled:opacity-60 ${
        isUnread ? "border-purple-100 bg-purple-50/45" : "border-gray-100 bg-white"
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.className}`}>
        <Icon size={21} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={`text-sm text-gray-900 ${isUnread ? "font-black" : "font-bold"}`}>
            {notification.title}
          </span>
          {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-600" />}
        </span>
        <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-gray-600">
          {notification.message}
        </span>
        <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-400">{relativeTime(notification.created_at)}</span>
          {notification.action_url && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 group-hover:text-purple-800">
              View booking <IconChevronRight size={14} />
            </span>
          )}
        </span>
      </span>
    </button>
  );
};

const NotificationCenter = () => {
  usePageTitle("Notifications");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => fetchNotifications(filter),
    staleTime: 15_000,
  });

  const refreshNotificationQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
  };

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: refreshNotificationQueries,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: refreshNotificationQueries,
  });

  const groups = useMemo(() => {
    const notifications = data?.notifications ?? [];
    return (["Today", "Yesterday", "Earlier"] as const)
      .map((label) => ({
        label,
        notifications: notifications.filter((notification) => dayGroup(notification.created_at) === label),
      }))
      .filter((group) => group.notifications.length > 0);
  }, [data?.notifications]);

  const handleOpen = async (notification: UserNotification) => {
    if (!notification.read_at) {
      await markOneMutation.mutateAsync(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#f6f5fb] px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5 pt-12 md:pt-0">
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#18073d] via-[#31106f] to-[#6d28d9] p-6 text-white shadow-xl shadow-purple-900/20 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <IconBell size={23} />
              </span>
              <h1 className="mt-4 text-2xl font-black sm:text-3xl">Notifications</h1>
              <p className="mt-2 text-sm text-purple-100/70">
                Booking requests and status updates from your Acara activity.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200">Unread</p>
              <p className="mt-1 text-2xl font-black">{data?.unread_count ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    filter === item.key
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                      : "bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-60"
              >
                <IconRefresh size={16} className={isFetching ? "animate-spin" : ""} />
                Refresh
              </button>
              {(data?.unread_count ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-60"
                >
                  <IconChecks size={16} />
                  Mark all read
                </button>
              )}
            </div>
          </div>
        </section>

        {isPending ? (
          <section className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-white" />
            ))}
          </section>
        ) : isError ? (
          <section className="rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <p className="font-black text-gray-900">Notifications could not be loaded.</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-bold text-purple-600">
              Try again
            </button>
          </section>
        ) : groups.length === 0 ? (
          <section className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
              <IconCircleCheck size={27} />
            </span>
            <p className="mt-4 font-black text-gray-900">You’re all caught up</p>
            <p className="mt-1 text-sm text-gray-400">
              {filter === "unread" ? "There are no unread notifications." : "New booking activity will appear here."}
            </p>
          </section>
        ) : (
          <section className="space-y-5 pb-8">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-1 text-xs font-black uppercase tracking-widest text-gray-400">{group.label}</p>
                <div className="space-y-2">
                  {group.notifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onOpen={handleOpen}
                      loading={markOneMutation.isPending && markOneMutation.variables === notification.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default NotificationCenter;
