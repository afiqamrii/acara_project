import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { UserSidebar } from "../../header/pages/UserSidebar";
import api from "../../../lib/Api";
import {
  IconCalendarEvent,
  IconCurrencyDollar,
  IconShoppingBag,
  IconStar,
  IconArrowUpRight,
  IconArrowDownRight,
  IconSearch,
  IconBell,
  IconMapPin,
  IconClock,
  IconChevronRight,
  IconSparkles,
  IconTrendingUp,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconConfetti,
} from "@tabler/icons-react";

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <IconCheck size={12} />,
  },
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <IconAlertCircle size={12} />,
  },
  completed: {
    label: "Completed",
    color: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    icon: <IconCheck size={12} />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-50 text-red-700 border border-red-200",
    icon: <IconX size={12} />,
  },
};

const formatRM = (val?: number | string) => {
  if (!val) return "RM 0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `RM ${num.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Placeholder upcoming events for demo when API has no data
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

// ─── Quick Action Tiles ───────────────────────────────────────────────────────
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
    description: "Create & manage",
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

// ─── Animated fade-up variant ─────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

// ─── Main Component ───────────────────────────────────────────────────────────
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
        // Use placeholder data if API fails
        setBookings(placeholderEvents as Booking[]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const totalSpent = bookings.reduce((sum, b) => {
    const amt = typeof b.total_amount === "string"
      ? parseFloat(b.total_amount)
      : b.total_amount || 0;
    return sum + (b.status !== "cancelled" ? amt : 0);
  }, 0);

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const upcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  ).slice(0, 3);
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
    (b) =>
      !searchQuery ||
      b.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Skeleton loader ────────────────────────────────────────────────────────
  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />
  );

  return (
    <div className="flex h-screen w-full bg-[#f7f8fc] overflow-hidden">
      <UserSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── Top Bar ── */}
        <header className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Hello, {userName.split(" ")[0]} 👋
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:flex items-center">
              <IconSearch
                size={15}
                className="absolute left-3 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 w-56 transition-all"
              />
            </div>

            {/* Notification bell */}
            <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
              <IconBell size={17} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* CTA */}
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:opacity-90 transition-all"
            >
              <IconSparkles size={15} />
              Find Vendors
            </button>
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-sm`}
                  >
                    {stat.icon}
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
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
                  <p className="text-2xl font-bold text-gray-900 leading-none">
                    {loading ? <Skeleton className="h-7 w-24" /> : stat.value}
                  </p>
                  <p className="text-sm font-medium text-gray-500 mt-1">
                    {stat.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.subtext}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ── Left: Upcoming Events + Recent Bookings ── */}
            <div className="xl:col-span-2 space-y-6">

              {/* Upcoming Events */}
              <motion.div
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    Upcoming Events
                  </h2>
                  <button
                    onClick={() => navigate("/bookings")}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    View all <IconChevronRight size={13} />
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                      <IconCalendarEvent size={26} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      No upcoming events
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Start planning your next event
                    </p>
                    <button
                      onClick={() => navigate("/marketplace")}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      Browse Vendors
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((booking, i) => {
                      const s = statusConfig[booking.status] || statusConfig.pending;
                      return (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i }}
                          className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                        >
                          {/* Color accent bar */}
                          <div
                            className={`w-1 self-stretch rounded-full ${
                              booking.status === "confirmed"
                                ? "bg-emerald-500"
                                : booking.status === "pending"
                                ? "bg-amber-500"
                                : "bg-indigo-400"
                            }`}
                          />
                          {/* Event icon */}
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                            <IconCalendarEvent size={18} className="text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {booking.event_name || `Booking #${booking.id}`}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {booking.event_date && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <IconClock size={11} />
                                  {formatDate(booking.event_date)}
                                </span>
                              )}
                              {booking.location && (
                                <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                                  <IconMapPin size={11} />
                                  {booking.location}
                                </span>
                              )}
                            </div>
                            {booking.vendor_name && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                via {booking.vendor_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span
                              className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}
                            >
                              {s.icon}
                              {s.label}
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

              {/* Recent Bookings Table */}
              <motion.div
                custom={5}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Recent Bookings
                  </h2>
                  <button
                    onClick={() => navigate("/bookings")}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    All bookings <IconChevronRight size={13} />
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    {searchQuery ? `No results for "${searchQuery}"` : "No bookings yet"}
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-xs font-semibold text-gray-400 pb-3">
                            Event
                          </th>
                          <th className="text-left text-xs font-semibold text-gray-400 pb-3">
                            Date
                          </th>
                          <th className="text-left text-xs font-semibold text-gray-400 pb-3">
                            Amount
                          </th>
                          <th className="text-left text-xs font-semibold text-gray-400 pb-3">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredBookings.map((booking, i) => {
                          const s = statusConfig[booking.status] || statusConfig.pending;
                          return (
                            <tr
                              key={booking.id}
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              style={{ animationDelay: `${i * 50}ms` }}
                            >
                              <td className="py-3 pr-4">
                                <p className="font-semibold text-gray-900 truncate max-w-[180px]">
                                  {booking.event_name || `Booking #${booking.id}`}
                                </p>
                                {booking.vendor_name && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {booking.vendor_name}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                                {formatDate(booking.event_date)}
                              </td>
                              <td className="py-3 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                                {formatRM(booking.total_amount)}
                              </td>
                              <td className="py-3">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}
                                >
                                  {s.icon}
                                  {s.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ── Right Column ── */}
            <div className="space-y-6">

              {/* Quick Actions */}
              <motion.div
                custom={6}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map(({ label, icon: Icon, href, gradient, description }) => (
                    <button
                      key={href}
                      onClick={() => navigate(href)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all group"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-700 leading-tight">
                          {label}
                        </p>
                        <p className="text-[10px] text-gray-400">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Spending Overview */}
              <motion.div
                custom={7}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Spending Overview
                </h2>
                <div className="space-y-4">
                  {[
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
                      label: "Venue & Decor",
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
                  ].map(({ label, percent, color, amount }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-gray-700">{label}</span>
                        <span className="text-gray-500">{amount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                          className={`h-full rounded-full bg-gradient-to-r ${color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Total Spent
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {loading ? "—" : formatRM(totalSpent)}
                  </span>
                </div>
              </motion.div>

              {/* Promo / Upgrade Banner */}
              <motion.div
                custom={8}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 shadow-lg"
              >
                {/* Decorative circles */}
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />

                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 bg-white/15 px-3 py-1 rounded-full mb-3">
                    <IconTrendingUp size={12} />
                    ACARA PRO
                  </span>
                  <h3 className="text-white font-bold text-lg leading-tight">
                    Unlock premium vendor access
                  </h3>
                  <p className="text-white/70 text-xs mt-2 leading-relaxed">
                    Get priority booking, dedicated event manager, and exclusive vendor deals.
                  </p>
                  <button className="mt-4 w-full py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
                    Upgrade Plan
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;