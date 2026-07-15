import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";
import type { AxiosError } from "axios";
import { logoutClient } from "../../../lib/auth";
import api from "../../../lib/Api";

type Service = {
    id: number;
    service_name: string;
    service_category: string;
    service_details?: string | null;
    pricing_starting_from: number | string;
    pricing_unit: string;
    pricing_description?: string | null;
    status: "pending_verification" | "approved" | "rejected";
    rejection_reason?: string | null;
    vendor_name?: string | null;
    submitted_at: string;
    portfolio_url?: string | null;
};

type ActionType = "approve" | "reject";

const ServiceVerificationQueue = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionType, setActionType] = useState<ActionType | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [viewedService, setViewedService] = useState<Service | null>(null);
    const [actionReason, setActionReason] = useState("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchServices = async () => {
        try {
            setError(null);
            const res = await api.get("/admin/services");
            setServices(res.data);
        } catch (error) {
            const apiError = error as AxiosError;
            setError(apiError.response?.status === 401
                ? "Session expired. Please login again."
                : "Something went wrong while fetching services.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const pendingCount = useMemo(
        () => services.filter((service) => service.status === "pending_verification").length,
        [services]
    );

    const badge = (status: Service["status"]) => {
        if (status === "pending_verification") {
            return <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700"><FiClock /> Pending</span>;
        }

        if (status === "approved") {
            return <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><FiCheckCircle /> Approved</span>;
        }

        return <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"><FiXCircle /> Rejected</span>;
    };

    const formatPrice = (service: Service) => {
        const amount = Number(service.pricing_starting_from);
        const price = Number.isNaN(amount)
            ? service.pricing_starting_from
            : amount.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

        return `${price} / ${service.pricing_unit}`;
    };

    const openConfirm = (type: ActionType, service: Service) => {
        setActionType(type);
        setSelectedService(service);
        setActionReason("");
        setActionError(null);
    };

    const confirmAction = async () => {
        if (!selectedService || !actionType) return;
        if (actionType === "reject" && actionReason.trim().length < 10) {
            setActionError("Please provide a rejection reason of at least 10 characters.");
            return;
        }

        try {
            setActionLoading(true);
            setActionError(null);
            await api.patch(
                `/admin/services/${selectedService.id}/${actionType}`,
                actionType === "reject" ? { reason: actionReason.trim() } : undefined,
            );
            await fetchServices();
            setActionType(null);
            setSelectedService(null);
            setActionReason("");
        } catch (error) {
            const apiError = error as AxiosError<{ message?: string; errors?: { reason?: string[] } }>;
            setActionError(
                apiError.response?.data?.errors?.reason?.[0]
                ?? apiError.response?.data?.message
                ?? "The service decision could not be saved.",
            );
        } finally {
            setActionLoading(false);
        }
    };

    const actionButtons = (service: Service, fullWidth = false) => {
        if (service.status !== "pending_verification") return null;

        return (
            <div className={`flex gap-2 ${fullWidth ? "w-full" : ""}`}>
                <button
                    onClick={() => openConfirm("approve", service)}
                    className={`${fullWidth ? "flex-1" : ""} rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600`}
                >
                    Approve
                </button>
                <button
                    onClick={() => openConfirm("reject", service)}
                    className={`${fullWidth ? "flex-1" : ""} rounded bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600`}
                >
                    Reject
                </button>
            </div>
        );
    };

    return (
        <main className="flex min-w-0 flex-1 overflow-auto">
            <div className="flex min-h-full w-full flex-col gap-5 p-4 sm:p-6 lg:gap-6 lg:p-10">
                <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"
                >
                    <FiArrowLeft />
                    Back to Dashboard
                </Link>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                            Service Verification Queue
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Review services submitted by vendors before they appear in the marketplace.
                        </p>
                    </div>

                    <div className="w-fit shrink-0 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                        {pendingCount} Pending Services
                    </div>
                </div>

                {error && (
                    <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                        <span>{error}</span>
                        <button
                            onClick={() => logoutClient("session_expired")}
                            className="w-fit rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 sm:ml-4"
                        >
                            OK
                        </button>
                    </div>
                )}

                <div className="hidden overflow-x-auto rounded-2xl border bg-white shadow-sm md:block">
                    <table className="min-w-[920px] w-full text-left text-sm">
                        <thead className="bg-neutral-300">
                            <tr>
                                <th className="px-6 py-3">Service</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Pricing</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Portfolio</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading services...</td></tr>
                            ) : services.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center">No services found.</td></tr>
                            ) : (
                                services.map((service) => (
                                    <tr
                                        key={service.id}
                                        onClick={() => setViewedService(service)}
                                        className="cursor-pointer border-b align-top hover:bg-neutral-50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{service.service_name}</div>
                                            <div className="mt-1 line-clamp-2 max-w-xs text-xs text-gray-500">{service.service_details || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4">{service.service_category}</td>
                                        <td className="px-6 py-4">
                                            <div>{formatPrice(service)}</div>
                                            <div className="mt-1 line-clamp-2 max-w-xs text-xs text-gray-500">{service.pricing_description || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4">{badge(service.status)}</td>
                                        <td className="px-6 py-4">
                                            {service.portfolio_url ? (
                                                <a
                                                    href={service.portfolio_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs font-semibold text-indigo-600 hover:underline"
                                                >
                                                    View Portfolio
                                                </a>
                                            ) : "-"}
                                        </td>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>{actionButtons(service)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-3 md:hidden">
                    {loading ? (
                        <div className="rounded-2xl border bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">Loading services...</div>
                    ) : services.length === 0 ? (
                        <div className="rounded-2xl border bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">No services found.</div>
                    ) : (
                        services.map((service) => (
                            <div
                                key={service.id}
                                onClick={() => setViewedService(service)}
                                className="cursor-pointer rounded-2xl border bg-white p-4 shadow-sm active:bg-neutral-50"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="break-words text-base font-semibold text-gray-900">{service.service_name}</h2>
                                        <p className="mt-1 text-xs font-medium text-gray-500">{service.service_category}</p>
                                    </div>
                                    <div className="shrink-0">{badge(service.status)}</div>
                                </div>
                                <div className="mt-4 space-y-3 text-sm">
                                    <p className="line-clamp-2 break-words text-gray-700">{service.service_details || "-"}</p>
                                    <div>
                                        <p className="font-medium text-gray-900">{formatPrice(service)}</p>
                                        <p className="mt-1 line-clamp-2 break-words text-xs text-gray-500">{service.pricing_description || "-"}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                                        {service.portfolio_url ? (
                                            <a
                                                href={service.portfolio_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-xs font-semibold text-indigo-600 hover:underline"
                                            >
                                                View Portfolio
                                            </a>
                                        ) : <span className="text-xs text-gray-500">No portfolio</span>}
                                        <span className="text-xs text-gray-400">{service.submitted_at}</span>
                                    </div>
                                </div>
                                <div className="mt-4" onClick={(e) => e.stopPropagation()}>{actionButtons(service, true)}</div>
                            </div>
                        ))
                    )}
                </div>

                {viewedService && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewedService(null)}>
                        <div
                            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="break-words text-lg font-semibold text-gray-900">{viewedService.service_name}</h2>
                                    <p className="mt-1 text-xs font-medium text-gray-500">{viewedService.service_category}</p>
                                </div>
                                <div className="shrink-0">{badge(viewedService.status)}</div>
                            </div>

                            <div className="mt-5 space-y-4 text-sm">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Service Details</p>
                                    <p className="mt-1 whitespace-pre-line break-words text-gray-700">{viewedService.service_details || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pricing</p>
                                    <p className="mt-1 font-medium text-gray-900">{formatPrice(viewedService)}</p>
                                    <p className="mt-1 whitespace-pre-line break-words text-xs text-gray-500">{viewedService.pricing_description || "-"}</p>
                                </div>
                                {viewedService.rejection_reason && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Rejection reason</p>
                                        <p className="mt-1 whitespace-pre-line break-words text-sm text-red-800">{viewedService.rejection_reason}</p>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                                    {viewedService.portfolio_url ? (
                                        <a href={viewedService.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline">View Portfolio</a>
                                    ) : <span className="text-xs text-gray-500">No portfolio</span>}
                                    <span className="text-xs text-gray-400">{viewedService.submitted_at}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                {actionButtons(viewedService)}
                                <button
                                    onClick={() => setViewedService(null)}
                                    className="rounded-lg border px-4 py-2 text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedService && actionType && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
                            <h2 className="text-lg font-semibold">
                                {actionType === "approve" ? "Approve Service" : "Reject Service"}
                            </h2>
                            <p className="mt-2 break-words text-sm text-neutral-600">
                                Are you sure you want to <strong>{actionType}</strong> {selectedService.service_name}?
                            </p>
                            {actionType === "reject" && (
                                <div className="mt-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <label htmlFor="service-rejection-reason" className="text-xs font-semibold text-gray-700">
                                            Rejection reason
                                        </label>
                                        <span className="text-[11px] text-gray-400">{actionReason.length}/1000</span>
                                    </div>
                                    <textarea
                                        id="service-rejection-reason"
                                        value={actionReason}
                                        onChange={(event) => setActionReason(event.target.value)}
                                        rows={4}
                                        maxLength={1000}
                                        placeholder="Explain what the vendor must change before resubmitting..."
                                        className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                                    />
                                    <p className="mt-1 text-[11px] text-gray-500">Minimum 10 characters. This feedback is shown to the vendor.</p>
                                </div>
                            )}
                            {actionError && (
                                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                    {actionError}
                                </p>
                            )}
                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button
                                    onClick={() => {
                                        setSelectedService(null);
                                        setActionType(null);
                                        setActionReason("");
                                        setActionError(null);
                                    }}
                                    disabled={actionLoading}
                                    className="rounded-lg border px-4 py-2 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAction}
                                    disabled={actionLoading || (actionType === "reject" && actionReason.trim().length < 10)}
                                    className={`rounded-lg px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50 ${actionType === "approve" ? "bg-emerald-500" : "bg-rose-500"}`}
                                >
                                    {actionLoading ? "Saving..." : "Confirm"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default ServiceVerificationQueue;
