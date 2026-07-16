import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowsExchange,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconCurrencyDollar,
  IconMapPin,
  IconReceipt,
  IconShieldCheck,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import AdminCompletionResolutionDialog, { type ResolutionAction } from "../components/AdminCompletionResolutionDialog";
import BookingBriefDisplay from "../components/BookingBriefDisplay";
import BookingCompletionDisplay from "../components/BookingCompletionDisplay";
import BookingTimeline from "../components/BookingTimeline";
import QuotationDisplay from "../components/QuotationDisplay";
import { fetchAdminBooking, resolveBookingCompletion, type BookingItem } from "../api";

const statusMeta: Record<string, { label: string; className: string; icon: ReactNode }> = {
  pending: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700", icon: <IconClock size={14} /> },
  confirmed: { label: "Confirmed", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <IconCheck size={14} /> },
  completion_pending: { label: "Awaiting Organizer", className: "border-amber-200 bg-amber-50 text-amber-700", icon: <IconClock size={14} /> },
  completion_disputed: { label: "Needs Resolution", className: "border-red-200 bg-red-50 text-red-700", icon: <IconAlertCircle size={14} /> },
  completed: { label: "Completed", className: "border-indigo-200 bg-indigo-50 text-indigo-700", icon: <IconCheck size={14} /> },
  expired: { label: "Expired", className: "border-slate-200 bg-slate-100 text-slate-700", icon: <IconClock size={14} /> },
  rejected: { label: "Rejected", className: "border-orange-200 bg-orange-50 text-orange-700", icon: <IconX size={14} /> },
  cancelled: { label: "Cancelled", className: "border-red-200 bg-red-50 text-red-700", icon: <IconX size={14} /> },
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
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
  `RM ${Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const apiErrorMessage = (error: unknown) =>
  (error as AxiosError<{ message?: string }>).response?.data?.message ?? "The completion dispute could not be resolved.";

const StatusBadge = ({ status }: { status: string }) => {
  const meta = statusMeta[status] ?? statusMeta.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

const SummaryCard = ({ label, value, caption, icon }: { label: string; value: string; caption: string; icon: ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-2 truncate text-sm font-black text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{caption}</p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span>
    </div>
  </div>
);

const Section = ({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
    </div>
    {children}
  </section>
);

const LifecycleNotice = ({ booking }: { booking: BookingItem }) => {
  if (booking.status === "rejected" && booking.rejection_reason) {
    return (
      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
        <span className="font-black">Vendor rejection:</span> {booking.rejection_reason}
      </div>
    );
  }

  if (booking.status === "cancelled" && booking.cancellation_reason) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <span className="font-black">Cancellation by {booking.cancelled_by || "user"}:</span> {booking.cancellation_reason}
      </div>
    );
  }

  if (booking.status === "expired") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
        <span className="font-black">Automatic closure:</span> {booking.quotation?.status === "expired" ? "The quotation response deadline passed." : "The vendor response deadline passed."}
      </div>
    );
  }

  return null;
};

const AdminBookingDetail = () => {
  const { bookingId: bookingIdParam } = useParams();
  const bookingId = Number(bookingIdParam);
  const validBookingId = Number.isInteger(bookingId) && bookingId > 0;
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-booking", bookingId],
    queryFn: () => fetchAdminBooking(bookingId),
    enabled: validBookingId,
  });

  const booking = data?.booking;
  usePageTitle(booking ? `${booking.booking_reference} · Booking Detail` : "Booking Detail");

  const resolutionMutation = useMutation({
    mutationFn: ({ action, reason }: { action: ResolutionAction; reason: string }) =>
      resolveBookingCompletion({ bookingId, decision: action, reason }),
    onSuccess: () => {
      setResolutionAction(null);
      queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
  });

  if (isPending && validBookingId) {
    return <Loader title="Booking Detail" message="Loading the complete booking record..." />;
  }

  if (!validBookingId || isError || !booking) {
    return (
      <main className="flex flex-1 overflow-auto bg-slate-100 p-4 sm:p-8">
        <div className="m-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><IconAlertCircle size={28} /></div>
          <h1 className="mt-4 text-xl font-black text-slate-900">Booking record not found</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">This record may no longer exist or the link is invalid.</p>
          <Link to="/admin/bookings" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
            <IconArrowLeft size={17} /> Back to Booking Orders
          </Link>
        </div>
      </main>
    );
  }

  const completion = booking.completion;
  const quotation = booking.quotation;
  const displayAmount = quotation?.total_amount ?? booking.price_value;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-100">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <Link to="/admin/bookings" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-indigo-700">
          <IconArrowLeft size={18} /> Back to Booking Orders
        </Link>

        <header className="shrink-0 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-800 to-purple-700 p-5 text-white shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black tracking-wide ring-1 ring-white/20">{booking.booking_reference}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-indigo-100">{booking.category}</span>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Admin booking record</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{booking.brief?.event_title || booking.service_name}</h1>
              <p className="mt-2 text-sm font-medium text-indigo-100">{booking.service_name} · {booking.vendor_name || booking.vendor || "Vendor"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={booking.status} />
              {booking.status === "completion_disputed" && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { resolutionMutation.reset(); setResolutionAction("reopen"); }} className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-50">Return to Vendor</button>
                  <button type="button" onClick={() => { resolutionMutation.reset(); setResolutionAction("complete"); }} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600">Approve Completion</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Organizer" value={booking.customer_name || "Customer"} caption={booking.customer_email || "-"} icon={<IconUser size={20} />} />
          <SummaryCard label="Vendor" value={booking.vendor_name || booking.vendor || "Vendor"} caption={booking.location || "Malaysia"} icon={<IconMapPin size={20} />} />
          <SummaryCard label="Event date" value={formatDate(booking.selected_date)} caption="Accepted booking date" icon={<IconCalendarEvent size={20} />} />
          <SummaryCard label="Booking value" value={formatRM(displayAmount)} caption={quotation?.reference || booking.pricing_unit || "Recorded amount"} icon={<IconCurrencyDollar size={20} />} />
        </section>

        <LifecycleNotice booking={booking} />

        {booking.status === "completion_disputed" && (
          <section className="rounded-3xl border border-red-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500">Conflict review</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Compare both parties before deciding</h2>
                <p className="mt-1 text-sm text-slate-500">Use the accepted scope and activity timeline below as the audit baseline.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"><IconShieldCheck size={15} /> Admin decision required</span>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700"><IconAlertCircle size={18} /><p className="text-xs font-black uppercase tracking-wide">Organizer reported</p></div>
                <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-red-950">{completion?.dispute_reason || "No organizer dispute reason was recorded."}</p>
              </div>
              {completion ? (
                <BookingCompletionDisplay completion={completion} showDisputeReason={false} />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No vendor completion submission was found.</div>
              )}
            </div>
          </section>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-5">
            <Section eyebrow="Event scope" title="Organizer's submitted event brief">
              {booking.brief ? <BookingBriefDisplay brief={booking.brief} notes={booking.notes} /> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No structured event brief is attached.</p>}
            </Section>

            <Section eyebrow="Commercial agreement" title="Quotation record">
              {quotation ? (
                <div className="space-y-4">
                  <QuotationDisplay quotation={quotation} />
                  {(booking.quotation_history?.length ?? 0) > 1 && (
                    <details className="rounded-xl border border-indigo-100 bg-indigo-50/30 px-4 py-3">
                      <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-indigo-700">Previous quotation versions ({(booking.quotation_history?.length ?? 1) - 1})</summary>
                      <div className="mt-3 space-y-3 border-t border-indigo-100 pt-3">
                        {(booking.quotation_history ?? []).slice(1).map((item) => <QuotationDisplay key={item.id} quotation={item} compact />)}
                      </div>
                    </details>
                  )}
                </div>
              ) : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No quotation has been issued for this booking.</p>}
            </Section>

            <Section eyebrow="Service delivery" title="Completion record">
              {completion ? (
                <div className="space-y-4">
                  <BookingCompletionDisplay completion={completion} />
                  {(booking.completion_history?.length ?? 0) > 1 && (
                    <details className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-700">Previous completion submissions ({(booking.completion_history?.length ?? 1) - 1})</summary>
                      <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                        {(booking.completion_history ?? []).slice(1).map((item) => <BookingCompletionDisplay key={item.id} completion={item} compact />)}
                      </div>
                    </details>
                  )}
                </div>
              ) : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">The vendor has not submitted completion for this booking.</p>}
            </Section>

            {(booking.reschedule_request || (booking.reschedule_history?.length ?? 0) > 0) && (
              <Section eyebrow="Date management" title="Reschedule audit">
                <div className="space-y-3">
                  {(booking.reschedule_history ?? []).map((request) => (
                    <div key={request.id} className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-black text-slate-900"><IconArrowsExchange size={17} className="text-indigo-600" /> {formatDate(request.original_date)} → {formatDate(request.requested_date)}</p>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700">{request.status}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600"><span className="font-bold">Organizer reason:</span> {request.reason}</p>
                      {request.decision_reason && <p className="mt-1 text-xs leading-5 text-slate-600"><span className="font-bold">Vendor decision:</span> {request.decision_reason}</p>}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <Section eyebrow="Audit trail" title="Booking activity">
              {(booking.timeline?.length ?? 0) > 0 ? <BookingTimeline events={booking.timeline ?? []} /> : <p className="text-sm text-slate-500">No activity is available.</p>}
            </Section>

            <Section eyebrow="Record information" title="System timestamps">
              <dl className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Requested</dt><dd className="text-right font-bold text-slate-800">{formatDateTime(booking.booked_at)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Confirmed</dt><dd className="text-right font-bold text-slate-800">{formatDateTime(booking.confirmed_at)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Completed</dt><dd className="text-right font-bold text-slate-800">{formatDateTime(booking.completed_at)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Payment status</dt><dd className="text-right font-bold capitalize text-slate-800">{booking.payment_status || "unpaid"}</dd></div>
              </dl>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500"><IconReceipt size={16} /> Record ID #{booking.id}</div>
            </Section>
          </aside>
        </div>
      </div>

      {resolutionAction && (
        <AdminCompletionResolutionDialog
          booking={booking}
          action={resolutionAction}
          onClose={() => !resolutionMutation.isPending && setResolutionAction(null)}
          onSubmit={(reason) => resolutionMutation.mutate({ action: resolutionAction, reason })}
          submitting={resolutionMutation.isPending}
          error={resolutionMutation.isError ? apiErrorMessage(resolutionMutation.error) : undefined}
        />
      )}
    </main>
  );
};

export default AdminBookingDetail;
