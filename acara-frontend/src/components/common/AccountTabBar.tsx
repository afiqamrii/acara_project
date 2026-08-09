import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  IconLayoutDashboard,
  IconShoppingBag,
  IconReceipt,
  IconStar,
  IconBell,
  IconUser,
  IconSettings,
  IconBriefcase,
  IconCalendarStats,
  IconClipboardCheck,
  IconCirclePlus,
  IconLogout,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { fetchUnreadNotificationCount } from "../../features/notifications/api";
import { LogoutConfirmationModal } from "./LogoutConfirmationModal";
import { performLogout } from "../../lib/auth";

type Workspace = "planning" | "vendor";

type TabItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  workspace: Workspace | "shared";
};

const planningTabs: TabItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: IconLayoutDashboard, roles: ["user", "vendor"], workspace: "planning" },
  { label: "Bookings", href: "/bookings", icon: IconReceipt, roles: ["user", "vendor"], workspace: "planning" },
  { label: "Reviews", href: "/reviews", icon: IconStar, workspace: "planning" },
  { label: "Profile", href: "/profile", icon: IconUser, workspace: "planning" },
  { label: "Notifications", href: "/notifications", icon: IconBell, workspace: "shared" },
  { label: "Settings", href: "/settings", icon: IconSettings, workspace: "shared" },
];

const vendorTabs: TabItem[] = [
  { label: "Vendor Dashboard", href: "/vendor/dashboard", icon: IconLayoutDashboard, roles: ["vendor"], workspace: "vendor" },
  { label: "My Services", href: "/vendor/services", icon: IconShoppingBag, roles: ["vendor"], workspace: "vendor" },
  { label: "Availability", href: "/vendor/availability", icon: IconCalendarStats, roles: ["vendor"], workspace: "vendor" },
  { label: "Booking Requests", href: "/vendor/bookings", icon: IconClipboardCheck, roles: ["vendor"], workspace: "vendor" },
  { label: "Add Service", href: "/service/register", icon: IconCirclePlus, roles: ["vendor"], workspace: "vendor" },
  { label: "Company Profile", href: "/vendor/register", icon: IconBriefcase, roles: ["vendor"], workspace: "vendor" },
  { label: "Notifications", href: "/notifications", icon: IconBell, workspace: "shared" },
  { label: "Settings", href: "/settings", icon: IconSettings, workspace: "shared" },
];

const AccountTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role") ?? "user";
  const isVendor = role === "vendor";
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);

  const pathIsVendorWorkspace = location.pathname.startsWith("/vendor/") || location.pathname === "/service/register";
  const storedWorkspace = localStorage.getItem("workspace_mode") as Workspace | null;
  const [workspace, setWorkspace] = useState<Workspace>(
    isVendor && pathIsVendorWorkspace
      ? "vendor"
      : isVendor
        ? storedWorkspace ?? "planning"
        : "planning",
  );

  const { data: notificationCountData } = useQuery({
    queryKey: ["notification-unread-count"],
    queryFn: fetchUnreadNotificationCount,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const unreadCount = notificationCountData?.unread_count ?? 0;

  const switchWorkspace = (next: Workspace) => {
    setWorkspace(next);
    localStorage.setItem("workspace_mode", next);
    navigate(next === "vendor" ? "/vendor/dashboard" : "/dashboard");
  };

  const allTabs = workspace === "vendor" && isVendor ? vendorTabs : planningTabs;
  const visibleTabs = allTabs.filter((tab) => {
    if (tab.roles && !tab.roles.includes(role)) return false;
    if (tab.workspace !== "shared" && tab.workspace !== workspace) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/marketplace") return location.pathname === "/marketplace";
    if (href === "/bookings") return location.pathname.startsWith("/bookings");
    if (href === "/vendor/bookings") return location.pathname.startsWith("/vendor/bookings");
    return location.pathname === href;
  };

  return (
    <div className="border-b border-[#e4d9f5] bg-white">
      <div className="mx-auto flex max-w-[1536px] items-center gap-1 w-[90%] lg:w-[80%]">
        {/* Vendor workspace switcher */}
        {isVendor && (
          <div className="mr-3 flex shrink-0 items-center gap-1 rounded-lg bg-[#f7f6fb] p-0.5">
            <button
              onClick={() => switchWorkspace("planning")}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${
                workspace === "planning"
                  ? "bg-white text-[#6f52a3] shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => switchWorkspace("vendor")}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${
                workspace === "vendor"
                  ? "bg-white text-[#6f52a3] shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Business
            </button>
          </div>
        )}

        {/* Tab navigation - scrollable on mobile */}
        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {visibleTabs.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);

            return (
              <button
                key={href}
                onClick={() => {
                  navigate(href);
                }}
                className={`group relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-[13px] font-semibold transition-colors ${
                  active
                    ? "text-[#6f52a3]"
                    : "text-gray-500 hover:text-[#6f52a3]"
                }`}
              >
                <Icon size={16} className={active ? "text-[#6f52a3]" : "text-gray-400 group-hover:text-[#6f52a3]"} />
                <span className="whitespace-nowrap">{label}</span>

                {label === "Notifications" && unreadCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}

                {/* Active indicator */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#6f52a3]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <button
          onClick={() => setLogoutConfirmationOpen(true)}
          className="ml-auto flex shrink-0 items-center gap-1.5 px-3 py-3 text-[13px] font-semibold text-rose-500 transition-colors hover:text-rose-600"
        >
          <IconLogout size={16} />
          <span className="hidden whitespace-nowrap sm:inline">Log out</span>
        </button>
      </div>

      <LogoutConfirmationModal
        isOpen={logoutConfirmationOpen}
        onCancel={() => setLogoutConfirmationOpen(false)}
        onConfirm={performLogout}
      />
    </div>
  );
};

export default AccountTabBar;
