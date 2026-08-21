import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  IconCalendarEvent,
  IconChevronRight,
  IconMessageCircle,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import BookingConversation from "../components/BookingConversation";
import {
  fetchVendorConversationSummaries,
  fetchVendorInboxBookings,
  type VendorConversationSummary,
} from "../api";

type Filter = "all" | "unread" | "needs-reply";

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const relativeTime = (value?: string | null) => {
  if (!value) return "No messages";
  const elapsed = Math.max(0, Date.now() - new Date(value.replace(" ", "T")).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : formatDate(value.slice(0, 10));
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const paymentLabel = (value?: string) => {
  if (!value) return "Payment status unavailable";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const VendorMessages = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const selectedId = Number(searchParams.get("thread"));

  usePageTitle("Messages");

  const summariesQuery = useQuery({
    queryKey: ["vendor-booking-conversations"],
    queryFn: fetchVendorConversationSummaries,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const bookingsQuery = useQuery({
    queryKey: ["vendor-bookings", "messages-context"],
    queryFn: fetchVendorInboxBookings,
    staleTime: 30_000,
  });

  const conversations = summariesQuery.data?.conversations ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];
  const bookingById = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings]);
  const query = search.trim().toLowerCase();

  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const needsReply = Boolean(conversation.last_message && !conversation.last_message.is_mine);
    const matchesFilter = filter === "all" || (filter === "unread" ? conversation.unread_message_count > 0 : needsReply);
    const matchesSearch = !query || [
      conversation.customer.name,
      conversation.booking_reference,
      conversation.service_name,
      conversation.last_message?.message ?? "",
    ].some((value) => value.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  }), [conversations, filter, query]);

  const activeConversation = filteredConversations.find((conversation) => conversation.booking_id === selectedId) ?? filteredConversations[0];
  const activeBooking = activeConversation ? bookingById.get(activeConversation.booking_id) : undefined;

  useEffect(() => {
    if (activeConversation && activeConversation.booking_id !== selectedId) {
      setSearchParams({ thread: String(activeConversation.booking_id) }, { replace: true });
    }
  }, [activeConversation, selectedId, setSearchParams]);

  const selectConversation = (conversation: VendorConversationSummary) => {
    setSearchParams({ thread: String(conversation.booking_id) });
  };

  const suggestedReplies: Array<{ label: string; message: string; danger?: boolean }> = activeBooking && activeBooking.payment_status && !["paid", "completed"].includes(activeBooking.payment_status.toLowerCase())
    ? [{ label: "Send payment reminder", message: "Hi, just a quick reminder about the outstanding payment for this booking. Please let me know if you need the invoice again.", danger: true }]
    : [];
  const eventDate = activeConversation ? new Date(`${activeConversation.selected_date}T00:00:00`).getTime() : 0;
  const daysUntilEvent = eventDate ? Math.ceil((eventDate - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : Infinity;
  if (activeConversation && activeConversation.status === "confirmed" && daysUntilEvent <= 14) {
    suggestedReplies.push({ label: "Confirm timing", message: "Hi, I would like to confirm the timing and final arrangements for the upcoming event." });
  }
  suggestedReplies.push({ label: "Share invoice", message: "Hi, I am sharing the invoice for this booking. Please let me know if you have any questions." });

  if (summariesQuery.isPending || bookingsQuery.isPending) {
    return <Loader title="Messages" message="Loading your booking conversations..." />;
  }

  if (summariesQuery.isError) {
    return (
      <main className="rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-bold text-red-700">Messages could not be loaded.</p>
        <button type="button" onClick={() => summariesQuery.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100">
          <IconRefresh size={16} /> Try again
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-12rem)]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Vendor workspace</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">Keep every booking conversation attached to its service record.</p>
        </div>
        <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm sm:max-w-xs">
          <IconSearch size={17} />
          <span className="sr-only">Search messages</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        </label>
      </div>

      <section className="grid min-h-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.9fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 bg-white px-4 py-4">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "unread", "needs-reply"] as Filter[]).map((item) => {
                const label = item === "needs-reply" ? "Needs reply" : item[0].toUpperCase() + item.slice(1);
                const count = item === "all"
                  ? conversations.length
                  : conversations.filter((conversation) => item === "unread" ? conversation.unread_message_count > 0 : Boolean(conversation.last_message && !conversation.last_message.is_mine)).length;
                return (
                  <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-3 py-1.5 text-xs font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-100 ${filter === item ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
                    {label} <span className="ml-1 opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <IconMessageCircle className="mx-auto text-slate-300" size={30} />
                <p className="mt-3 text-sm font-bold text-slate-700">No conversations match this view</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Try another filter or search term.</p>
              </div>
            ) : filteredConversations.map((conversation) => {
              const needsReply = Boolean(conversation.last_message && !conversation.last_message.is_mine);
              const selected = conversation.booking_id === activeConversation?.booking_id;
              return (
                <button key={conversation.booking_id} type="button" onClick={() => selectConversation(conversation)} className={`flex w-full items-start gap-3 border-b border-slate-200 px-4 py-4 text-left outline-none transition focus-visible:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300 ${selected ? "bg-white shadow-[inset_3px_0_0_#6f52a3]" : "hover:bg-white"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">{initials(conversation.customer.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block max-w-full break-words text-sm font-black leading-5 text-slate-900">{conversation.customer.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">{conversation.booking_reference}</span>
                      <span className="text-[11px] leading-4 text-slate-500">{conversation.service_name} · {formatDate(conversation.selected_date)}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{conversation.last_message ? `${conversation.last_message.is_mine ? "You: " : ""}${conversation.last_message.message}` : "Start a conversation about this booking"}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2 text-[10px] text-slate-400">
                    <span>{relativeTime(conversation.last_message?.created_at)}</span>
                    {conversation.unread_message_count > 0 ? <span className="h-2 w-2 rounded-full bg-indigo-600" aria-label="Unread" /> : needsReply ? <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-600">Reply</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {activeConversation ? (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">{initials(activeConversation.customer.name)}</span>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-slate-900">{activeConversation.customer.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{activeConversation.booking_reference}</p>
                </div>
                <button type="button" onClick={() => navigate(`/vendor/bookings/${activeConversation.booking_id}`)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 outline-none transition hover:bg-indigo-50 focus-visible:ring-4 focus-visible:ring-indigo-100">
                  View booking <IconChevronRight size={14} />
                </button>
              </header>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-indigo-100 bg-indigo-50 px-5 py-3 text-xs text-indigo-950">
                <span className="inline-flex items-center gap-1.5 font-bold"><IconMessageCircle size={14} /> {activeConversation.service_name}</span>
                <span className="inline-flex items-center gap-1.5"><IconCalendarEvent size={14} /> {formatDate(activeConversation.selected_date)}</span>
                <span>{activeBooking?.price || (activeBooking?.price_value ? `RM ${activeBooking.price_value.toLocaleString("en-MY", { minimumFractionDigits: 2 })}` : "Price unavailable")}</span>
                <span className="font-bold">{paymentLabel(activeBooking?.payment_status)}</span>
              </div>
              <div className="min-h-0 flex-1 p-4">
                <BookingConversation bookingId={activeConversation.booking_id} messageCount={activeConversation.message_count} unreadCount={activeConversation.unread_message_count} title={`Conversation with ${activeConversation.customer.name}`} suggestedReplies={suggestedReplies} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <IconMessageCircle size={34} className="text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700">Select a conversation</p>
              <p className="mt-1 text-xs text-slate-500">Choose a booking from the list to open its message thread.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default VendorMessages;
