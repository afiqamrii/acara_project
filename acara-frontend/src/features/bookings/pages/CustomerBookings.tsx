import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { AxiosError } from "axios";
import {
  IconAlertCircle,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconCurrencyDollar,
  IconChevronRight,
  IconArrowsExchange,
  IconMapPin,
  IconSearch,
  IconShoppingBag,
  IconMessageCircle,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import BookingTimeline from "../components/BookingTimeline";
import BookingBriefDisplay from "../components/BookingBriefDisplay";
import BookingCompletionDisplay from "../components/BookingCompletionDisplay";
import BookingConversation from "../components/BookingConversation";
import QuotationDisplay from "../components/QuotationDisplay";
import {
  acceptQuotation,
  cancelCustomerBooking,
  confirmBookingCompletion,
  declineQuotation,
  disputeBookingCompletion,
  fetchCustomerBooking,
  fetchRescheduleAvailability,
  fetchCustomerBookings,
  requestBookingReschedule,
  requestQuotationRevision,
  type BookingItem,
  type BookingStats,
  withdrawBookingReschedule,
} from "../api";

type QuotationAction = "accept" | "decline" | "revision";
type CompletionAction = "confirm" | "dispute";

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completion_pending", label: "Confirm Completion" },
  { key: "completion_disputed", label: "Issues" },
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
  completion_pending: {
    label: "Completion Action",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: <IconClock size={13} />,
  },
  completion_disputed: {
    label: "Under Admin Review",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: <IconAlertCircle size={13} />,
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
  completion_pending: bookings.filter((booking) => booking.status === "completion_pending").length,
  completion_disputed: bookings.filter((booking) => booking.status === "completion_disputed").length,
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

const DetailSummaryCard = ({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-indigo-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 truncate text-base font-bold text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{caption}</p>
      </div>
    </div>
  </div>
);

const RecordSection = ({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </section>
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

const QuotationResponseDialog = ({
  booking,
  action,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  booking: BookingItem;
  action: QuotationAction;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
  error?: string;
}) => {
  const [reason, setReason] = useState("");
  const quotation = booking.quotation;
  const needsReason = action !== "accept";
  const canSubmit = !submitting && (!needsReason || reason.trim().length >= 10);
  const copy = action === "accept"
    ? {
        eyebrow: "Confirm commercial agreement",
        title: "Accept this quotation?",
        message: "The agreed total will be locked and your booking will become confirmed.",
        button: "Accept & Confirm Booking",
        buttonClass: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
      }
    : action === "revision"
      ? {
          eyebrow: "Continue negotiation",
          title: "Request a revised quotation",
          message: "Tell the vendor exactly what should change. The current version stays in your audit history.",
          button: "Request Revision",
          buttonClass: "from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
        }
      : {
          eyebrow: "Close quotation",
          title: "Decline this quotation?",
          message: "The booking request will close and the selected date will be released.",
          button: "Decline & Close Request",
          buttonClass: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
        };

  if (!quotation) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{copy.eyebrow}</p>
            <h3 className="mt-2 text-xl font-black text-slate-900">{copy.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{quotation.reference} · {formatRM(quotation.total_amount)}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX size={18} /></button>
        </div>

        <p className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm leading-6 text-indigo-900">{copy.message}</p>

        {needsReason && (
          <label className="mt-5 block">
            <span className="flex items-center justify-between text-xs font-bold text-slate-700">
              {action === "revision" ? "Requested changes" : "Reason for declining"}
              <span className="font-medium text-slate-400">{reason.length}/1000</span>
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={action === "revision" ? "Explain which items, quantities, pricing or terms should change..." : "Explain why this quotation cannot be accepted..."}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
            {reason.trim().length > 0 && reason.trim().length < 10 && <span className="mt-1 block text-xs text-red-500">Please enter at least 10 characters.</span>}
          </label>
        )}

        {error && <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Go back</button>
          <button type="button" onClick={() => onSubmit(reason.trim())} disabled={!canSubmit} className={`flex-1 rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${copy.buttonClass}`}>
            {submitting ? "Processing..." : copy.button}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CompletionResponseDialog = ({
  booking,
  action,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  booking: BookingItem;
  action: CompletionAction;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
  error?: string;
}) => {
  const [reason, setReason] = useState("");
  const isDispute = action === "dispute";
  const canSubmit = !submitting && (!isDispute || reason.trim().length >= 10);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${isDispute ? "text-red-600" : "text-emerald-600"}`}>Service verification</p>
            <h3 className="mt-2 text-xl font-black text-slate-900">{isDispute ? "Report a completion issue" : "Confirm service completion?"}</h3>
            <p className="mt-1 text-sm text-slate-500">{booking.service_name} · {booking.booking_reference}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX size={18} /></button>
        </div>

        <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${isDispute ? "border-red-100 bg-red-50 text-red-900" : "border-emerald-100 bg-emerald-50 text-emerald-900"}`}>
          {isDispute
            ? "Describe what remains incomplete or differs from the accepted quotation. An administrator will review the submission."
            : "Confirm only when the vendor has delivered the agreed service. This closes the booking and unlocks your review."}
        </p>

        {isDispute && (
          <label className="mt-5 block">
            <span className="flex items-center justify-between text-xs font-bold text-slate-700">
              Issue details
              <span className="font-medium text-slate-400">{reason.length}/2000</span>
            </span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={5} placeholder="Explain what was not delivered, what needs correction, or why completion cannot be confirmed..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50" />
            {reason.trim().length > 0 && reason.trim().length < 10 && <span className="mt-1 block text-xs text-red-500">Please enter at least 10 characters.</span>}
          </label>
        )}

        {error && <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Go back</button>
          <button type="button" onClick={() => onSubmit(reason.trim())} disabled={!canSubmit} className={`flex-1 rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${isDispute ? "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700" : "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"}`}>
            {submitting ? "Processing..." : isDispute ? "Submit for Admin Review" : "Confirm Completion"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const BookingSummaryCard = ({ booking, onOpen }: { booking: BookingItem; onOpen: () => void }) => (
  <motion.button
    type="button"
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onOpen}
    className="group w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
  >
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">{booking.booking_reference}</span>
          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">{booking.category}</span>
          {(booking.unread_message_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
              <IconMessageCircle size={13} /> {booking.unread_message_count} new
            </span>
          )}
        </div>

        <h2 className="mt-3 truncate text-lg font-black text-gray-900">{booking.brief?.event_title || booking.service_name}</h2>
        <p className="mt-1 truncate text-sm text-gray-500">{booking.service_name} · {booking.vendor_name || booking.vendor || "Vendor"}</p>

        <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
            <IconCalendarEvent size={17} className="shrink-0 text-purple-500" />
            <span className="truncate">{formatDate(booking.selected_date)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
            <IconMapPin size={17} className="shrink-0 text-red-400" />
            <span className="truncate">{booking.location || "Malaysia"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
            <IconCurrencyDollar size={17} className="shrink-0 text-emerald-500" />
            <span className="truncate font-bold text-slate-700">{booking.quotation ? formatRM(booking.quotation.total_amount) : booking.price}</span>
          </div>
        </div>
      </div>

      <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
        Open record <IconChevronRight size={17} />
      </span>
    </div>
  </motion.button>
);

const BookingDetailRecord = ({
  booking,
  onCancel,
  onReschedule,
  onWithdrawReschedule,
  onQuotationAction,
  onCompletionAction,
  cancelling,
  withdrawing,
  quotationActionPending,
  completionActionPending,
  openConversation,
}: {
  booking: BookingItem;
  onCancel: (id: number) => void;
  onReschedule: (booking: BookingItem) => void;
  onWithdrawReschedule: (id: number) => void;
  onQuotationAction: (booking: BookingItem, action: QuotationAction) => void;
  onCompletionAction: (booking: BookingItem, action: CompletionAction) => void;
  cancelling: boolean;
  withdrawing: boolean;
  quotationActionPending: boolean;
  completionActionPending: boolean;
  openConversation: boolean;
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
  const requiresQuotationDecision = booking.status === "pending" && booking.quotation?.status === "sent";
  const requiresCompletionDecision = booking.status === "completion_pending";
  const vendorName = booking.vendor_name || booking.vendor || "Vendor";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="min-w-0 space-y-5">
        {booking.status === "expired" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-100/70 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Booking closed automatically</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {booking.quotation?.status === "expired"
                ? "The quotation expired without a response. No cancellation reason is required, and the date can be requested again."
                : "The vendor did not respond before the deadline. No cancellation reason is required, and the date can be requested again."}
            </p>
          </div>
        )}

        {booking.status === "rejected" && booking.rejection_reason && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">Vendor rejection reason</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-orange-950">{booking.rejection_reason}</p>
          </div>
        )}

        {booking.status === "cancelled" && booking.cancelled_by === "vendor" && booking.cancellation_reason && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700">Vendor cancellation reason</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-red-950">{booking.cancellation_reason}</p>
          </div>
        )}

        <RecordSection
          eyebrow="Event scope"
          title="Event brief and delivery requirements"
          description="The event information submitted to the vendor with this booking request."
        >
          {booking.brief ? (
            <BookingBriefDisplay brief={booking.brief} notes={booking.notes} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">No structured event brief was submitted.</p>
              {booking.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{booking.notes}</p>}
            </div>
          )}
        </RecordSection>

        <RecordSection
          eyebrow="Commercial agreement"
          title="Quotation and pricing"
          description="Review the latest commercial terms and all earlier quotation versions."
        >
          {booking.quotation ? (
            <div className="space-y-3">
              <QuotationDisplay quotation={booking.quotation} bookingId={booking.id} />
              {(booking.quotation_history?.length ?? 0) > 1 && (
                <details className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold text-slate-700">
                    Previous quotation versions ({(booking.quotation_history?.length ?? 1) - 1})
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                    {(booking.quotation_history ?? []).slice(1).map((quotation) => (
                      <QuotationDisplay key={quotation.id} quotation={quotation} bookingId={booking.id} compact />
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
              <IconClock size={20} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-700">Quotation not issued yet</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">The vendor is reviewing the event brief and service requirements.</p>
              </div>
            </div>
          )}
        </RecordSection>

        <RecordSection
          eyebrow="Service delivery"
          title="Completion record"
          description="Delivery evidence and completion submissions provided by the vendor."
        >
          {booking.completion ? (
            <div className="space-y-3">
              <BookingCompletionDisplay completion={booking.completion} />
              {(booking.completion_history?.length ?? 0) > 1 && (
                <details className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold text-slate-700">
                    Previous completion submissions ({(booking.completion_history?.length ?? 1) - 1})
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                    {(booking.completion_history ?? []).slice(1).map((completion) => (
                      <BookingCompletionDisplay key={completion.id} completion={completion} compact />
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">No completion record has been submitted.</p>
              <p className="mt-1 text-xs text-slate-500">This section will update after the vendor records the service delivery.</p>
            </div>
          )}
        </RecordSection>

        <RecordSection
          eyebrow="Communication"
          title={`Conversation with ${vendorName}`}
          description="Keep booking decisions and service discussions attached to this record."
        >
          <div>
            <BookingConversation
              bookingId={booking.id}
              defaultOpen={openConversation}
              messageCount={booking.message_count}
              unreadCount={booking.unread_message_count}
              title={`Conversation with ${vendorName}`}
            />
          </div>
        </RecordSection>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-6">
        <section className={`rounded-2xl border bg-white p-5 shadow-sm ${requiresQuotationDecision || requiresCompletionDecision ? "border-amber-200" : "border-slate-200"}`}>
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${requiresQuotationDecision || requiresCompletionDecision ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {requiresQuotationDecision || requiresCompletionDecision ? <IconAlertCircle size={20} /> : <IconCheck size={20} />}
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Organizer decision</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                {requiresQuotationDecision || requiresCompletionDecision ? "Action required" : "No action required"}
              </h2>
            </div>
          </div>

          {requiresQuotationDecision && (
            <div className="mt-4">
              <p className="text-sm leading-6 text-slate-600">Review the vendor quotation before accepting, requesting changes, or declining it.</p>
              <div className="mt-4 space-y-2">
                <button type="button" onClick={() => onQuotationAction(booking, "accept")} disabled={quotationActionPending} className="w-full rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:opacity-50">Accept Quotation</button>
                <button type="button" onClick={() => onQuotationAction(booking, "revision")} disabled={quotationActionPending} className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50">Request Revision</button>
                <button type="button" onClick={() => onQuotationAction(booking, "decline")} disabled={quotationActionPending} className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">Decline Quotation</button>
              </div>
            </div>
          )}

          {requiresCompletionDecision && (
            <div className="mt-4">
              <p className="text-sm leading-6 text-slate-600">Check the vendor's completion evidence and confirm whether the agreed service was delivered.</p>
              <div className="mt-4 space-y-2">
                <button type="button" onClick={() => onCompletionAction(booking, "confirm")} disabled={completionActionPending} className="w-full rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:opacity-50">Confirm Completion</button>
                <button type="button" onClick={() => onCompletionAction(booking, "dispute")} disabled={completionActionPending} className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">Report an Issue</button>
              </div>
            </div>
          )}

          {!requiresQuotationDecision && !requiresCompletionDecision && (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {booking.status === "pending"
                ? "The booking is currently with the vendor. You will be notified when a response is available."
                : booking.status === "completion_disputed"
                  ? "An administrator is reviewing the reported completion issue."
                  : "This record is up to date. Continue to monitor messages and booking activity."}
            </p>
          )}

          {booking.status === "pending" && booking.expires_at && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {booking.quotation?.status === "sent"
                  ? "Quotation response deadline"
                  : booking.quotation?.status === "revision_requested"
                    ? "Vendor revision deadline"
                    : "Vendor response deadline"}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">{formatDateTime(booking.expires_at)}</p>
            </div>
          )}
        </section>

        {(booking.reschedule_request || (!booking.reschedule_request && latestReschedule?.status === "rejected")) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-700">
              <IconArrowsExchange size={18} />
              <h2 className="text-sm font-bold">Date change request</h2>
            </div>
            {booking.reschedule_request ? (
              <div className="mt-3">
                <p className="text-sm font-bold text-slate-900">
                  {formatDate(booking.reschedule_request.original_date)} → {formatDate(booking.reschedule_request.requested_date)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{booking.reschedule_request.reason}</p>
                <p className="mt-2 text-xs text-indigo-600">The original date remains reserved while the vendor decides.</p>
                <button type="button" onClick={() => onWithdrawReschedule(booking.id)} disabled={withdrawing} className="mt-4 w-full rounded-xl border border-indigo-200 px-3 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60">
                  {withdrawing ? "Withdrawing..." : "Withdraw request"}
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm font-bold text-slate-900">Request declined</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Requested {formatDate(latestReschedule?.requested_date)}. The event remains on {formatDate(booking.selected_date)}.</p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-orange-700">{latestReschedule?.decision_reason || "The vendor could not accept the requested date."}</p>
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Booking controls</p>
          <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => navigate(`/marketplace/${booking.service_id}`)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <IconShoppingBag size={17} />
            View service listing
          </button>
          {booking.status === "completed" && (
            <button
              type="button"
              onClick={() => navigate("/reviews")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <IconStar size={17} />
              Write a review
            </button>
          )}
          {canReschedule && (
            <button
              type="button"
              onClick={() => onReschedule(booking)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <IconArrowsExchange size={17} />
              Request date change
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <IconX size={17} />
              {cancelling ? "Cancelling..." : "Cancel booking"}
            </button>
          )}
          </div>
        </section>

        {(booking.timeline?.length ?? 0) > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">Audit trail</p>
            <h2 className="mt-1 text-base font-bold text-slate-900">Booking activity</h2>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <BookingTimeline events={booking.timeline ?? []} />
            </div>
          </section>
        )}
      </aside>
    </motion.article>
  );
};

const CustomerBookings = () => {
  const navigate = useNavigate();
  const { bookingId: bookingIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingItem | null>(null);
  const [quotationResponse, setQuotationResponse] = useState<{ booking: BookingItem; action: QuotationAction } | null>(null);
  const [completionResponse, setCompletionResponse] = useState<{ booking: BookingItem; action: CompletionAction } | null>(null);

  const bookingId = Number(bookingIdParam);
  const isDetailRoute = bookingIdParam !== undefined;
  const validBookingId = Number.isInteger(bookingId) && bookingId > 0;

  const bookingListQuery = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchCustomerBookings,
    staleTime: 1000 * 30,
    enabled: !isDetailRoute,
  });

  const bookingDetailQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => fetchCustomerBooking(bookingId),
    staleTime: 1000 * 30,
    enabled: isDetailRoute && validBookingId,
  });

  const bookings = useMemo(() => bookingListQuery.data?.bookings ?? [], [bookingListQuery.data?.bookings]);
  const detailBooking = bookingDetailQuery.data?.booking;
  const stats = bookingListQuery.data?.stats ?? buildStats(bookings);
  usePageTitle(detailBooking ? `${detailBooking.booking_reference} · Booking Detail` : isDetailRoute ? "Booking Detail" : "My Bookings");

  useEffect(() => {
    const legacyConversationId = Number(searchParams.get("conversation"));
    if (!isDetailRoute && Number.isInteger(legacyConversationId) && legacyConversationId > 0) {
      navigate(`/bookings/${legacyConversationId}?conversation=1`, { replace: true });
    }
  }, [isDetailRoute, navigate, searchParams]);

  const invalidateBookingQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    if (validBookingId) queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
  };

  const cancelMutation = useMutation({
    mutationFn: cancelCustomerBooking,
    onSuccess: () => {
      invalidateBookingQueries();
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: requestBookingReschedule,
    onSuccess: () => {
      setRescheduleBooking(null);
      invalidateBookingQueries();
      queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawBookingReschedule,
    onSuccess: () => {
      invalidateBookingQueries();
      queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const quotationMutation = useMutation({
    mutationFn: ({ booking, action, reason }: { booking: BookingItem; action: QuotationAction; reason: string }) => {
      if (!booking.quotation) throw new Error("Quotation not found.");
      const input = { bookingId: booking.id, quotationId: booking.quotation.id };
      if (action === "accept") return acceptQuotation(input);
      if (action === "revision") return requestQuotationRevision({ ...input, reason });
      return declineQuotation({ ...input, reason });
    },
    onSuccess: () => {
      setQuotationResponse(null);
      invalidateBookingQueries();
      queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  const completionMutation = useMutation({
    mutationFn: ({ booking, action, reason }: { booking: BookingItem; action: CompletionAction; reason: string }) =>
      action === "confirm"
        ? confirmBookingCompletion(booking.id)
        : disputeBookingCompletion({ bookingId: booking.id, reason }),
    onSuccess: () => {
      setCompletionResponse(null);
      invalidateBookingQueries();
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

  const openReschedule = (booking: BookingItem) => {
    rescheduleMutation.reset();
    setRescheduleBooking(booking);
  };

  const openQuotationAction = (booking: BookingItem, action: QuotationAction) => {
    quotationMutation.reset();
    setQuotationResponse({ booking, action });
  };

  const openCompletionAction = (booking: BookingItem, action: CompletionAction) => {
    completionMutation.reset();
    setCompletionResponse({ booking, action });
  };

  const bookingDialogs = (
    <>
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

      {quotationResponse && (
        <QuotationResponseDialog
          booking={quotationResponse.booking}
          action={quotationResponse.action}
          onClose={() => !quotationMutation.isPending && setQuotationResponse(null)}
          onSubmit={(reason) => quotationMutation.mutate({
            booking: quotationResponse.booking,
            action: quotationResponse.action,
            reason,
          })}
          submitting={quotationMutation.isPending}
          error={quotationMutation.isError
            ? apiErrorMessage(quotationMutation.error, "The quotation response could not be completed.")
            : undefined}
        />
      )}

      {completionResponse && (
        <CompletionResponseDialog
          booking={completionResponse.booking}
          action={completionResponse.action}
          onClose={() => !completionMutation.isPending && setCompletionResponse(null)}
          onSubmit={(reason) => completionMutation.mutate({
            booking: completionResponse.booking,
            action: completionResponse.action,
            reason,
          })}
          submitting={completionMutation.isPending}
          error={completionMutation.isError
            ? apiErrorMessage(completionMutation.error, "The completion response could not be saved.")
            : undefined}
        />
      )}
    </>
  );

  if (isDetailRoute) {
    if (validBookingId && bookingDetailQuery.isPending) {
      return <Loader title="Booking Detail" message="Loading your complete booking record..." />;
    }

    if (!validBookingId || bookingDetailQuery.isError || !detailBooking) {
      return (
        <main className="flex flex-1 items-center justify-center bg-[#f7f8fc] p-6">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><IconAlertCircle size={28} /></div>
            <h1 className="mt-4 text-xl font-black text-slate-900">Booking record not found</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">This booking does not exist or does not belong to your organizer account.</p>
            <button type="button" onClick={() => navigate("/bookings")} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Back to My Bookings</button>
          </div>
        </main>
      );
    }

    const displayAmount = detailBooking.quotation?.total_amount ?? detailBooking.price_value;

    return (
      <main className="flex-1 overflow-y-auto bg-[#f7f8fc]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-8">
          <button type="button" onClick={() => navigate("/bookings")} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-indigo-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            Back to My Bookings
          </button>

          <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 bg-indigo-700" />
            <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Organizer booking record</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {detailBooking.brief?.event_title || detailBooking.service_name}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {detailBooking.service_name} supplied by <span className="font-semibold text-slate-700">{detailBooking.vendor_name || detailBooking.vendor || "Vendor"}</span>
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{detailBooking.booking_reference}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{detailBooking.category}</span>
                </div>
              </div>
              <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 lg:text-right">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Current status</p>
                <StatusBadge status={detailBooking.status} />
              </div>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailSummaryCard
              label="Vendor"
              value={detailBooking.vendor_name || detailBooking.vendor || "Vendor"}
              caption={detailBooking.location || "Malaysia"}
              icon={<IconShoppingBag size={20} />}
            />
            <DetailSummaryCard
              label="Event date"
              value={formatDate(detailBooking.selected_date)}
              caption={detailBooking.brief?.venue_name || "Scheduled service date"}
              icon={<IconCalendarEvent size={20} />}
            />
            <DetailSummaryCard
              label={detailBooking.quotation ? "Quoted value" : "Estimated value"}
              value={formatRM(displayAmount)}
              caption={detailBooking.quotation?.reference || detailBooking.pricing_unit || "Service estimate"}
              icon={<IconCurrencyDollar size={20} />}
            />
            <DetailSummaryCard
              label="Request submitted"
              value={formatDateTime(detailBooking.booked_at)}
              caption="Original booking request"
              icon={<IconClock size={20} />}
            />
          </section>

          {cancelMutation.isError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{apiErrorMessage(cancelMutation.error, "The booking could not be cancelled.")}</div>}
          {withdrawMutation.isError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{apiErrorMessage(withdrawMutation.error, "The date change request could not be withdrawn.")}</div>}

          <BookingDetailRecord
            booking={detailBooking}
            onCancel={handleCancel}
            onReschedule={openReschedule}
            onWithdrawReschedule={handleWithdrawReschedule}
            onQuotationAction={openQuotationAction}
            onCompletionAction={openCompletionAction}
            cancelling={cancelMutation.isPending && cancelMutation.variables === detailBooking.id}
            withdrawing={withdrawMutation.isPending && withdrawMutation.variables === detailBooking.id}
            quotationActionPending={quotationMutation.isPending && quotationMutation.variables?.booking.id === detailBooking.id}
            completionActionPending={completionMutation.isPending && completionMutation.variables?.booking.id === detailBooking.id}
            openConversation={searchParams.get("conversation") === "1"}
          />
        </div>
        {bookingDialogs}
      </main>
    );
  }

  if (bookingListQuery.isPending) {
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

        {bookingListQuery.isError ? (
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
              <BookingSummaryCard
                key={booking.id}
                booking={booking}
                onOpen={() => navigate(`/bookings/${booking.id}`)}
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

      {bookingDialogs}
    </main>
  );
};

export default CustomerBookings;
