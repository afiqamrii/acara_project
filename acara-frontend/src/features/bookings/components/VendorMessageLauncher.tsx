import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  IconCalendarEvent,
  IconChevronRight,
  IconMessageCircle,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { fetchVendorConversationSummaries } from "../api";

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const truncate = (value: string, length = 80) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

const VendorMessageLauncher = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const isVendor = user?.role === "vendor" && user.profile_completed;

  const conversationQuery = useQuery({
    queryKey: ["vendor-booking-conversations"],
    queryFn: fetchVendorConversationSummaries,
    enabled: isVendor,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  if (!isVendor) return null;

  const conversations = conversationQuery.data?.conversations ?? [];
  const unreadCount = conversationQuery.data?.unread_count ?? 0;

  const openConversation = (bookingId: number) => {
    setOpen(false);
    navigate(`/vendor/bookings/${bookingId}?conversation=1`);
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close booking messages"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-slate-950/10 backdrop-blur-[1px]"
        />
      )}

      <div className="fixed bottom-5 right-5 z-[45] sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {open && (
            <motion.section
              id="vendor-message-launcher-panel"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-[4.5rem] right-0 w-[min(23rem,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
            >
              <header className="bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-4 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">Vendor inbox</p>
                    <h2 className="mt-1 text-lg font-black">Booking messages</h2>
                    <p className="mt-1 text-xs text-indigo-100">
                      {unreadCount > 0 ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}` : "All conversations are up to date"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Close booking messages"
                  >
                    <IconX size={18} />
                  </button>
                </div>
              </header>

              <div className="max-h-[26rem] overflow-y-auto bg-slate-50/70 p-3">
                {conversationQuery.isPending ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-white" />)}
                  </div>
                ) : conversationQuery.isError ? (
                  <div className="rounded-2xl bg-white p-6 text-center">
                    <p className="text-sm font-bold text-slate-800">Messages could not be loaded.</p>
                    <button type="button" onClick={() => conversationQuery.refetch()} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-indigo-600">
                      <IconRefresh size={15} /> Try again
                    </button>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="rounded-2xl bg-white p-7 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><IconMessageCircle size={24} /></span>
                    <p className="mt-3 text-sm font-black text-slate-900">No booking conversations yet</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Messages from organizers will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.slice(0, 12).map((conversation) => (
                      <button
                        type="button"
                        key={conversation.booking_id}
                        onClick={() => openConversation(conversation.booking_id)}
                        className={`group flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition hover:border-indigo-200 hover:bg-white hover:shadow-sm ${conversation.unread_message_count > 0 ? "border-indigo-200 bg-indigo-50/80" : "border-slate-100 bg-white"}`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-black text-white">
                          {conversation.customer.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-black text-slate-900">{conversation.customer.name}</span>
                            {conversation.unread_message_count > 0 && (
                              <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white">{conversation.unread_message_count} new</span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-indigo-600">{conversation.service_name} · {conversation.booking_reference}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {conversation.last_message
                              ? `${conversation.last_message.is_mine ? "You: " : ""}${truncate(conversation.last_message.message)}`
                              : "Start a conversation about this booking"}
                          </span>
                          <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-slate-400"><IconCalendarEvent size={12} /> {formatDate(conversation.selected_date)}</span>
                        </span>
                        <IconChevronRight size={17} className="mt-3 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <footer className="border-t border-slate-100 bg-white p-3">
                <button
                  type="button"
                  onClick={() => { setOpen(false); navigate("/vendor/bookings"); }}
                  className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  View all booking requests
                </button>
              </footer>
            </motion.section>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close booking messages" : "Open booking messages"}
          aria-expanded={open}
          aria-controls="vendor-message-launcher-panel"
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl shadow-purple-300/60 ring-4 ring-white transition hover:shadow-2xl"
        >
          {open ? <IconX size={24} /> : <IconMessageCircle size={26} />}
          {unreadCount > 0 && !open && (
            <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
};

export default VendorMessageLauncher;
