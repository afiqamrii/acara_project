import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  IconCheck,
  IconChevronDown,
  IconLock,
  IconMessageCircle,
  IconRefresh,
  IconSend,
} from "@tabler/icons-react";
import {
  fetchBookingConversation,
  markBookingConversationRead,
  sendBookingMessage,
} from "../api";

const formatMessageTime = (value: string) =>
  new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const errorMessage = (error: unknown) =>
  (error as AxiosError<{ message?: string }>).response?.data?.message ?? "The message could not be sent.";

const BookingConversation = ({
  bookingId,
  defaultOpen = false,
  messageCount = 0,
  unreadCount = 0,
  title = "Booking conversation",
}: {
  bookingId: number;
  defaultOpen?: boolean;
  messageCount?: number;
  unreadCount?: number;
  title?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const markRequestedRef = useRef(false);
  const queryClient = useQueryClient();

  const conversationQuery = useQuery({
    queryKey: ["booking-conversation", bookingId],
    queryFn: () => fetchBookingConversation(bookingId),
    enabled: open,
    staleTime: 5_000,
    refetchInterval: open ? 15_000 : false,
  });

  const refreshConversationState = () => {
    queryClient.invalidateQueries({ queryKey: ["booking-conversation", bookingId] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    queryClient.invalidateQueries({ queryKey: ["vendor-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-booking-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
  };

  const markReadMutation = useMutation({
    mutationFn: () => markBookingConversationRead(bookingId),
    onSuccess: refreshConversationState,
    onError: () => {
      markRequestedRef.current = false;
    },
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => sendBookingMessage({ bookingId, message }),
    onSuccess: () => {
      setDraft("");
      refreshConversationState();
    },
  });

  const conversation = conversationQuery.data;
  const currentUnreadCount = conversation?.unread_count ?? unreadCount;
  const currentMessageCount = conversation?.messages.length ?? messageCount;
  const lastMessageId = conversation?.messages.at(-1)?.id;

  useEffect(() => {
    const unreadMessages = conversation?.unread_count ?? 0;

    if (unreadMessages === 0) {
      markRequestedRef.current = false;
    }

    if (open && conversation?.participant_role !== "admin" && unreadMessages > 0 && !markRequestedRef.current && !markReadMutation.isPending) {
      markRequestedRef.current = true;
      markReadMutation.mutate();
    }
  }, [conversation?.participant_role, conversation?.unread_count, markReadMutation, open]);

  useEffect(() => {
    if (open && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [lastMessageId, open]);

  const submit = () => {
    const message = draft.trim();
    if (!message || message.length > 2000 || sendMutation.isPending) return;
    sendMutation.mutate(message);
  };

  return (
    <section id={`booking-conversation-${bookingId}`} className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 px-4 py-3.5 text-left transition hover:from-indigo-100/70 hover:to-purple-100/70"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <IconMessageCircle size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-slate-900">{title}</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {currentMessageCount > 0 ? `${currentMessageCount} message${currentMessageCount === 1 ? "" : "s"} in this record` : "Start a booking-specific conversation"}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {currentUnreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">{currentUnreadCount} unread</span>
          )}
          <IconChevronDown size={18} className={`text-indigo-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="border-t border-indigo-100">
          {conversationQuery.isPending ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((item) => <div key={item} className={`h-14 animate-pulse rounded-2xl bg-slate-100 ${item === 1 ? "ml-auto w-3/4" : "w-4/5"}`} />)}
            </div>
          ) : conversationQuery.isError ? (
            <div className="p-5 text-center">
              <p className="text-sm font-bold text-red-700">Conversation could not be loaded.</p>
              <button type="button" onClick={() => conversationQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                <IconRefresh size={15} /> Try again
              </button>
            </div>
          ) : conversation ? (
            <>
              {conversation.read_only_reason && (
                <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                  <IconLock size={16} className="mt-0.5 shrink-0 text-slate-500" />
                  {conversation.read_only_reason}
                </div>
              )}

              <div ref={messageListRef} className="max-h-[380px] min-h-48 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
                {conversation.messages.length === 0 ? (
                  <div className="flex min-h-40 flex-col items-center justify-center text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><IconMessageCircle size={24} /></span>
                    <p className="mt-3 text-sm font-black text-slate-800">No messages yet</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Keep questions, confirmations, and service arrangements attached to this booking.</p>
                  </div>
                ) : (
                  conversation.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.is_mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] sm:max-w-[78%] ${message.is_mine ? "text-right" : "text-left"}`}>
                        <div className="mb-1 flex items-center justify-between gap-3 px-1 text-[10px] font-bold text-slate-400">
                          <span>{message.is_mine ? "You" : message.sender.name}</span>
                          <span>{message.sender.role === "vendor" ? "Vendor" : "Organizer"}</span>
                        </div>
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${message.is_mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700"}`}>
                          <p className="whitespace-pre-wrap break-words">{message.message}</p>
                        </div>
                        <div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400 ${message.is_mine ? "justify-end" : "justify-start"}`}>
                          <span>{formatMessageTime(message.created_at)}</span>
                          {message.is_mine && <><span>·</span><IconCheck size={12} /><span>{message.read_at ? "Read" : "Sent"}</span></>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {conversation.can_send && (
                <div className="border-t border-slate-100 bg-white p-3.5">
                  <div className="flex items-end gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Message</span>
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit();
                        }}
                        maxLength={2000}
                        rows={2}
                        placeholder="Write a booking message..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-5 text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!draft.trim() || sendMutation.isPending}
                      aria-label="Send message"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconSend size={18} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] text-slate-400">
                    <span>Ctrl/⌘ + Enter to send</span><span>{draft.length}/2000</span>
                  </div>
                  {sendMutation.isError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{errorMessage(sendMutation.error)}</p>}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default BookingConversation;
