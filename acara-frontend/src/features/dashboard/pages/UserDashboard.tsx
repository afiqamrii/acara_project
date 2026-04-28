import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import api from "../../../lib/Api";
import {
  IconAlertCircle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconBell,
  IconCalendarEvent,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconConfetti,
  IconCurrencyDollar,
  IconMapPin,
  IconSearch,
  IconShoppingBag,
  IconSparkles,
  IconStar,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";

type Booking = {
  id: number;
  booking_reference?: string;
  event_name?: string;
  event_date?: string;
  location?: string;
  total_amount?: number | string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | string;
  vendor_name?: string;
  service_name?: string;
};

type StatCard = {
  label: string;
  value: string;
  subtext: string;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
  gradient: string;
};

const today = new Date();
const dateStr = today.toLocaleDateString("en-MY", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  confirmed: {
    label: "Confirmed",
    color: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: <IconCheck size={12} />,
  },
  pending: {
    label: "Pending",
    color: "border border-amber-200 bg-amber-50 text-amber-700",
    icon: <IconAlertCircle size={12} />,
  },
  completed: {
    label: "Completed",
    color: "border border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: <IconCheck size={12} />,
  },
  cancelled: {
    label: "Cancelled",
    color: "border border-red-200 bg-red-50 text-red-700",
    icon: <IconX size={12} />,
  },
};

const placeholderEvents = [
  {
    id: 1,
    event_name: "Annual Gala Dinner",
    event_date: "2026-04-15",
    location: "Kuala Lumpur Convention Centre",
    status: "confirmed",
    total_amount: 4500,
    vendor_name: "Grand Catering Sdn Bhd",
  },
  {
    id: 2,
    event_name: "Corporate Team Building",
    event_date: "2026-05-02",
    location: "Putrajaya International Convention Centre",
    status: "pending",
    total_amount: 2200,
    vendor_name: "Active Pro Events",
  },
  {
    id: 3,
    event_name: "Product Launch",
    event_date: "2026-05-20",
    location: "Sunway Pyramid Convention Centre",
    status: "confirmed",
    total_amount: 8100,
    vendor_name: "TechStage Productions",
  },
];

const quickActions = [
  {
    label: "Browse Vendors",
    icon: IconShoppingBag,
    href: "/marketplace",
    gradient: "from-indigo-500 to-purple-600",
    description: "Find services",
  },
  {
    label: "Plan Event",
    icon: IconCalendarEvent,
    href: "/events",
    gradient: "from-purple-500 to-pink-500",
    description: "Create and manage",
  },
  {
    label: "View Bookings",
    icon: IconConfetti,
    href: "/bookings",
    gradient: "from-emerald-500 to-teal-600",
    description: "Track status",
  },
  {
    label: "My Reviews",
    icon: IconStar,
    href: "/reviews",
    gradient: "from-amber-500 to-orange-500",
    description: "Rate vendors",
  },
];

const spendingBreakdown = [
  {
    label: "Catering",
    percent: 40,
    color: "from-indigo-500 to-purple-500",
    amount: "RM 1,800",
  },
  {
    label: "Photography",
    percent: 25,
    color: "from-pink-500 to-rose-400",
    amount: "RM 1,125",
  },
  {
    label: "Venue and Decor",
    percent: 20,
    color: "from-emerald-500 to-teal-400",
    amount: "RM 900",
  },
  {
    label: "Entertainment",
    percent: 15,
    color: "from-amber-500 to-orange-400",
    amount: "RM 675",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const formatRM = (val?: number | string) => {
  if (!val) return "RM 0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `RM ${num.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />
);

const UserDashboard = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("user_name") || "there";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/user/bookings");
        setBookings(res.data?.data || res.data || []);
      } catch {
        setBookings(placeholderEvents as Booking[]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const totalSpent = bookings.reduce((sum, booking) => {
    const amount =
      typeof booking.total_amount === "string"
        ? parseFloat(booking.total_amount)
        : booking.total_amount || 0;

    return sum + (booking.status !== "cancelled" ? amount : 0);
  }, 0);

  const confirmedCount = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const completedCount = bookings.filter(
    (b) => b.status === "completed",
  ).length;

  const upcomingBookings = bookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .slice(0, 3);

  const recentBookings = [...bookings].slice(0, 5);

  const stats: StatCard[] = [
    {
      label: "Total Bookings",
      value: bookings.length.toString(),
      subtext: `${confirmedCount} confirmed`,
      change: "+2 this month",
      positive: true,
      icon: <IconCalendarEvent size={22} />,
      gradient: "from-indigo-500 to-purple-600",
    },
    {
      label: "Total Spent",
      value: formatRM(totalSpent),
      subtext: "Across all events",
      change: "+RM 1,200 this month",
      positive: true,
      icon: <IconCurrencyDollar size={22} />,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      label: "Pending Actions",
      value: pendingCount.toString(),
      subtext: "Awaiting confirmation",
      change: pendingCount > 0 ? "Needs attention" : "All clear",
      positive: pendingCount === 0,
      icon: <IconAlertCircle size={22} />,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Completed Events",
      value: completedCount.toString(),
      subtext: "Successfully done",
      change: "Rate your vendors",
      positive: true,
      icon: <IconStar size={22} />,
      gradient: "from-pink-500 to-rose-500",
    },
  ];

  const filteredBookings = recentBookings.filter(
    (booking) =>
      !searchQuery ||
      booking.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.status?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex-none border-b border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-6 md:pl-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 pt-12 md:pt-0">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                Hello, {userName.split(" ")[0]}
              </h1>
              <p className="mt-0.5 text-xs text-gray-400">{dateStr}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="relative flex items-center sm:min-w-[240px] sm:flex-1 lg:max-w-xs lg:flex-none">
                <IconSearch
                  size={15}
                  className="pointer-events-none absolute left-3 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="flex items-center gap-3">
                <button className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                  <IconBell size={17} />
                  {pendingCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => navigate("/marketplace")}
                  className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg sm:flex-none"
                >
                  <IconSparkles size={15} />
                  <span>Find Vendors</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                custom={index}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-sm`}
                  >
                    {stat.icon}
                  </div>

                  <span
                    className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${
                      stat.positive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {stat.positive ? (
                      <IconArrowUpRight size={12} />
                    ) : (
                      <IconArrowDownRight size={12} />
                    )}
                    {stat.change}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-xl font-bold leading-none text-gray-900 sm:text-2xl">
                    {loading ? <Skeleton className="h-7 w-24" /> : stat.value}
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{stat.subtext}</p>
                  <p
                    className={`mt-2 text-xs font-medium sm:hidden ${
                      stat.positive ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {stat.change}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <motion.div
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    Upcoming Events
                  </h2>

                  <button
                    onClick={() => navigate("/bookings")}
                    className="flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View all <IconChevronRight size={13} />
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <Skeleton key={item} className="h-20 w-full" />
                    ))}
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                      <IconCalendarEvent
                        size={26}
                        className="text-indigo-400"
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      No upcoming events
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Start planning your next event
                    </p>
                    <button
                      onClick={() => navigate("/marketplace")}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      Browse Vendors
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((booking, index) => {
                      const status =
                        statusConfig[booking.status] || statusConfig.pending;

                      return (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * index }}
                          className="group flex flex-col gap-3 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-indigo-50/50 sm:flex-row sm:items-center sm:gap-4"
                        >
                          <div className="flex items-start gap-3 sm:flex-1 sm:items-center sm:gap-4">
                            <div
                              className={`h-10 w-1 shrink-0 rounded-full sm:self-stretch ${
                                booking.status === "confirmed"
                                  ? "bg-emerald-500"
                                  : booking.status === "pending"
                                    ? "bg-amber-500"
                                    : "bg-indigo-400"
                              }`}
                            />

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                              <IconCalendarEvent
                                size={18}
                                className="text-indigo-600"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {booking.event_name || `Booking #${booking.id}`}
                              </p>

                              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                                {booking.event_date && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <IconClock size={11} />
                                    {formatDate(booking.event_date)}
                                  </span>
                                )}

                                {booking.location && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400 sm:max-w-[220px]">
                                    <IconMapPin
                                      size={11}
                                      className="shrink-0"
                                    />
                                    <span className="truncate">
                                      {booking.location}
                                    </span>
                                  </span>
                                )}
                              </div>

                              {booking.vendor_name && (
                                <p className="mt-0.5 truncate text-xs text-gray-400">
                                  via {booking.vendor_name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
                            <span
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${status.color}`}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {formatRM(booking.total_amount)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              <motion.div
                custom={5}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Recent Bookings
                  </h2>

                  <button
                    onClick={() => navigate("/bookings")}
                    className="flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    All bookings <IconChevronRight size={13} />
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                      <Skeleton key={item} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    {searchQuery
                      ? `No results for "${searchQuery}"`
                      : "No bookings yet"}
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto sm:-mx-6 sm:block sm:px-6">
                      <table className="min-w-[500px] w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400">
                              Event
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400">
                              Date
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400">
                              Amount
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredBookings.map((booking, index) => {
                            const status =
                              statusConfig[booking.status] ||
                              statusConfig.pending;

                            return (
                              <tr
                                key={booking.id}
                                className="cursor-pointer transition-colors hover:bg-gray-50"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <td className="py-3 pr-4">
                                  <p className="max-w-[180px] truncate font-semibold text-gray-900">
                                    {booking.event_name ||
                                      `Booking #${booking.id}`}
                                  </p>
                                  {booking.vendor_name && (
                                    <p className="truncate text-xs text-gray-400">
                                      {booking.vendor_name}
                                    </p>
                                  )}
                                </td>
                                <td className="whitespace-nowrap py-3 pr-4 text-gray-500">
                                  {formatDate(booking.event_date)}
                                </td>
                                <td className="whitespace-nowrap py-3 pr-4 font-semibold text-gray-900">
                                  {formatRM(booking.total_amount)}
                                </td>
                                <td className="py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}
                                  >
                                    {status.icon}
                                    {status.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 sm:hidden">
                      {filteredBookings.map((booking) => {
                        const status =
                          statusConfig[booking.status] || statusConfig.pending;

                        return (
                          <div
                            key={booking.id}
                            className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {booking.event_name ||
                                    `Booking #${booking.id}`}
                                </p>
                                {booking.vendor_name && (
                                  <p className="mt-0.5 truncate text-xs text-gray-400">
                                    {booking.vendor_name}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}
                              >
                                {status.icon}
                                {status.label}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                              <div className="rounded-lg bg-white px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                  Date
                                </p>
                                <p className="mt-1 font-medium text-gray-700">
                                  {formatDate(booking.event_date)}
                                </p>
                              </div>

                              <div className="rounded-lg bg-white px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                  Amount
                                </p>
                                <p className="mt-1 font-semibold text-gray-900">
                                  {formatRM(booking.total_amount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            <div className="space-y-6">
              <motion.div
                custom={6}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
              >
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Quick Actions
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map(
                    ({ label, icon: Icon, href, gradient, description }) => (
                      <button
                        key={href}
                        onClick={() => navigate(href)}
                        className="group flex min-h-28 flex-col items-center gap-2 rounded-xl bg-gray-50 p-3 transition-all hover:bg-gray-100"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm transition-transform group-hover:scale-110`}
                        >
                          <Icon size={18} />
                        </div>

                        <div className="text-center">
                          <p className="text-xs font-semibold leading-tight text-gray-700">
                            {label}
                          </p>
                          <p className="text-[10px] text-gray-400 sm:text-[11px]">
                            {description}
                          </p>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </motion.div>

              <motion.div
                custom={7}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
              >
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Spending Overview
                </h2>

                <div className="space-y-4">
                  {spendingBreakdown.map(
                    ({ label, percent, color, amount }) => (
                      <div key={label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-gray-700">
                            {label}
                          </span>
                          <span className="shrink-0 text-gray-500">
                            {amount}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className={`h-full rounded-full bg-gradient-to-r ${color}`}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm font-medium text-gray-500">
                    Total Spent
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {loading ? "-" : formatRM(totalSpent)}
                  </span>
                </div>
              </motion.div>

              <motion.div
                custom={8}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-5 shadow-lg sm:p-6"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />

                <div className="relative">
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white/80">
                    <IconTrendingUp size={12} />
                    ACARA PRO
                  </span>

                  <h3 className="text-lg font-bold leading-tight text-white">
                    Unlock premium vendor access
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/70">
                    Get priority booking, dedicated event manager, and exclusive
                    vendor deals.
                  </p>
                  <button className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50">
                    Upgrade Plan
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
  );
};

export default UserDashboard;
