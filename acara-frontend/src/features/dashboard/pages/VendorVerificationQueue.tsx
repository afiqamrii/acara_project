import { Link } from "react-router-dom";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import {
    FiCheckCircle,
    FiXCircle,
    FiClock,
    FiArrowLeft,
} from "react-icons/fi";
import { logoutClient } from "../../../lib/auth";

type Vendor = {
    id: number;
    business_name: string;
    ssm_number: string | null;
    business_link: string | null;
    years_of_experience: number | null;
    status: "pending_completion" | "pending_verification" | "approved" | "rejected";
    submitted_at: string;
    ssm_document_url?: string | null;
};

type ActionType = "approve" | "reject";

const API_URL = "http://127.0.0.1:8000/api/admin/vendors";

const VendorVerificationQueue = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    const [search] = useState("");
    const [statusFilter] = useState<
        "all" | "pending_completion" | "pending_verification" | "approved" | "rejected"
    >("all");

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [actionType, setActionType] = useState<ActionType | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [adminNote, setAdminNote] = useState("");
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("token");

    const fetchVendors = async () => {
        try {
            const res = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setVendors(res.data);
        } catch (err: any) {
            console.error("Failed to fetch vendors:", err);

            if (err.response?.status === 401) {
                setError("Session expired. Please login again.");
            } else {
                setError("Something went wrong while fetching vendors.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleSessionRedirect = () => {
        logoutClient("session_expired");
    };

    const handleApprove = async (id: number) => {
        await axios.patch(
            `${API_URL}/${id}/approve`,
            { admin_note: adminNote },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    };

    const handleReject = async (id: number) => {
        await axios.patch(
            `${API_URL}/${id}/reject`,
            { admin_note: adminNote },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    };

    const openConfirm = (type: ActionType, vendor: Vendor) => {
        setActionType(type);
        setSelectedVendor(vendor);
        setAdminNote("");
        setConfirmOpen(true);
    };

    const confirmAction = async () => {
        if (!selectedVendor || !actionType) return;

        try {
            if (actionType === "approve") {
                await handleApprove(selectedVendor.id);
            } else {
                await handleReject(selectedVendor.id);
            }

            fetchVendors();
        } catch (error) {
            console.error("Action failed:", error);
        } finally {
            setConfirmOpen(false);
            setSelectedVendor(null);
            setActionType(null);
        }
    };

    const filtered = useMemo(() => {
        return vendors.filter((v) => {
            const matchesSearch =
                (v.business_name ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                (v.business_link ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                (v.ssm_number ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase());

            const matchesStatus =
                statusFilter === "all" ? true : v.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [vendors, search, statusFilter]);

    const badge = (status: Vendor["status"]) => {
        if (status === "pending_verification" || status === "pending_completion") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                    <FiClock /> Pending
                </span>
            );
        }

        if (status === "approved") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <FiCheckCircle /> Approved
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                <FiXCircle /> Rejected
            </span>
        );
    };
    return (

            <main className="flex min-w-0 flex-1 overflow-auto">
                <div className="flex h-full w-full flex-col gap-6 p-10">

                    <Link
                        to="/admin/dashboard"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"
                    >
                        <FiArrowLeft />
                        Back to Dashboard
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Vendor Verification Queue
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Review and manage vendor applications awaiting approval.
                            </p>
                        </div>

                        <div className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                            {vendors.length} Total Vendors
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex justify-between items-center">
                            <span>{error}</span>

                            <button
                                onClick={handleSessionRedirect}
                                className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                            >
                                OK
                            </button>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-300">
                                <tr>
                                    <th className="px-6 py-3">Business</th>
                                    <th className="px-6 py-3">SSM Number</th>
                                    <th className="px-6 py-3">Experience</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Documents</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center">
                                            Loading vendors...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center">
                                            No vendors found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((v) => (
                                        <tr key={v.id} className="border-b">
                                            <td className="px-6 py-4 font-semibold">
                                                {v.business_name}
                                            </td>

                                            <td className="px-6 py-4">
                                                {v.ssm_number ?? "-"}
                                            </td>

                                            <td className="px-6 py-4">
                                                {v.years_of_experience != null ? `${v.years_of_experience} years` : "-"}
                                            </td>

                                            <td className="px-6 py-4">
                                                {badge(v.status)}
                                            </td>

                                            <td className="px-6 py-4 flex flex-grid gap-5">
                                                {v.ssm_document_url ? (
                                                    <a
                                                        href={v.ssm_document_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 text-xs font-semibold hover:underline"
                                                    >
                                                        View SSM Document
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="px-6 py-4 space-x-2">
                                                {(v.status === "pending_verification" || v.status === "pending_completion") && (
                                                    <>
                                                        <button
                                                            onClick={() => openConfirm("approve", v)}
                                                            className="bg-emerald-500 text-white px-3 py-1 text-xs rounded hover:bg-emerald-600"
                                                        >
                                                            Approve
                                                        </button>

                                                        <button
                                                            onClick={() => openConfirm("reject", v)}
                                                            className="bg-rose-500 text-white px-3 py-1 text-xs rounded hover:bg-rose-600"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {confirmOpen && selectedVendor && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                                <h2 className="text-lg font-semibold">
                                    {actionType === "approve"
                                        ? "Approve Vendor"
                                        : "Reject Vendor"}
                                </h2>

                                <p className="mt-2 text-sm text-neutral-600">
                                    Are you sure you want to{" "}
                                    <strong>{actionType}</strong>{" "}
                                    {selectedVendor.business_name}?
                                </p>

                                <div className="mt-6 flex justify-end gap-2">
                                    <button
                                        onClick={() => setConfirmOpen(false)}
                                        className="px-4 py-2 text-sm border rounded-lg"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={confirmAction}
                                        className={`px-4 py-2 text-sm text-white rounded-lg ${actionType === "approve"
                                            ? "bg-emerald-500"
                                            : "bg-rose-500"
                                            }`}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
    );
};

export default VendorVerificationQueue;

