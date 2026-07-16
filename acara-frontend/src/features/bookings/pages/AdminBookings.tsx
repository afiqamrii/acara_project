import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertCircle,
  IconArrowsExchange,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconCurrencyDollar,
  IconSearch,
  IconShieldCheck,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import BookingTimeline from "../components/BookingTimeline";
import BookingBriefDisplay from "../components/BookingBriefDisplay";
import { fetchAdminBookings, type BookingItem, type BookingStats } from "../api";

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
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
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

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
        {icon}
      </span>
    </div>
    <p className="mt-3 text-2xl font-black text-neutral-900">{value}</p>
  </div>
);

const AdminBookings = () => {
  usePageTitle("Booking Monitor");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: fetchAdminBookings,
    staleTime: 1000 * 30,
  });

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);
  const stats = data?.stats ?? buildStats(bookings);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus = activeTab === "all" || booking.status === activeTab;
      const matchesSearch =
        !query ||
        booking.service_name.toLowerCase().includes(query) ||
        (booking.customer_name || "").toLowerCase().includes(query) ||
        (booking.customer_email || "").toLowerCase().includes(query) ||
        (booking.vendor_name || booking.vendor || "").toLowerCase().includes(query) ||
        booking.booking_reference.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [activeTab, bookings, search]);

  if (isPending) {
    return <Loader title="Booking Monitor" message="Loading marketplace bookings..." />;
  }

  return (
    <main className="flex flex-1 overflow-auto bg-gray-100">
      <div className="flex h-full w-full flex-1 flex-col gap-6 p-4 md:p-10">
        <section className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-100">Admin Monitor</p>
              <h1 className="mt-2 text-2xl font-black md:text-3xl">Booking Orders</h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100">
                See every customer request, response deadline, vendor decision, and automatic expiry in one audit view.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
              <IconShieldCheck size={30} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Orders" value={String(stats.total)} icon={<IconCalendarEvent size={21} />} />
          <StatCard label="Pending Review" value={String(stats.pending)} icon={<IconClock size={21} />} />
          <StatCard label="Confirmed" value={String(stats.confirmed)} icon={<IconCheck size={21} />} />
          <StatCard label="Marketplace Value" value={formatRM(stats.estimate)} icon={<IconCurrencyDollar size={21} />} />
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
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
                placeholder="Search orders"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </div>
        </section>

        {isError ? (
          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <p className="font-bold text-gray-900">Bookings could not be loaded.</p>
            <p className="mt-1 text-sm text-gray-500">Please check the API connection and try again.</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <IconCalendarEvent size={28} />
            </div>
            <p className="mt-4 text-lg font-black text-gray-900">No booking orders found</p>
            <p className="mt-1 text-sm text-gray-500">Orders will appear once customers confirm their cart.</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_120px] gap-4 border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-neutral-500 lg:grid">
              <span>Service</span>
              <span>Customer</span>
              <span>Vendor</span>
              <span>Date</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-neutral-100">
              {filteredBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr_120px] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        {booking.booking_reference}
                      </span>
                      <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">
                        {booking.category}
                      </span>
                    </div>
                    <p className="mt-2 truncate font-bold text-gray-900">{booking.service_name}</p>
                    <p className="mt-0.5 text-sm font-semibold text-purple-700">{booking.price}</p>
                    {booking.status === "rejected" && booking.rejection_reason && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-orange-700">
                        <span className="font-bold">Rejection:</span> {booking.rejection_reason}
                      </p>
                    )}
                    {booking.status === "cancelled" && booking.cancelled_by === "vendor" && booking.cancellation_reason && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-red-700">
                        <span className="font-bold">Vendor cancellation:</span> {booking.cancellation_reason}
                      </p>
                    )}
                    {booking.status === "expired" && (
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        <span className="font-bold">Automatic closure:</span> Vendor response deadline passed; the date was released.
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 rounded-xl bg-gray-50 px-3 py-2 lg:bg-transparent lg:px-0 lg:py-0">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 lg:hidden">
                      <IconUser size={14} />
                      Customer
                    </p>
                    <p className="truncate font-semibold text-gray-800">{booking.customer_name || "Customer"}</p>
                    <p className="truncate text-xs text-gray-400">{booking.customer_email || "-"}</p>
                  </div>

                  <div className="min-w-0 rounded-xl bg-gray-50 px-3 py-2 lg:bg-transparent lg:px-0 lg:py-0">
                    <p className="text-xs font-semibold text-gray-400 lg:hidden">Vendor</p>
                    <p className="truncate font-semibold text-gray-800">
                      {booking.vendor_name || booking.vendor || "Vendor"}
                    </p>
                    <p className="truncate text-xs text-gray-400">{booking.location || "Malaysia"}</p>
                  </div>

                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 lg:bg-transparent lg:px-0 lg:py-0">
                    {formatDate(booking.selected_date)}
                  </div>

                  <StatusBadge status={booking.status} />

                  {booking.brief && (
                    <details className="rounded-xl border border-purple-100 bg-purple-50/30 px-4 py-3 lg:col-span-5">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-purple-700">
                        Event brief · {booking.brief.event_title}
                      </summary>
                      <div className="mt-4 border-t border-purple-100 pt-4">
                        <BookingBriefDisplay brief={booking.brief} notes={booking.notes} />
                      </div>
                    </details>
                  )}

                  {booking.reschedule_request && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 lg:col-span-5">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
                        <IconArrowsExchange size={16} />
                        Pending date change
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {formatDate(booking.reschedule_request.original_date)} → {formatDate(booking.reschedule_request.requested_date)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{booking.reschedule_request.reason}</p>
                    </div>
                  )}

                  {(booking.reschedule_history?.length ?? 0) > 0 && (
                    <details className="rounded-xl border border-indigo-100 bg-white px-4 py-3 lg:col-span-5">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-indigo-700">
                        Date change audit ({booking.reschedule_history?.length ?? 0})
                      </summary>
                      <div className="mt-3 space-y-3 border-t border-indigo-100 pt-3">
                        {(booking.reschedule_history ?? []).map((request) => (
                          <div key={request.id} className="rounded-xl bg-slate-50 px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-slate-900">
                                {formatDate(request.original_date)} → {formatDate(request.requested_date)}
                              </p>
                              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                {request.status}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-600"><span className="font-bold">Organizer:</span> {request.reason}</p>
                            {request.decision_reason && (
                              <p className="mt-1 text-xs leading-5 text-slate-600"><span className="font-bold">Decision:</span> {request.decision_reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {(booking.timeline?.length ?? 0) > 0 && (
                    <details className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 lg:col-span-5">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-600">
                        Booking activity
                      </summary>
                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <BookingTimeline events={booking.timeline ?? []} compact />
                      </div>
                    </details>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default AdminBookings;
