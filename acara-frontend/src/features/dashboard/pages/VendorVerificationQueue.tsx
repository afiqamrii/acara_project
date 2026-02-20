import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminSidebar } from "../../header/pages/AdminSidebar";

import {
    FiSearch,
    FiFileText,
    FiCheckCircle,
    FiXCircle,
    FiClock,
    FiArrowLeft,
} from "react-icons/fi";

type Vendor = {
    id: number;
    business_name: string;
    vendor_category: string;
    service_area: string;
    pricing_starting_from: string;
    pricing_unit: string;
    status: "pending_verification" | "approved" | "rejected";
    submitted_at: string;
    portfolio_url?: string;
    verification_url?: string;
};

const VendorVerificationQueue = () => {
    const vendors: Vendor[] = [
        {
            id: 101,
            business_name: "ABC Enterprise",
            vendor_category: "Catering",
            service_area: "Selangor",
            pricing_starting_from: "1200",
            pricing_unit: "per event",
            status: "pending_verification",
            submitted_at: "2026-02-18 10:32 AM",
            portfolio_url: "#",
            verification_url: "#",
        },
        {
            id: 102,
            business_name: "Kawaii Catering",
            vendor_category: "Catering",
            service_area: "Kuala Lumpur",
            pricing_starting_from: "800",
            pricing_unit: "per event",
            status: "pending_verification",
            submitted_at: "2026-02-18 09:50 AM",
            portfolio_url: "#",
            verification_url: "#",
        },
        {
            id: 103,
            business_name: "Zack Sound System",
            vendor_category: "Audio & Lighting",
            service_area: "Johor",
            pricing_starting_from: "500",
            pricing_unit: "per day",
            status: "approved",
            submitted_at: "2026-02-17 02:10 PM",
            portfolio_url: "#",
            verification_url: "#",
        },
        {
            id: 104,
            business_name: "Raya Deco Pro",
            vendor_category: "Decoration",
            service_area: "Penang",
            pricing_starting_from: "300",
            pricing_unit: "per setup",
            status: "rejected",
            submitted_at: "2026-02-16 11:05 AM",
            portfolio_url: "#",
            verification_url: "#",
        },
    ];

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<
        "all" | "pending_verification" | "approved" | "rejected"
    >("all");

    const filtered = useMemo(() => {
        return vendors.filter((v) => {
            const matchesSearch =
                v.business_name.toLowerCase().includes(search.toLowerCase()) ||
                v.vendor_category.toLowerCase().includes(search.toLowerCase()) ||
                v.service_area.toLowerCase().includes(search.toLowerCase());

            const matchesStatus =
                statusFilter === "all" ? true : v.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [vendors, search, statusFilter]);

    const badge = (status: Vendor["status"]) => {
        if (status === "pending_verification") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
                    <FiClock />
                    Pending
                </span>
            );
        }

        if (status === "approved") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <FiCheckCircle />
                    Approved
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                <FiXCircle />
                Rejected
            </span>
        );
    };

    return (
        <div className="flex h-screen w-full bg-gray-100 dark:bg-neutral-800">
            <AdminSidebar />

            <main className="flex flex-1 overflow-auto">
                <div className="flex h-full w-full flex-col gap-6 p-4 md:p-10 dark:bg-neutral-900">

                    {/* HEADER */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex w-full flex-col items-start">
                            <Link
                                to="/admindashboard"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                            >
                                <FiArrowLeft />
                                Back to Dashboard
                            </Link>

                            <h1 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white">
                                Vendor Verification Queue
                            </h1>

                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                Review vendor applications, check documents, and approve or reject
                                verification.
                            </p>
                        </div>

                        {/* SEARCH + FILTER */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search vendor..."
                                    className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                            >
                                <option value="all">All Status</option>
                                <option value="pending_verification">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[950px] text-left text-sm">
                                <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Vendor</th>
                                        <th className="px-5 py-4 font-semibold">Category</th>
                                        <th className="px-5 py-4 font-semibold">Service Area</th>
                                        <th className="px-5 py-4 font-semibold">Pricing</th>
                                        <th className="px-5 py-4 font-semibold">Submitted</th>
                                        <th className="px-5 py-4 font-semibold">Status</th>
                                        <th className="px-5 py-4 font-semibold">Documents</th>
                                        <th className="px-5 py-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-10 text-center text-neutral-500 dark:text-neutral-400"
                                            >
                                                No vendors found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((v) => (
                                            <tr
                                                key={v.id}
                                                className="text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-900"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-neutral-900 dark:text-white">
                                                        {v.business_name}
                                                    </div>
                                                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        ID: #{v.id}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">{v.vendor_category}</td>
                                                <td className="px-5 py-4">{v.service_area}</td>

                                                <td className="px-5 py-4 font-semibold text-neutral-900 dark:text-white">
                                                    RM {v.pricing_starting_from}{" "}
                                                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                        / {v.pricing_unit}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-neutral-600 dark:text-neutral-400">
                                                    {v.submitted_at}
                                                </td>

                                                <td className="px-5 py-4">{badge(v.status)}</td>

                                                <td className="px-5 py-4">
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={v.portfolio_url}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                                        >
                                                            <FiFileText />
                                                            Portfolio
                                                        </a>

                                                        <a
                                                            href={v.verification_url}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                                        >
                                                            <FiFileText />
                                                            Verification
                                                        </a>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            disabled={v.status !== "pending_verification"}
                                                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Approve
                                                        </button>

                                                        <button
                                                            disabled={v.status !== "pending_verification"}
                                                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* FOOTER NOTE */}
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Tip: Only vendors with <b>Pending</b> status can be approved or rejected.
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VendorVerificationQueue;
