import { useDeferredValue, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBan,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import { fetchAdminUsers, type AccountRole, type AdminUser } from "../api";

const ROLE_LABELS: Record<AccountRole, string> = {
  user: "Organizer",
  vendor: "Vendor",
  crew: "Crew",
  admin: "Admin",
  super_admin: "Super Admin",
};

const roleStyle = (role: AccountRole) => {
  if (role === "super_admin") return "border-purple-200 bg-purple-50 text-purple-700";
  if (role === "admin") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (role === "vendor") return "border-blue-200 bg-blue-50 text-blue-700";
  if (role === "crew") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const formatDate = (value: string | null, includeTime = false) => {
  if (!value) return "Never";
  return new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};

const UserAvatar = ({ user }: { user: AdminUser }) => {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return user.avatar_url ? (
    <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white">
      {initials || "U"}
    </span>
  );
};

const StatCard = ({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: number;
  detail: string;
  icon: ElementType;
  tone: string;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span>
    </div>
  </section>
);

const AdminUsers = () => {
  usePageTitle("User Management");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState("all");
  const [page, setPage] = useState(1);

  const filters = { search: deferredSearch, role, status, verification, page };
  const usersQuery = useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => fetchAdminUsers(filters),
    placeholderData: (previous) => previous,
    staleTime: 20_000,
  });

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const hasFilters = Boolean(search || role !== "all" || status !== "all" || verification !== "all");
  const resetFilters = () => {
    setSearch("");
    setRole("all");
    setStatus("all");
    setVerification("all");
    setPage(1);
  };

  if (usersQuery.isPending) {
    return <Loader message="Loading user operations workspace..." />;
  }

  if (usersQuery.isError || !usersQuery.data) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <IconAlertCircle className="mx-auto text-red-600" size={34} />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">User records could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-600">No account information or status has been changed.</p>
          <button onClick={() => usersQuery.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            <IconRefresh size={17} /> Try again
          </button>
        </section>
      </main>
    );
  }

  const { users, stats, meta } = usersQuery.data;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
              <IconShieldCheck size={17} /> Account operations
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">User management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review account standing, verification and platform activity before taking a documented moderation action.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Records shown</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{meta.total}</p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total accounts" value={stats.total} detail="All registered roles" icon={IconUsers} tone="bg-slate-100 text-slate-700" />
          <StatCard label="Active" value={stats.active} detail="Can access ACARA" icon={IconUserCheck} tone="bg-emerald-50 text-emerald-700" />
          <StatCard label="Suspended" value={stats.suspended} detail="Access currently blocked" icon={IconBan} tone="bg-red-50 text-red-700" />
          <StatCard label="Unverified" value={stats.unverified} detail="Email verification pending" icon={IconAlertCircle} tone="bg-amber-50 text-amber-700" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_repeat(3,minmax(150px,0.35fr))_auto]">
            <label className="relative block">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search name, email, phone or business"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </label>
            <select value={role} onChange={(event) => updateFilter(setRole, event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50">
              <option value="all">All roles</option><option value="user">Organizers</option><option value="vendor">Vendors</option><option value="crew">Crew</option><option value="admin">Admins</option><option value="super_admin">Super admins</option>
            </select>
            <select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50">
              <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
            </select>
            <select value={verification} onChange={(event) => updateFilter(setVerification, event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50">
              <option value="all">Any verification</option><option value="verified">Verified email</option><option value="unverified">Unverified email</option>
            </select>
            <button onClick={resetFilters} disabled={!hasFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              <IconFilter size={17} /> Reset
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[1050px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Standing</th><th className="px-5 py-4">Platform activity</th><th className="px-5 py-4">Last access</th><th className="w-14 px-5 py-4"><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} onClick={() => navigate(`/admin/users/${user.id}`)} className="cursor-pointer transition hover:bg-indigo-50/40">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><UserAvatar user={user} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{user.name || "Profile incomplete"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>{user.business_name && <p className="mt-0.5 truncate text-[11px] font-medium text-indigo-600">{user.business_name}</p>}</div></div></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleStyle(user.role)}`}>{ROLE_LABELS[user.role]}</span></td>
                    <td className="px-5 py-4"><div className="space-y-1.5"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.status === "active" ? "text-emerald-700" : "text-red-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />{user.status === "active" ? "Active" : "Suspended"}</span><p className={`flex items-center gap-1 text-[11px] ${user.email_verified_at ? "text-slate-500" : "text-amber-700"}`}>{user.email_verified_at ? <IconCheck size={13} /> : <IconAlertCircle size={13} />}{user.email_verified_at ? "Email verified" : "Verification pending"}</p></div></td>
                    <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-800">{user.bookings_made_count + user.bookings_received_count} bookings</p><p className="mt-1 text-xs text-slate-500">{user.services_count} service{user.services_count === 1 ? "" : "s"}</p></td>
                    <td className="px-5 py-4"><p className="text-sm text-slate-700">{formatDate(user.last_login_at, true)}</p><p className="mt-1 text-[11px] text-slate-400">Joined {formatDate(user.created_at)}</p></td>
                    <td className="px-5 py-4 text-slate-400"><IconArrowRight size={18} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 lg:hidden">
            {users.map((user) => (
              <button key={user.id} onClick={() => navigate(`/admin/users/${user.id}`)} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-indigo-50/40">
                <UserAvatar user={user} />
                <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span><span className="block truncate text-sm font-semibold text-slate-950">{user.name || "Profile incomplete"}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{user.email}</span></span><span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${roleStyle(user.role)}`}>{ROLE_LABELS[user.role]}</span></span><span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"><span className={user.status === "active" ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>{user.status === "active" ? "Active" : "Suspended"}</span><span className="text-slate-500">{user.bookings_made_count + user.bookings_received_count} bookings</span><span className="text-slate-400">Last access: {formatDate(user.last_login_at)}</span></span></span>
                <IconChevronRight className="mt-2 shrink-0 text-slate-300" size={18} />
              </button>
            ))}
          </div>

          {users.length === 0 && (
            <div className="px-6 py-14 text-center"><IconUsers className="mx-auto text-slate-300" size={36} /><h2 className="mt-3 text-base font-semibold text-slate-900">No accounts match these filters</h2><p className="mt-1 text-sm text-slate-500">Try a broader search or reset the directory filters.</p></div>
          )}

          {meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
              <p className="text-xs text-slate-500">Page <span className="font-semibold text-slate-800">{meta.current_page}</span> of {meta.last_page}</p>
              <div className="flex gap-2"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={meta.current_page === 1 || usersQuery.isFetching} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><IconChevronLeft size={17} /></button><button onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))} disabled={meta.current_page === meta.last_page || usersQuery.isFetching} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><IconChevronRight size={17} /></button></div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AdminUsers;
