import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  IconCalendarCheck,
  IconCalendarStats,
  IconBriefcase,
  IconCash,
  IconChevronRight,
  IconClipboardCheck,
  IconClock,
  IconCirclePlus,
  IconRefresh,
  IconShoppingBag,
} from "@tabler/icons-react";
import api from "../../../lib/Api";
import { usePageTitle } from "../../../utils/usePageTitle";

type VendorDashboardBooking = {
  id: number;
  booking_reference: string;
  service_name: string;
  customer_name: string;
  selected_date: string;
  status: "pending" | "confirmed" | "cancelled";
  amount: number;
  created_at: string | null;
};

type VendorDashboardData = {
  business_name: string;
  vendor_status: string | null;
  stats: {
    total_bookings: number;
    pending_bookings: number;
    confirmed_bookings: number;
    cancelled_bookings: number;
    confirmed_value: number;
    total_services: number;
    active_services: number;
    available_dates: number;
  };
  upcoming_bookings: VendorDashboardBooking[];
  recent_bookings: VendorDashboardBooking[];
};

const fetchVendorDashboard = async (): Promise<VendorDashboardData> => {
  const response = await api.get<VendorDashboardData>("/vendor/dashboard");
  return response.data;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-600 ring-red-200",
};

const VendorDashboard = () => {
  usePageTitle("Vendor Dashboard");
  const navigate = useNavigate();
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["vendor-dashboard"],
    queryFn: fetchVendorDashboard,
    staleTime: 30_000,
  });

  if (isPending) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#f6f5fb] p-5">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-48 rounded-[28px] bg-purple-100" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-2xl bg-white" />)}
          </div>
          <div className="h-72 rounded-2xl bg-white" />
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#f6f5fb] p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-gray-900">Vendor dashboard could not be loaded</p>
          <p className="mt-2 text-sm text-gray-500">Check your connection and try again.</p>
          <button onClick={() => refetch()} className="mt-5 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white">
            Try again
          </button>
        </div>
      </main>
    );
  }

  const stats = [
    {
      label: "Booking Requests",
      value: data.stats.total_bookings,
      sub: `${data.stats.pending_bookings} awaiting review`,
      icon: IconClipboardCheck,
      color: "from-violet-600 to-purple-700",
    },
    {
      label: "Confirmed",
      value: data.stats.confirmed_bookings,
      sub: `${data.stats.cancelled_bookings} cancelled`,
      icon: IconCalendarCheck,
      color: "from-emerald-500 to-teal-600",
    },
    {
      label: "Confirmed Value",
      value: formatCurrency(data.stats.confirmed_value),
      sub: "Based on starting prices",
      icon: IconCash,
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "Active Services",
      value: `${data.stats.active_services}/${data.stats.total_services}`,
      sub: `${data.stats.available_dates} open dates`,
      icon: IconShoppingBag,
      color: "from-fuchsia-500 to-pink-600",
    },
  ];

  const quickActions = data.vendor_status === "approved"
    ? [
        { label: "Review Requests", path: "/vendor/bookings", icon: IconClipboardCheck },
        { label: "Manage Availability", path: "/vendor/availability", icon: IconCalendarStats },
        { label: "Add Service", path: "/service/register", icon: IconCirclePlus },
      ]
    : [
        { label: data.vendor_status ? "View Company Profile" : "Complete Company Profile", path: "/vendor/register", icon: IconBriefcase },
      ];

  return (
    <main className="flex-1 overflow-y-auto bg-[#f6f5fb] px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5 pt-12 md:pt-0">
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#18073d] via-[#31106f] to-[#6d28d9] p-6 text-white shadow-xl shadow-purple-900/20 sm:p-8"
        >
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-100 ring-1 ring-white/15">
                  Vendor workspace
                </span>
                {data.vendor_status && (
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-bold capitalize text-emerald-200 ring-1 ring-emerald-300/20">
                    {data.vendor_status.replaceAll("_", " ")}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black sm:text-3xl">Welcome back, {data.business_name}</h1>
              <p className="mt-2 max-w-xl text-sm text-purple-100/65">
                Your bookings, services and availability are gathered here in one working view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map(({ label, path, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20"
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, sub, icon: Icon, color }, index) => (
            <motion.article
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
                <Icon size={20} />
              </div>
              <p className="mt-4 text-2xl font-black text-gray-900">{value}</p>
              <p className="mt-1 text-xs font-bold text-gray-700">{label}</p>
              <p className="mt-1 text-[11px] text-gray-400">{sub}</p>
            </motion.article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-black text-gray-900">Upcoming bookings</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">Pending and confirmed events on your calendar</p>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-purple-600 disabled:animate-spin"
                aria-label="Refresh dashboard"
              >
                <IconRefresh size={17} />
              </button>
            </div>

            {data.upcoming_bookings.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400"><IconCalendarCheck size={23} /></div>
                <p className="mt-4 text-sm font-bold text-gray-700">No upcoming bookings</p>
                <p className="mt-1 text-xs text-gray-400">New customer requests will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.upcoming_bookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => navigate("/vendor/bookings")}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-purple-50/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <IconClock size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">{booking.service_name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-400">{booking.customer_name} · {formatDate(booking.selected_date)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ring-1 ${statusStyles[booking.status]}`}>
                      {booking.status}
                    </span>
                    <IconChevronRight size={16} className="text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-black text-gray-900">Recent requests</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">Latest activity across your services</p>
              </div>
              <button onClick={() => navigate("/vendor/bookings")} className="text-[11px] font-bold text-purple-600 hover:text-purple-800">View all</button>
            </div>
            {data.recent_bookings.length === 0 ? (
              <p className="px-5 py-12 text-center text-xs text-gray-400">No booking activity yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recent_bookings.map((booking) => (
                  <div key={booking.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-800">{booking.customer_name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-gray-400">{booking.service_name} · {booking.booking_reference}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold capitalize ring-1 ${statusStyles[booking.status]}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default VendorDashboard;
