import { Link } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";

import {
    FiUsers,
    FiShield,
    FiClipboard,
    FiAlertTriangle,
    FiDollarSign,
    FiFileText,
    FiClock,
} from "react-icons/fi";

import adminBannerImg from "../../../img/admin_rightside.png";

type ServiceMini = {
    id: number;
    service_name: string;
    status: "pending_verification" | "approved" | "rejected";
};

type VendorMini = {
    id: number;
    business_name: string;
    status: "pending_completion" | "pending_verification" | "approved" | "rejected";
};

const AdminDashboard = () => {
    const [pendingServices, setPendingServices] = useState<ServiceMini[]>([]);
    const [pendingVendors, setPendingVendors] = useState<VendorMini[]>([]);

    const [pendingServiceCount, setPendingServiceCount] = useState(0);
    const [pendingVendorCount, setPendingVendorCount] = useState(0);

    useEffect(() => {
        const fetchPendingServices = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await axios.get(
                    "http://127.0.0.1:8000/api/admin/services",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const allPending = res.data.filter(
                    (v: ServiceMini) => v.status === "pending_verification"
                );

                setPendingServiceCount(allPending.length);
                setPendingServices(allPending.slice(0, 3));
            } catch (err) {
                console.error("Failed to load pending services", err);
            }
        };

        const fetchPendingVendors = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await axios.get(
                    "http://127.0.0.1:8000/api/admin/vendors",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const allPending = res.data.filter(
                    (v: VendorMini) => v.status === "pending_verification" || v.status === "pending_completion"
                );

                setPendingVendorCount(allPending.length);
                setPendingVendors(allPending.slice(0, 3));
            } catch (err) {
                console.error("Failed to load pending vendors", err);
            }
        };

        fetchPendingServices();
        fetchPendingVendors();
    }, []);

    const stats = [
        { label: "Total Users", value: "1,284", icon: <FiUsers /> },
        { label: "Active Organizers", value: "512", icon: <FiUsers /> },
        { label: "Services Pending", value: pendingServiceCount.toString(), icon: <FiClipboard /> },
        { label: "Vendors Pending", value: pendingVendorCount.toString(), icon: <FiClipboard /> },
        { label: "Crew Pending", value: "18", icon: <FiClipboard /> },
        { label: "Escrow Held (RM)", value: "RM 24,580", icon: <FiDollarSign /> },
        { label: "Pending Releases", value: "12", icon: <FiClock /> },
        { label: "Disputes Open", value: "3", icon: <FiAlertTriangle /> },
        { label: "Conflicts (7 days)", value: "6", icon: <FiShield /> },
    ];

    return (
            <main className="flex flex-1 overflow-auto bg-gray-100 dark:bg-neutral-800">
                <div className="flex flex-1">
                    <div className="flex h-full w-full flex-1 flex-col gap-6 p-4 md:p-10 dark:border-neutral-700 dark:bg-neutral-900">

                        <div className="w-full rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-600 p-8 shadow-lg">
                            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                                <div className="max-w-3xl">
                                    <h1 className="text-3xl font-semibold text-white">
                                        Welcome to ACARA Admin Dashboard
                                    </h1>

                                    <p className="mt-4 text-base leading-relaxed text-indigo-100">
                                        Verify services, vendors, and event crew, monitor conflicts, manage users and role status,
                                        and oversee escrow transactions to keep the marketplace secure.
                                    </p>

                                    <div className="mt-6 flex flex-wrap gap-4">
                                        <Link
                                            to="/admin/verifications/vendors"
                                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500"
                                        >
                                            <FiClipboard className="text-lg" />
                                            VERIFICATION CENTER
                                        </Link>

                                        <Link
                                            to="/admin/conflicts"
                                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/40 px-6 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 transition hover:bg-indigo-500/60"
                                        >
                                            <FiShield className="text-lg" />
                                            CONFLICT MONITOR
                                        </Link>

                                        <Link
                                            to="/admin/users"
                                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/40 px-6 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 transition hover:bg-indigo-500/60"
                                        >
                                            <FiUsers className="text-lg" />
                                            USER MANAGEMENT
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex justify-center md:justify-end">
                                    <img
                                        src={adminBannerImg}
                                        alt="Admin illustration"
                                        className="h-44 w-auto select-none drop-shadow-md"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {stats.map((s, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-neutral-700 dark:bg-neutral-950"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                            {s.label}
                                        </div>

                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                                            <span className="text-lg">{s.icon}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 text-2xl font-semibold text-neutral-900 dark:text-white">
                                        {s.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FiClipboard className="text-indigo-600 dark:text-indigo-300" />
                                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            Service Verification Queue
                                        </h2>
                                    </div>

                                    <Link
                                        to="/admin/verifications/services"
                                        className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                                    >
                                        View Verification Queue
                                    </Link>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {pendingServices.length === 0 ? (
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                            No pending service verifications
                                        </div>
                                    ) : (
                                        pendingServices.map((v) => (
                                            <div
                                                key={v.id}
                                                className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900"
                                            >
                                                <div>
                                                    <div className="font-semibold text-neutral-900 dark:text-white">
                                                        {v.service_name}
                                                    </div>
                                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                        Pending documents review
                                                    </div>
                                                </div>

                                                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
                                                    Pending
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FiClipboard className="text-indigo-600 dark:text-indigo-300" />
                                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            Vendor Verification Queue
                                        </h2>
                                    </div>

                                    <Link
                                        to="/admin/verifications/vendors" //utk approved vendor yg register
                                        className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                                    >
                                        View Vendors
                                    </Link>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {pendingVendors.length === 0 ? (
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                            No pending vendor verifications
                                        </div>
                                    ) : (
                                        pendingVendors.map((v) => (
                                            <div
                                                key={v.id}
                                                className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900"
                                            >
                                                <div>
                                                    <div className="font-semibold text-neutral-900 dark:text-white">
                                                        {v.business_name}
                                                    </div>
                                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                        Pending vendor review
                                                    </div>
                                                </div>

                                                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
                                                    Pending
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FiUsers className="text-indigo-600 dark:text-indigo-300" />
                                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            Crew Verification Queue
                                        </h2>
                                    </div>

                                    <Link
                                        to="/admin/verifications/crew"
                                        className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                                    >
                                        View All
                                    </Link>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {["Aiman Hakim", "Nur Syafiqah", "Daniel Tan"].map((name, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900"
                                        >
                                            <div>
                                                <div className="font-semibold text-neutral-900 dark:text-white">
                                                    {name}
                                                </div>
                                                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                    IC verification pending
                                                </div>
                                            </div>

                                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
                                                Pending
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FiAlertTriangle className="text-rose-600 dark:text-rose-300" />
                                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            Disputes Awaiting Mediation
                                        </h2>
                                    </div>

                                    <Link
                                        to="/admin/disputes"
                                        className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                                    >
                                        View All
                                    </Link>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {[
                                        { id: "#DSP-1042", reason: "Service not delivered" },
                                        { id: "#DSP-1045", reason: "Cancellation refund issue" },
                                    ].map((d, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900"
                                        >
                                            <div>
                                                <div className="font-semibold text-neutral-900 dark:text-white">
                                                    {d.id}
                                                </div>
                                                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                    {d.reason}
                                                </div>
                                            </div>

                                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                                Open
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FiDollarSign className="text-emerald-600 dark:text-emerald-300" />
                                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            Pending Escrow Releases
                                        </h2>
                                    </div>

                                    <Link
                                        to="/admin/escrow/releases"
                                        className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                                    >
                                        View All
                                    </Link>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {[
                                        { id: "#BK-2211", amount: "RM 1,200" },
                                        { id: "#BK-2215", amount: "RM 850" },
                                        { id: "#BK-2217", amount: "RM 2,500" },
                                    ].map((b, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900"
                                        >
                                            <div>
                                                <div className="font-semibold text-neutral-900 dark:text-white">
                                                    {b.id}
                                                </div>
                                                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                    Waiting organizer confirmation
                                                </div>
                                            </div>

                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                {b.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FiFileText className="text-indigo-600 dark:text-indigo-300" />
                                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                        Recent Admin Activity
                                    </h2>
                                </div>

                                <Link
                                    to="/admin/audit-logs"
                                    className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                                >
                                    View Audit Logs
                                </Link>
                            </div>

                            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Time</th>
                                            <th className="px-4 py-3 font-semibold">Action</th>
                                            <th className="px-4 py-3 font-semibold">Target</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                        <tr className="text-neutral-700 dark:text-neutral-200">
                                            <td className="px-4 py-3">10:32 AM</td>
                                            <td className="px-4 py-3">Vendor Approved</td>
                                            <td className="px-4 py-3">ABC Enterprise</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                    Approved
                                                </span>
                                            </td>
                                        </tr>

                                        <tr className="text-neutral-700 dark:text-neutral-200">
                                            <td className="px-4 py-3">09:50 AM</td>
                                            <td className="px-4 py-3">Crew Rejected</td>
                                            <td className="px-4 py-3">Nur Syafiqah</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                                    Rejected
                                                </span>
                                            </td>
                                        </tr>

                                        <tr className="text-neutral-700 dark:text-neutral-200">
                                            <td className="px-4 py-3">Yesterday</td>
                                            <td className="px-4 py-3">Escrow Frozen</td>
                                            <td className="px-4 py-3">Booking #BK-2215</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
                                                    Under Review
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
    );
};

export default AdminDashboard;
