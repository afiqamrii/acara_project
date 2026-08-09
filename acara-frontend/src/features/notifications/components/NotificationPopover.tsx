import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IconChevronRight, IconCheck } from "@tabler/icons-react";
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, type UserNotification } from "../api";
import { notificationStyle, notificationActionLabel, relativeTime } from "../utils";

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPopover = ({ isOpen, onClose }: NotificationPopoverProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const { data, isPending } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => fetchNotifications("unread"),
    staleTime: 15_000,
    enabled: isOpen,
  });

  const refreshQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
  };

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: refreshQueries,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: refreshQueries,
  });

  const handleOpen = (notification: UserNotification) => {
    if (!notification.read_at) {
      markOneMutation.mutate(notification.id);
    }
    onClose();
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const unreadNotifications = data?.notifications?.slice(0, 5) ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] sm:w-[380px]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h3 className="font-bold text-slate-900">Notifications</h3>
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-purple-600 transition hover:bg-purple-50 disabled:opacity-50"
              >
                <IconCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isPending ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600"></div>
                <p className="text-xs text-slate-500">Loading notifications...</p>
              </div>
            ) : unreadNotifications.length > 0 ? (
              <div className="flex flex-col divide-y divide-slate-100">
                {unreadNotifications.map((notification) => {
                  const style = notificationStyle(notification.type);
                  const Icon = style.icon;
                  const isRead = !!notification.read_at;

                  return (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => handleOpen(notification)}
                      className={`group relative flex w-full gap-3 p-4 text-left transition hover:bg-slate-50 ${
                        !isRead ? "bg-white" : "bg-slate-50/50 opacity-70"
                      }`}
                    >
                      {!isRead && (
                        <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-purple-600"></span>
                      )}
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.className} ml-2`}
                      >
                        <Icon size={20} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-slate-900 truncate ${!isRead ? "font-bold" : "font-medium"}`}>
                          {notification.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
                          {notification.message}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            {relativeTime(notification.created_at)}
                          </span>
                          {notification.action_url && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-600 group-hover:text-purple-800">
                              {notificationActionLabel(notification.type)}
                              <IconChevronRight size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                  <IconCheck size={24} />
                </div>
                <p className="font-bold text-slate-900">You&apos;re all caught up!</p>
                <p className="mt-1 max-w-[240px] text-xs text-slate-500">
                  You have no new notifications right now.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-2">
            <Link
              to="/notifications"
              onClick={onClose}
              className="block w-full rounded-xl py-2 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-purple-700"
            >
              View all notifications
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPopover;
