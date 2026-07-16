import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { AxiosError } from "axios";
import {
  IconAlertCircle,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconCurrencyDollar,
  IconArrowsExchange,
  IconMapPin,
  IconSearch,
  IconShoppingBag,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import BookingTimeline from "../components/BookingTimeline";
import {
  cancelCustomerBooking,
  fetchRescheduleAvailability,
  fetchCustomerBookings,
  requestBookingReschedule,
  type BookingItem,
  type BookingStats,
  withdrawBookingReschedule,
} from "../api";

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "expired", label: "Expired" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

const statusMeta: Record<string, { label: string; className: string; icon: ReactNode }> = {
  pending: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: <IconAlertCircle size={13} />,
  },
  confirmed: {
    label: "Confirmed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: <IconCheck size={13} />,
  },
  completed: {
    label: "Completed",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    icon: <IconCheck size={13} />,
  },
  expired: {
    label: "Expired",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: <IconClock size={13} />,
  },
  rejected: {
    label: "Rejected",
    className: "border-orange-200 bg-orange-50 text-orange-700",
    icon: <IconX size={13} />,
  },
  cancelled: {
    label: "Cancelled",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: <IconX size={13} />,
  },
};

const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatRM = (value = 0) =>
  `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const buildStats = (bookings: BookingItem[]): BookingStats => ({
  total: bookings.length,
  pending: bookings.filter((booking) => booking.status === "pending").length,
  confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
  completed: bookings.filter((booking) => booking.status === "completed").length,
  rejected: bookings.filter((booking) => booking.status === "rejected").length,
  cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
  expired: bookings.filter((booking) => booking.status === "expired").length,
  estimate: bookings.reduce((sum, booking) => sum + Number(booking.price_value || 0), 0),
});

const StatusBadge = ({ status }: { status: string }) => {
  const meta = statusMeta[status] ?? statusMeta.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </span>
    </div>
    <p className="mt-3 text-2xl font-black text-gray-900">{value}</p>
  </div>
);

const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>).response?.data?.message ?? fallback;

const RescheduleDialog = ({
  booking,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  booking: BookingItem;
  onClose: () => void;
  onSubmit: (requestedDate: string, reason: string) => void;
  submitting: boolean;
  error?: string;
}) => {
  const [requestedDate, setRequestedDate] = useState("");
  const [reason, setReason] = useState("");
  const availability = useQuery({
    queryKey: ["reschedule-availability", booking.id],
    queryFn: () => fetchRescheduleAvailability(booking.id),
    staleTime: 15_000,
  });
  const trimmedReason = reason.trim();
  const canSubmit = requestedDate.length > 0 && trimmedReason.length >= 10 && !submitting;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Date Change Request</p>
            <h3 className="mt-2 text-xl font-black text-slate-900">Request a new event date</h3>
            <p className="mt-1 text-sm text-slate-500">{booking.service_name} · {booking.booking_reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Current confirmed date</p>
            <p className="mt-1 text-sm font-bold text-indigo-950">{formatDate(booking.selected_date)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Slot protection</p>
            <p className="mt-1 text-xs leading-5 text-indigo-800">Your current date stays reserved until the vendor approves.</p>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-bold text-slate-700">Requested date</span>
          <select
            value={requestedDate}
            onChange={(event) => setRequestedDate(event.target.value)}
            disabled={availability.isPending || submitting}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          >
            <option value="">{availability.isPending ? "Loading available dates..." : "Select an available date"}</option>
            {(availability.data?.dates ?? []).map((date) => (
              <option key={date} value={date}>{formatDate(date)}</option>
            ))}
          </select>
        </label>

        {!availability.isPending && (availability.data?.dates.length ?? 0) === 0 && (
          <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            This vendor has no other future dates available right now.
          </p>
        )}

        <label className="mt-4 block">
          <span className="flex items-center justify-between text-xs font-bold text-slate-700">
            Reason for changing the date
            <span className="font-medium text-slate-400">{reason.length}/1000</span>
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Explain why the event date needs to change..."
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />
          {trimmedReason.length > 0 && trimmedReason.length < 10 && (
            <span className="mt-1 block text-xs text-red-500">Please enter at least 10 characters.</span>
          )}
        </label>

        {(error || availability.isError) && (
          <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error ?? "Available dates could not be loaded. Please try again."}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Keep current date
          </button>
          <button
            type="button"
            onClick={() => onSubmit(requestedDate, trimmedReason)}
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-100 hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending request..." : "Send to vendor"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const BookingCard = ({
  booking,
  onCancel,
  onReschedule,
  onWithdrawReschedule,
  cancelling,
  withdrawing,
}: {
  booking: BookingItem;
  onCancel: (id: number) => void;
  onReschedule: (booking: BookingItem) => void;
  onWithdrawReschedule: (id: number) => void;
  cancelling: boolean;
  withdrawing: boolean;
}) => {
  const navigate = useNavigate();
  const canCancel =
    (booking.status === "pending" || booking.status === "confirmed") &&
    booking.selected_date >= todayIso();
  const canReschedule =
    booking.status === "confirmed" &&
    booking.selected_date > todayIso() &&
    !booking.reschedule_request;
  const latestReschedule = booking.reschedule_history?.[0];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
              {booking.booking_reference}
            </span>
            <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">
              {booking.category}
            </span>
          </div>

          <h2 className="mt-3 truncate text-lg font-black text-gray-900">{booking.service_name}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {booking.vendor_name || booking.vendor || "Vendor"} - {booking.price}
            {booking.pricing_unit ? ` / ${booking.pricing_unit}` : ""}
          </p>

          <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <IconCalendarEvent size={17} className="text-purple-500" />
              <span>{formatDate(booking.selected_date)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <IconMapPin size={17} className="text-red-400" />
              <span className="truncate">{booking.location || "Malaysia"}</span>
            </div>
          </div>

          {booking.status === "pending" && booking.expires_at && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
              <IconClock size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Vendor response deadline</p>
                <p className="mt-1 text-sm text-amber-900">{formatDateTime(booking.expires_at)}</p>
              </div>
            </div>
          )}

          {booking.status === "expired" && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Closed automatically</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                The vendor did not respond before the deadline. No cancellation reason is required, and this date is available to request again.
              </p>
            </div>
          )}

          {booking.status === "rejected" && booking.rejection_reason && (
            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Vendor rejection reason</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-orange-900">{booking.rejection_reason}</p>
            </div>
          )}

          {booking.status === "cancelled" && booking.cancelled_by === "vendor" && booking.cancellation_reason && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">Vendor cancellation reason</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-red-900">{booking.cancellation_reason}</p>
            </div>
          )}

          {booking.reschedule_request && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
                    <IconArrowsExchange size={16} />
                    Date change awaiting vendor
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatDate(booking.reschedule_request.original_date)} → {formatDate(booking.reschedule_request.requested_date)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{booking.reschedule_request.reason}</p>
                  <p className="mt-2 text-[11px] text-indigo-600">Your original date remains reserved until a decision is made.</p>
                </div>
                <button
                  type="button"
                  onClick={() => onWithdrawReschedule(booking.id)}
                  disabled={withdrawing}
                  className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  {withdrawing ? "Withdrawing..." : "Withdraw request"}
                </button>
              </div>
            </div>
          )}

          {!booking.reschedule_request && latestReschedule?.status === "rejected" && (
            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-orange-700">
                <IconArrowsExchange size={16} />
                Latest date change declined
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                Requested {formatDate(latestReschedule.requested_date)} · Current date remains {formatDate(booking.selected_date)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-orange-800">
                {latestReschedule.decision_reason || "The vendor could not accept the requested date."}
              </p>
            </div>
          )}

          {(booking.timeline?.length ?? 0) > 0 && (
            <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 open:bg-slate-50/60">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">Booking activity</summary>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <BookingTimeline events={booking.timeline ?? []} />
              </div>
            </details>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
          <button
            type="button"
            onClick={() => navigate(`/marketplace/${booking.service_id}`)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <IconShoppingBag size={17} />
            Service
          </button>
          {booking.status === "completed" && (
            <button
              type="button"
              onClick={() => navigate("/reviews")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <IconStar size={17} />
              Review
            </button>
          )}
          {canReschedule && (
            <button
              type="button"
              onClick={() => onReschedule(booking)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              <IconArrowsExchange size={17} />
              Change date
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
            >
              <IconX size={17} />
              {cancelling ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

const CustomerBookings = () => {
  usePageTitle("My Bookings");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingItem | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchCustomerBookings,
    staleTime: 1000 * 30,
  });

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);
  const stats = data?.stats ?? buildStats(bookings);

  const cancelMutation = useMutation({
    mutationFn: cancelCustomerBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: requestBookingReschedule,
    onSuccess: () => {
      setRescheduleBooking(null);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawBookingReschedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus = activeTab === "all" || booking.status === activeTab;
      const matchesSearch =
        !query ||
        booking.service_name.toLowerCase().includes(query) ||
        (booking.vendor_name || booking.vendor || "").toLowerCase().includes(query) ||
        booking.booking_reference.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [activeTab, bookings, search]);

  const handleCancel = (id: number) => {
    if (window.confirm("Cancel this booking request?")) {
      cancelMutation.mutate(id);
    }
  };

  const handleWithdrawReschedule = (id: number) => {
    if (window.confirm("Withdraw this date change request and keep the original confirmed date?")) {
      withdrawMutation.mutate(id);
    }
  };

  if (isPending) {
    return <Loader title="My Bookings" message="Loading your booking timeline..." />;
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#f7f8fc]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <section className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-100">Booking Center</p>
              <h1 className="mt-2 text-2xl font-black md:text-3xl">My Bookings</h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100">
                Track every vendor request, response deadline, confirmation, and closure from one organized workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/marketplace")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <IconShoppingBag size={18} />
              Browse Services
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Bookings" value={String(stats.total)} icon={<IconCalendarEvent size={21} />} />
          <StatCard label="Pending" value={String(stats.pending)} icon={<IconClock size={21} />} />
          <StatCard label="Confirmed" value={String(stats.confirmed)} icon={<IconCheck size={21} />} />
          <StatCard label="Estimated Spend" value={formatRM(stats.estimate)} icon={<IconCurrencyDollar size={21} />} />
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                      : "bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:max-w-xs">
              <IconSearch size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bookings"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </div>
        </section>

        {cancelMutation.isError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            Could not cancel this booking. Please refresh and try again.
          </div>
        )}

        {isError ? (
          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <p className="font-bold text-gray-900">Bookings could not be loaded.</p>
            <p className="mt-1 text-sm text-gray-500">Please check your connection and try again.</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <IconCalendarEvent size={28} />
            </div>
            <p className="mt-4 text-lg font-black text-gray-900">No bookings found</p>
            <p className="mt-1 text-sm text-gray-500">Try a different filter or browse services to start a new booking.</p>
          </div>
        ) : (
          <section className="space-y-3">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                onReschedule={(booking) => {
                  rescheduleMutation.reset();
                  setRescheduleBooking(booking);
                }}
                onWithdrawReschedule={handleWithdrawReschedule}
                cancelling={cancelMutation.isPending && cancelMutation.variables === booking.id}
                withdrawing={withdrawMutation.isPending && withdrawMutation.variables === booking.id}
              />
            ))}
          </section>
        )}

        {withdrawMutation.isError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {apiErrorMessage(withdrawMutation.error, "The date change request could not be withdrawn.")}
          </div>
        )}
      </div>

      {rescheduleBooking && (
        <RescheduleDialog
          booking={rescheduleBooking}
          onClose={() => !rescheduleMutation.isPending && setRescheduleBooking(null)}
          onSubmit={(requestedDate, reason) => rescheduleMutation.mutate({
            id: rescheduleBooking.id,
            requestedDate,
            reason,
          })}
          submitting={rescheduleMutation.isPending}
          error={rescheduleMutation.isError
            ? apiErrorMessage(rescheduleMutation.error, "The date change request could not be sent.")
            : undefined}
        />
      )}
    </main>
  );
};

export default CustomerBookings;
