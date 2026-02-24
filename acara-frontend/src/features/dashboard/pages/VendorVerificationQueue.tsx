import { Link } from "react-router-dom";
import { AdminSidebar } from "../../header/pages/AdminSidebar";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import {
    FiCheckCircle,
    FiXCircle,
    FiClock,
    FiArrowLeft,
} from "react-icons/fi";

type Vendor = {
    id: number;
    business_name: string;
    vendor_category: string | null;
    service_area: string | null;
    pricing_starting_from: string;
    pricing_unit: string;
    status: "pending_verification" | "approved" | "rejected";
    submitted_at: string;
    portfolio_url?: string | null;
    verification_url?: string | null;
};

type ActionType = "approve" | "reject";

const API_URL = "http://127.0.0.1:8000/api/admin/vendors";

const VendorVerificationQueue = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    const [search] = useState("");
    const [statusFilter] = useState<
        "all" | "pending_verification" | "approved" | "rejected"
    >("all");

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [actionType, setActionType] = useState<ActionType | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [adminNote, setAdminNote] = useState("");

    const token = localStorage.getItem("token");

    // FETCH VENDORS
    const fetchVendors = async () => {
        try {
            const res = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setVendors(res.data);
        } catch (error) {
            console.error("Failed to fetch vendors:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

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
                (v.vendor_category ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                (v.service_area ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase());

            const matchesStatus =
                statusFilter === "all" ? true : v.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [vendors, search, statusFilter]);

    const badge = (status: Vendor["status"]) => {
        if (status === "pending_verification") {
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
        <div className="flex h-screen w-full bg-gray-100">
            <AdminSidebar />

            <main className="flex flex-1 overflow-auto">
                <div className="flex h-full w-full flex-col gap-6 p-10">

                    <Link
                        to="/admindashboard"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"
                    >
                        <FiArrowLeft />
                        Back to Dashboard
                    </Link>

                    <h1 className="text-2xl font-semibold">
                        Vendor Verification Queue
                    </h1>

                    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th className="px-6 py-3">Business</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Service Area</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Documents</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center">
                                            Loading vendors...
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((v) => (
                                        <tr key={v.id} className="border-b">
                                            <td className="px-6 py-4 font-semibold">
                                                {v.business_name}
                                            </td>

                                            <td className="px-6 py-4">
                                                {v.vendor_category ?? "-"}
                                            </td>

                                            <td className="px-6 py-4">
                                                {v.service_area ?? "-"}
                                            </td>

                                            <td className="px-6 py-4">
                                                {badge(v.status)}
                                            </td>

                                            <td className="px-6 py-4 flex flex-grid gap-5">
                                                {v.portfolio_url ? (
                                                    <a
                                                        href={v.portfolio_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 text-xs font-semibold hover:underline"
                                                    >
                                                        View Portfolio
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}

                                                 {v.verification_url ? (
                                                    <a
                                                        href={v.verification_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sky-600 text-xs font-semibold hover:underline"
                                                    >
                                                        View Documents
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="px-6 py-4 space-x-2">
                                                {v.status === "pending_verification" && (
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

                    {/* Confirmation*/}
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

                                {/* <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder="Optional admin note"
                                    className="mt-4 w-full border rounded-lg p-3 text-sm"
                                /> */}

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
        </div>
    );
};

export default VendorVerificationQueue;