"use client";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconBell,
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconReceipt,
  IconSettings,
  IconShoppingBag,
  IconStar,
  IconUser,
  IconX,
} from "@tabler/icons-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: IconLayoutDashboard },
  { label: "My Events", href: "/events", icon: IconCalendarEvent },
  { label: "Marketplace", href: "/marketplace", icon: IconShoppingBag },
  { label: "Bookings", href: "/bookings", icon: IconReceipt },
  { label: "Reviews", href: "/reviews", icon: IconStar },
  { label: "Notifications", href: "/notifications", icon: IconBell },
  { label: "Profile", href: "/profile", icon: IconUser },
  { label: "Settings", href: "/settings", icon: IconSettings },
];

export function UserSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userName = localStorage.getItem("user_name") || "User";
  const userEmail = localStorage.getItem("user_email") || "";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleNavigate = (href: string) => {
    navigate(href);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    setMobileOpen(false);
  };

  const sidebarContent = (isMobile = false) => (
    <>
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-colors hover:border-indigo-300 hover:text-indigo-600 md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <IconChevronRight size={12} /> : <IconChevronLeft size={12} />}
        </button>
      )}

      <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
            <span className="text-xs font-bold text-white">AC</span>
          </div>
          <AnimatePresence initial={false}>
            {(isMobile || !collapsed) && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap text-lg font-bold text-gray-900"
              >
                ACARA
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            aria-label="Close navigation menu"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = location.pathname === href;

          return (
            <button
              key={href}
              onClick={() => handleNavigate(href)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div
                className={`shrink-0 transition-colors ${
                  isActive
                    ? "text-indigo-600"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
                <Icon size={18} />
              </div>

              <AnimatePresence initial={false}>
                {(isMobile || !collapsed) && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {isActive && (isMobile || !collapsed) && (
                <motion.div
                  layoutId={isMobile ? "mobileActiveIndicator" : "activeIndicator"}
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div
          className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
            !isMobile && collapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>

          <AnimatePresence initial={false}>
            {(isMobile || !collapsed) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-semibold text-gray-900">{userName}</p>
                {userEmail && (
                  <p className="truncate text-xs text-gray-400">{userEmail}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleLogout}
          className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 ${
            !isMobile && collapsed ? "justify-center" : ""
          }`}
        >
          <IconLogout size={18} />
          <AnimatePresence initial={false}>
            {(isMobile || !collapsed) && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-md transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 md:hidden"
        aria-label="Open navigation menu"
      >
        <IconMenu2 size={20} />
      </button>

      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative z-10 hidden h-screen shrink-0 overflow-hidden border-r border-gray-100 bg-white shadow-sm md:flex md:flex-col"
      >
        {sidebarContent()}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[1px] md:hidden"
              aria-label="Close navigation overlay"
            />

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col bg-white shadow-2xl md:hidden"
            >
              {sidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
