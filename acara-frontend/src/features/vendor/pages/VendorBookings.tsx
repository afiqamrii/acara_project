import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import api from '../../../lib/Api';
import { fetchUnreadNotificationCount } from '../../notifications/api';
import BookingTimeline, { type BookingTimelineEvent } from '../../bookings/components/BookingTimeline';
import type { BookingRescheduleRequest } from '../../bookings/api';

// ── Types ─────────────────────────────────────────────────────────────────────
type Customer = { id: number; name: string; email: string; phone: string | null };
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'rejected' | 'cancelled' | 'expired';
type DisplayStatus = 'pending' | 'confirmed' | 'completed' | 'rejected' | 'cancelled' | 'expired';
type DialogType = 'approve' | 'reject' | 'cancel' | 'complete' | 'reschedule_approve' | 'reschedule_reject';

type VendorBooking = {
    id: number;
    service_id: number;
    service_name: string;
    category: string;
    price: string;
    price_value: number;
    pricing_unit: string;
    selected_date: string;
    status: BookingStatus;
    booked_at: string;
    updated_at: string;
    notes: string | null;
    rejection_reason: string | null;
    cancellation_reason: string | null;
    cancelled_by: 'vendor' | 'customer' | null;
    rejected_at: string | null;
    cancelled_at: string | null;
    expires_at: string | null;
    reminder_sent_at: string | null;
    expired_at: string | null;
    confirmed_at: string | null;
    completed_at: string | null;
    reschedule_request: BookingRescheduleRequest | null;
    reschedule_history: BookingRescheduleRequest[];
    timeline: BookingTimelineEvent[];
    portfolio_url: string | null;
    customer: Customer;
};

type EnrichedBooking = VendorBooking & { displayStatus: DisplayStatus; daysDiff: number };

type BookingsResponse = {
    bookings: VendorBooking[];
    counts: { pending: number; confirmed: number; completed: number; rejected: number; cancelled: number; expired: number };
};

type SortKey = 'newest' | 'oldest' | 'nearest' | 'price' | 'pending_first' | 'completed_first';

// ── API ───────────────────────────────────────────────────────────────────────
const fetchVendorBookings = async (): Promise<BookingsResponse> => {
    const res = await api.get('/vendor/bookings');
    return res.data;
};

const approveBooking  = (id: number) => api.patch(`/vendor/bookings/${id}/approve`);
const completeBooking = (id: number) => api.patch(`/vendor/bookings/${id}/complete`);
const rejectBooking   = ({ id, reason }: { id: number; reason: string }) => api.patch(`/vendor/bookings/${id}/reject`, { reason });
const cancelBooking   = ({ id, reason }: { id: number; reason: string }) => api.patch(`/vendor/bookings/${id}/cancel`, { reason });
const approveReschedule = (id: number) => api.patch(`/vendor/bookings/${id}/reschedule/approve`);
const rejectReschedule = ({ id, reason }: { id: number; reason: string }) => api.patch(`/vendor/bookings/${id}/reschedule/reject`, { reason });

const apiErrorMessage = (error: unknown) =>
    (error as AxiosError<{ message?: string }>).response?.data?.message ?? 'This booking action could not be completed.';

// ── Date helpers ──────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBookedAt(iso: string) {
    return new Date(iso.replace(' ', 'T')).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysDiffFromToday(iso: string): number {
    const target = new Date(iso + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

// Preserve the backend lifecycle status. A past confirmed booking stays
// confirmed until the vendor performs the explicit completion action.
function getDisplayStatus(status: BookingStatus, expiresAt: string | null): DisplayStatus {
    if (status === 'expired') return 'expired';
    if (status === 'rejected') return 'rejected';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'completed') return 'completed';
    if (status === 'pending') {
        if (expiresAt && new Date(expiresAt.replace(' ', 'T')).getTime() <= Date.now()) return 'expired';
        return 'pending';
    }
    return 'confirmed';
}

function getCountdownLabel(displayStatus: DisplayStatus, daysDiff: number): string {
    if (displayStatus === 'expired') return 'Expired';
    if (displayStatus === 'rejected') return 'Rejected';
    if (displayStatus === 'cancelled') return 'Cancelled';
    if (displayStatus === 'completed') {
        if (daysDiff === 0) return 'Completed today';
        if (daysDiff < 0) return daysDiff === -1 ? 'Yesterday' : `${Math.abs(daysDiff)} days ago`;
        return 'Completed';
    }
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Tomorrow';
    if (daysDiff < 0) return `${Math.abs(daysDiff)} day${daysDiff === -1 ? '' : 's'} overdue`;
    return `In ${daysDiff} days`;
}

type Priority = 'today' | 'tomorrow' | 'soon' | 'future' | 'neutral';

function getPriority(displayStatus: DisplayStatus, daysDiff: number): Priority {
    if (displayStatus === 'completed' || displayStatus === 'rejected' || displayStatus === 'cancelled' || displayStatus === 'expired') return 'neutral';
    if (daysDiff <= 0) return 'today';
    if (daysDiff === 1) return 'tomorrow';
    if (daysDiff <= 7) return 'soon';
    return 'future';
}

const PRIORITY_STYLES: Record<Priority, { chip: string; dot: string; border: string }> = {
    today:    { chip: 'bg-red-50 text-red-600 ring-1 ring-red-200',       dot: 'bg-red-500',    border: 'border-l-red-400' },
    tomorrow: { chip: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200', dot: 'bg-orange-400', border: 'border-l-orange-400' },
    soon:     { chip: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',  dot: 'bg-amber-400',  border: 'border-l-amber-400' },
    future:   { chip: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200', dot: 'bg-emerald-400', border: 'border-l-emerald-400' },
    neutral:  { chip: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200',     dot: 'bg-gray-300',   border: 'border-l-gray-200' },
};

const STATUS_CONFIG: Record<DisplayStatus, { label: string; pill: string; dot: string; accent: string }> = {
    pending:   { label: 'Pending',   pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',      dot: 'bg-amber-400',   accent: 'from-amber-400 to-orange-400' },
    confirmed: { label: 'Confirmed', pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',         dot: 'bg-blue-400',    accent: 'from-blue-400 to-indigo-400' },
    completed: { label: 'Completed', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-400', accent: 'from-emerald-400 to-teal-400' },
    rejected:  { label: 'Rejected',  pill: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',   dot: 'bg-orange-400',  accent: 'from-orange-300 to-amber-400' },
    cancelled: { label: 'Cancelled', pill: 'bg-red-50 text-red-600 ring-1 ring-red-200',            dot: 'bg-red-400',     accent: 'from-red-300 to-rose-300' },
    expired:   { label: 'Expired',   pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',     dot: 'bg-slate-400',   accent: 'from-slate-300 to-slate-500' },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const FilterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
    </svg>
);

const ImagePlaceholderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-white/70">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
);

const CalendarMiniIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

// ── Success overlay ───────────────────────────────────────────────────────────
const SuccessOverlay = ({ booking, onDone }: { booking: VendorBooking; onDone: () => void }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onDone}
    >
        <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 20 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{    scale: 0.85, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="w-full max-w-xs bg-white rounded-[28px] shadow-2xl shadow-emerald-900/20 overflow-hidden text-center"
            onClick={e => e.stopPropagation()}
        >
            <div className="relative bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500 pt-10 pb-8 px-6">
                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs><pattern id="sdots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="white" /></pattern></defs>
                    <rect width="100%" height="100%" fill="url(#sdots)" />
                </svg>

                <div className="relative flex items-center justify-center mx-auto w-20 h-20">
                    {[1, 2, 3].map(i => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.6, opacity: 0.6 }}
                            animate={{ scale: 1.8 + i * 0.3, opacity: 0 }}
                            transition={{ duration: 1.2, delay: i * 0.18, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.5 }}
                            className="absolute inset-0 rounded-full border-2 border-white/50"
                        />
                    ))}

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.05 }}
                        className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-lg"
                    >
                        <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                            <motion.path
                                d="M14 27 L22 35 L38 17"
                                stroke="white"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.45, delay: 0.22, ease: 'easeOut' }}
                            />
                        </svg>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mt-4 mb-1">Booking Approved</p>
                    <h2 className="text-2xl font-black text-white">All set! 🎉</h2>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="px-6 py-5"
            >
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-4 text-left">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                        <span className="text-xs font-black text-white">{getInitials(booking.customer.name)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-emerald-900 truncate">{booking.customer.name}</p>
                        <p className="text-[11px] text-emerald-600 truncate">{booking.service_name} · {formatDate(booking.selected_date)}</p>
                    </div>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                    The customer will be notified that their booking has been confirmed.
                </p>

                <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={onDone}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 transition-all"
                >
                    Done
                </motion.button>
            </motion.div>
        </motion.div>
    </motion.div>
);

// ── Confirm dialog ─────────────────────────────────────────────────────────────
const DIALOG_COPY: Record<DialogType, {
    iconBg: string; title: string; confirmLabel: string; loadingLabel: string; buttonClass: string;
}> = {
    approve:  { iconBg: 'bg-emerald-50', title: 'Approve booking?',            confirmLabel: 'Yes, Approve',  loadingLabel: 'Approving...',      buttonClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-100' },
    reject:   { iconBg: 'bg-orange-50',  title: 'Reject booking request?',      confirmLabel: 'Reject Request', loadingLabel: 'Rejecting...',       buttonClass: 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-100' },
    cancel:   { iconBg: 'bg-red-50',     title: 'Cancel booking?',             confirmLabel: 'Yes, Cancel',   loadingLabel: 'Cancelling...',      buttonClass: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md shadow-red-100' },
    complete: { iconBg: 'bg-blue-50',    title: 'Mark booking as completed?',  confirmLabel: 'Yes, Complete', loadingLabel: 'Marking complete...', buttonClass: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-100' },
    reschedule_approve: { iconBg: 'bg-indigo-50', title: 'Approve the new event date?', confirmLabel: 'Approve Date', loadingLabel: 'Approving date...', buttonClass: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-100' },
    reschedule_reject: { iconBg: 'bg-orange-50', title: 'Decline the date change?', confirmLabel: 'Decline Change', loadingLabel: 'Declining...', buttonClass: 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-100' },
};

const ConfirmDialog = ({
    type, booking, onConfirm, onClose, loading, error,
}: {
    type: DialogType;
    booking: VendorBooking;
    onConfirm: (reason?: string) => void;
    onClose: () => void;
    loading: boolean;
    error?: string;
}) => {
    const copy = DIALOG_COPY[type];
    const [reason, setReason] = useState('');
    const requiresReason = type === 'reject' || type === 'cancel' || type === 'reschedule_reject';
    const trimmedReason = reason.trim();
    const reasonIsValid = !requiresReason || trimmedReason.length >= 10;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${copy.iconBg}`}>
                    {type === 'approve' && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2} className="w-6 h-6"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                    {(type === 'reject' || type === 'cancel') && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={type === 'reject' ? '#f97316' : '#ef4444'} strokeWidth={2} className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
                    {type === 'complete' && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-6 h-6"><path d="M20 6L9 17l-5-5"/></svg>}
                    {(type === 'reschedule_approve' || type === 'reschedule_reject') && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={type === 'reschedule_approve' ? '#6366f1' : '#f97316'} strokeWidth={2} className="w-6 h-6"><path d="M7 7h11l-3-3"/><path d="m18 7-3 3"/><path d="M17 17H6l3 3"/><path d="m6 17 3-3"/></svg>}
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1">{copy.title}</h3>
                <p className="text-sm text-gray-500 mb-1">
                    <span className="font-semibold text-gray-700">{booking.customer.name}</span> · {booking.service_name}
                </p>
                <p className="text-sm text-gray-400 mb-6">
                    {type.startsWith('reschedule_') && booking.reschedule_request
                        ? `${formatDate(booking.reschedule_request.original_date)} → ${formatDate(booking.reschedule_request.requested_date)}`
                        : formatDate(booking.selected_date)}
                </p>

                {type === 'reject' && (
                    <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 mb-4">
                        The request will be rejected and the selected date will become available again.
                    </p>
                )}
                {type === 'cancel' && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
                        The customer will be notified that their booking was cancelled.
                    </p>
                )}
                {type === 'reschedule_approve' && booking.reschedule_request && (
                    <p className="text-xs leading-5 text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mb-4">
                        The new date will be reserved and the original date will be released. The customer will be notified.
                    </p>
                )}
                {type === 'reschedule_reject' && (
                    <p className="text-xs leading-5 text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 mb-4">
                        The booking will remain confirmed on its original date.
                    </p>
                )}

                {requiresReason && (
                    <label className="block mb-4">
                        <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-700">
                            {type === 'reject'
                                ? 'Rejection reason'
                                : type === 'reschedule_reject'
                                    ? 'Reason for declining the date'
                                    : 'Cancellation reason'}
                            <span className={`font-medium ${trimmedReason.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                                {reason.length}/1000
                            </span>
                        </span>
                        <textarea
                            value={reason}
                            onChange={event => setReason(event.target.value)}
                            maxLength={1000}
                            rows={4}
                            autoFocus
                            placeholder={type === 'reject'
                                ? 'Explain why you cannot accept this request...'
                                : type === 'reschedule_reject'
                                    ? 'Explain why the requested date cannot be accepted...'
                                    : 'Explain why this confirmed booking must be cancelled...'}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50"
                        />
                        {trimmedReason.length > 0 && trimmedReason.length < 10 && (
                            <span className="mt-1 block text-xs text-red-500">Please enter at least 10 characters.</span>
                        )}
                    </label>
                )}
                {type === 'complete' && (
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-4">
                        This confirms the event has taken place and closes out the booking.
                    </p>
                )}

                {error && (
                    <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                        {error}
                    </p>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => onConfirm(requiresReason ? trimmedReason : undefined)}
                        disabled={loading || !reasonIsValid}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 ${copy.buttonClass}`}
                    >
                        {loading
                            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{copy.loadingLabel}</span>
                            : copy.confirmLabel
                        }
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Countdown chip ────────────────────────────────────────────────────────────
const CountdownChip = ({ booking }: { booking: EnrichedBooking }) => {
    const priority = getPriority(booking.displayStatus, booking.daysDiff);
    const style = PRIORITY_STYLES[priority];
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {getCountdownLabel(booking.displayStatus, booking.daysDiff)}
        </span>
    );
};

const RescheduleRequestPanel = ({
    booking,
    onApprove,
    onReject,
}: {
    booking: VendorBooking;
    onApprove: (booking: VendorBooking) => void;
    onReject: (booking: VendorBooking) => void;
}) => {
    const request = booking.reschedule_request;
    if (!request) return null;

    return (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Date Change Requested</p>
            <p className="mt-1.5 text-xs font-black text-slate-900">
                {formatDate(request.original_date)} → {formatDate(request.requested_date)}
            </p>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{request.reason}</p>
            <div className="mt-3 flex gap-2" onClick={event => event.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => onReject(booking)}
                    className="flex-1 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-50"
                >
                    Decline date
                </button>
                <button
                    type="button"
                    onClick={() => onApprove(booking)}
                    className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-xs font-bold text-white hover:from-indigo-700 hover:to-purple-700"
                >
                    Approve date
                </button>
            </div>
        </div>
    );
};

// ── Booking card ──────────────────────────────────────────────────────────────
const BookingCard = ({
    booking, index,
    onApprove, onReject, onCancel, onComplete, onRescheduleApprove, onRescheduleReject, onOpen,
}: {
    booking: EnrichedBooking;
    index: number;
    onApprove: (b: VendorBooking) => void;
    onReject: (b: VendorBooking) => void;
    onCancel: (b: VendorBooking) => void;
    onComplete: (b: VendorBooking) => void;
    onRescheduleApprove: (b: VendorBooking) => void;
    onRescheduleReject: (b: VendorBooking) => void;
    onOpen: (b: EnrichedBooking) => void;
}) => {
    const cfg = STATUS_CONFIG[booking.displayStatus];
    const priority = getPriority(booking.displayStatus, booking.daysDiff);
    const initials = getInitials(booking.customer.name);
    const canApprove = booking.displayStatus === 'pending';
    const canCancel = booking.displayStatus === 'confirmed';
    const canComplete = booking.displayStatus === 'confirmed' && booking.daysDiff <= 0 && !booking.reschedule_request;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            onClick={() => onOpen(booking)}
            className={`bg-white rounded-[20px] border border-gray-100 border-l-4 ${PRIORITY_STYLES[priority].border} shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden hover:shadow-[0_4px_20px_rgba(109,40,217,0.08)] transition-shadow duration-200 cursor-pointer`}
        >
            <div className={`h-1 w-full bg-gradient-to-r ${cfg.accent}`} />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-xs font-black text-white">{initials}</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{booking.customer.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{booking.customer.email}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${cfg.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </span>
                </div>

                {/* Service + date info */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex gap-2 items-start">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                            {booking.portfolio_url
                                ? <img src={booking.portfolio_url} alt="" className="w-full h-full object-cover" />
                                : <ImagePlaceholderIcon />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Service</p>
                            <p className="text-xs font-bold text-gray-800 leading-tight truncate">{booking.service_name}</p>
                            <p className="text-[10px] text-purple-500 font-medium mt-0.5 capitalize">{booking.category}</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Event Date</p>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{formatDate(booking.selected_date)}</p>
                        <div className="mt-1"><CountdownChip booking={booking} /></div>
                    </div>
                </div>

                {/* Footer meta */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400 mb-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 13.92z" />
                        </svg>
                        {booking.customer.phone ?? 'No phone'}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        Booked {formatBookedAt(booking.booked_at)}
                    </span>
                    <span className="font-semibold text-gray-500">{booking.price} / {booking.pricing_unit}</span>
                </div>

                {/* Notes */}
                {booking.notes && (
                    <div className="mb-4 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Customer Note</p>
                        <p className="text-xs text-blue-700 line-clamp-2">{booking.notes}</p>
                    </div>
                )}

                {booking.displayStatus === 'pending' && booking.expires_at && (
                    <div className="mb-4 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Response Deadline</p>
                        <p className="text-xs font-semibold text-amber-900">Respond by {formatBookedAt(booking.expires_at)}</p>
                    </div>
                )}

                {booking.displayStatus === 'expired' && (
                    <div className="mb-4 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Closed Automatically</p>
                        <p className="text-xs leading-5 text-slate-700">The response deadline passed. The organizer was notified and the date was released.</p>
                    </div>
                )}

                {booking.displayStatus === 'rejected' && booking.rejection_reason && (
                    <div className="mb-4 px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-0.5">Rejection Reason</p>
                        <p className="text-xs text-orange-800 line-clamp-3">{booking.rejection_reason}</p>
                    </div>
                )}

                {booking.displayStatus === 'cancelled' && booking.cancellation_reason && (
                    <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Cancellation Reason</p>
                        <p className="text-xs text-red-800 line-clamp-3">{booking.cancellation_reason}</p>
                    </div>
                )}

                <RescheduleRequestPanel
                    booking={booking}
                    onApprove={onRescheduleApprove}
                    onReject={onRescheduleReject}
                />

                {/* Actions */}
                {canApprove && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <motion.button
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            onClick={() => onReject(booking)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                            <XIcon /> Decline
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            onClick={() => onApprove(booking)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-100 transition-all"
                        >
                            <CheckIcon /> Approve
                        </motion.button>
                    </div>
                )}

                {!canApprove && canCancel && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <motion.button
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            onClick={() => onCancel(booking)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <XIcon /> Cancel
                        </motion.button>
                        {canComplete && (
                            <motion.button
                                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                onClick={() => onComplete(booking)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-100 transition-all"
                            >
                                <CheckIcon /> Mark Completed
                            </motion.button>
                        )}
                    </div>
                )}

                {!canApprove && !canCancel && (
                    <div className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium ${
                        booking.displayStatus === 'cancelled'
                            ? 'bg-red-50 text-red-500'
                            : booking.displayStatus === 'expired'
                                ? 'bg-slate-100 text-slate-600'
                            : booking.displayStatus === 'rejected'
                                ? 'bg-orange-50 text-orange-600'
                                : 'bg-emerald-50 text-emerald-500'
                    }`}>
                        {(booking.displayStatus === 'cancelled' || booking.displayStatus === 'rejected' || booking.displayStatus === 'expired') ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        ) : <CheckIcon />}
                        {booking.displayStatus === 'cancelled'
                            ? 'Booking cancelled'
                            : booking.displayStatus === 'expired'
                                ? 'Request expired automatically'
                            : booking.displayStatus === 'rejected'
                                ? 'Request rejected'
                                : 'Service completed'}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ── Booking drawer ────────────────────────────────────────────────────────────
const BookingDrawer = ({
    booking, onClose, onApprove, onReject, onCancel, onComplete, onRescheduleApprove, onRescheduleReject,
}: {
    booking: EnrichedBooking;
    onClose: () => void;
    onApprove: (b: VendorBooking) => void;
    onReject: (b: VendorBooking) => void;
    onCancel: (b: VendorBooking) => void;
    onComplete: (b: VendorBooking) => void;
    onRescheduleApprove: (b: VendorBooking) => void;
    onRescheduleReject: (b: VendorBooking) => void;
}) => {
    const cfg = STATUS_CONFIG[booking.displayStatus];
    const canApprove = booking.displayStatus === 'pending';
    const canCancel = booking.displayStatus === 'confirmed';
    const canComplete = booking.displayStatus === 'confirmed' && booking.daysDiff <= 0 && !booking.reschedule_request;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative h-40 overflow-hidden shrink-0">
                    {booking.portfolio_url
                        ? <img src={booking.portfolio_url} alt={booking.service_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-700" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-colors"
                    >
                        <XIcon />
                    </button>
                    <div className="absolute bottom-4 left-5 right-5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                        </span>
                        <h2 className="text-lg font-black text-white mt-1.5 drop-shadow leading-tight">{booking.service_name}</h2>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-800">{formatDate(booking.selected_date)}</p>
                        <CountdownChip booking={booking} />
                    </div>

                    {/* Customer */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Customer</p>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
                                <span className="text-xs font-black text-white">{getInitials(booking.customer.name)}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{booking.customer.name}</p>
                                <p className="text-xs text-gray-400 truncate">{booking.customer.email}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 shrink-0">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 13.92z" />
                            </svg>
                            {booking.customer.phone ?? 'No phone provided'}
                        </p>
                    </div>

                    {/* Service */}
                    <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Category</p>
                            <p className="text-sm font-bold text-gray-800 capitalize">{booking.category}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Price</p>
                            <p className="text-sm font-bold text-purple-700">{booking.price} <span className="text-gray-400 font-medium">/ {booking.pricing_unit}</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Booked On</p>
                            <p className="text-sm font-semibold text-gray-700">{formatBookedAt(booking.booked_at)}</p>
                        </div>
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                        <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Customer Note</p>
                            <p className="text-sm text-blue-700">{booking.notes}</p>
                        </div>
                    )}

                    {booking.displayStatus === 'pending' && booking.expires_at && (
                        <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Response Deadline</p>
                            <p className="text-sm font-semibold text-amber-900">{formatBookedAt(booking.expires_at)}</p>
                            <p className="mt-1 text-xs leading-5 text-amber-700">Approve or decline before this time. A reminder is sent as the deadline approaches.</p>
                        </div>
                    )}

                    {booking.displayStatus === 'expired' && (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Closed Automatically</p>
                            <p className="text-sm leading-6 text-slate-700">No response was recorded before the deadline. The organizer was notified and the selected date is available again.</p>
                        </div>
                    )}

                    {booking.displayStatus === 'rejected' && booking.rejection_reason && (
                        <div className="px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl">
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Rejection Reason</p>
                            <p className="text-sm text-orange-800 whitespace-pre-wrap">{booking.rejection_reason}</p>
                        </div>
                    )}

                    {booking.displayStatus === 'cancelled' && booking.cancellation_reason && (
                        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Cancellation Reason</p>
                            <p className="text-sm text-red-800 whitespace-pre-wrap">{booking.cancellation_reason}</p>
                        </div>
                    )}

                    <RescheduleRequestPanel
                        booking={booking}
                        onApprove={onRescheduleApprove}
                        onReject={onRescheduleReject}
                    />

                    {booking.timeline.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Booking Activity</p>
                            <BookingTimeline events={booking.timeline} />
                        </div>
                    )}

                    {/* Actions */}
                    {canApprove && (
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => onReject(booking)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-red-200 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                                <XIcon /> Decline
                            </button>
                            <button
                                onClick={() => onApprove(booking)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-100 transition-all"
                            >
                                <CheckIcon /> Approve
                            </button>
                        </div>
                    )}
                    {!canApprove && canCancel && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onCancel(booking)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <XIcon /> Cancel
                            </button>
                            {canComplete && (
                                <button
                                    onClick={() => onComplete(booking)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-100 transition-all"
                                >
                                    <CheckIcon /> Mark Completed
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-[20px] border border-gray-100 overflow-hidden">
        <div className="h-1 bg-gray-100" />
        <div className="p-5 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-gray-100 rounded-full w-32" />
                    <div className="h-3 bg-gray-100 rounded-full w-44" />
                </div>
                <div className="h-5 bg-gray-100 rounded-full w-20" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="h-16 bg-gray-100 rounded-xl" />
                <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
            <div className="h-4 bg-gray-100 rounded-full w-full" />
            <div className="flex gap-2">
                <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
                <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
            </div>
        </div>
    </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EMPTY_MESSAGES: Record<string, string> = {
    pending: "You don't have any pending booking requests right now.",
    confirmed: "No confirmed bookings yet.",
    completed: "No completed bookings yet.",
    expired: "No booking requests have expired.",
    rejected: "No rejected booking requests.",
    cancelled: "No cancelled bookings.",
};

const EmptyState = ({ activeTab, hasAnyBookings }: { activeTab: string; hasAnyBookings: boolean }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="col-span-full flex flex-col items-center justify-center py-20 text-center"
    >
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} className="w-8 h-8">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">No bookings found</p>
        <p className="text-xs text-gray-400 max-w-xs">
            {!hasAnyBookings
                ? "You haven't received any bookings yet."
                : activeTab === 'all'
                ? "No bookings match your current search or filters."
                : EMPTY_MESSAGES[activeTab] ?? "No bookings match your current search or filters."}
        </p>
    </motion.div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const VendorBookings = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'all' | DisplayStatus>('all');
    const [dialog, setDialog] = useState<{ type: DialogType; booking: VendorBooking } | null>(null);
    const [successBooking, setSuccessBooking] = useState<VendorBooking | null>(null);
    const [drawerBooking, setDrawerBooking] = useState<EnrichedBooking | null>(null);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('nearest');
    const [strippedDate, setStrippedDate] = useState<string | null>(null);
    const [filters, setFilters] = useState({ service: '', category: '', dateFrom: '', dateTo: '' });
    const { data, isPending } = useQuery({
        queryKey: ['vendor-bookings'],
        queryFn: fetchVendorBookings,
        staleTime: 30_000,
    });

    const { data: notificationCountData } = useQuery({
        queryKey: ['notification-unread-count'],
        queryFn: fetchUnreadNotificationCount,
        staleTime: 15_000,
        refetchInterval: 30_000,
    });
    const unreadNotificationCount = notificationCountData?.unread_count ?? 0;

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['vendor-bookings'] });
    };

    const approveMutation = useMutation({
        mutationFn: (id: number) => approveBooking(id),
        onSuccess: () => {
            const approved = dialog?.booking ?? null;
            setDialog(null);
            setDrawerBooking(null);
            setSuccessBooking(approved);
            invalidate();
        },
    });

    const cancelMutation = useMutation({
        mutationFn: cancelBooking,
        onSuccess: () => { setDialog(null); setDrawerBooking(null); invalidate(); },
    });

    const rejectMutation = useMutation({
        mutationFn: rejectBooking,
        onSuccess: () => { setDialog(null); setDrawerBooking(null); invalidate(); },
    });

    const completeMutation = useMutation({
        mutationFn: (id: number) => completeBooking(id),
        onSuccess: () => { setDialog(null); setDrawerBooking(null); invalidate(); },
    });

    const approveRescheduleMutation = useMutation({
        mutationFn: (id: number) => approveReschedule(id),
        onSuccess: () => { setDialog(null); setDrawerBooking(null); invalidate(); },
    });

    const rejectRescheduleMutation = useMutation({
        mutationFn: rejectReschedule,
        onSuccess: () => { setDialog(null); setDrawerBooking(null); invalidate(); },
    });

    const handleDialogConfirm = (reason?: string) => {
        if (!dialog) return;
        if (dialog.type === 'approve') approveMutation.mutate(dialog.booking.id);
        else if (dialog.type === 'complete') completeMutation.mutate(dialog.booking.id);
        else if (dialog.type === 'reject') rejectMutation.mutate({ id: dialog.booking.id, reason: reason ?? '' });
        else if (dialog.type === 'reschedule_approve') approveRescheduleMutation.mutate(dialog.booking.id);
        else if (dialog.type === 'reschedule_reject') rejectRescheduleMutation.mutate({ id: dialog.booking.id, reason: reason ?? '' });
        else cancelMutation.mutate({ id: dialog.booking.id, reason: reason ?? '' });
    };

    const isActionLoading = approveMutation.isPending
        || rejectMutation.isPending
        || cancelMutation.isPending
        || completeMutation.isPending
        || approveRescheduleMutation.isPending
        || rejectRescheduleMutation.isPending;

    const resetActionMutations = () => {
        approveMutation.reset();
        rejectMutation.reset();
        cancelMutation.reset();
        completeMutation.reset();
        approveRescheduleMutation.reset();
        rejectRescheduleMutation.reset();
    };

    const openDialog = (type: DialogType, booking: VendorBooking) => {
        resetActionMutations();
        setDialog({ type, booking });
    };

    const actionError = dialog?.type === 'approve' && approveMutation.isError
        ? apiErrorMessage(approveMutation.error)
        : dialog?.type === 'reject' && rejectMutation.isError
            ? apiErrorMessage(rejectMutation.error)
            : dialog?.type === 'cancel' && cancelMutation.isError
                ? apiErrorMessage(cancelMutation.error)
                : dialog?.type === 'complete' && completeMutation.isError
                    ? apiErrorMessage(completeMutation.error)
                    : dialog?.type === 'reschedule_approve' && approveRescheduleMutation.isError
                        ? apiErrorMessage(approveRescheduleMutation.error)
                        : dialog?.type === 'reschedule_reject' && rejectRescheduleMutation.isError
                            ? apiErrorMessage(rejectRescheduleMutation.error)
                            : undefined;

    // ── Enrich bookings with computed status / countdown data ────────────────
    const enriched: EnrichedBooking[] = useMemo(() => {
        return (data?.bookings ?? []).map(b => {
            const daysDiff = daysDiffFromToday(b.selected_date);
            return { ...b, daysDiff, displayStatus: getDisplayStatus(b.status, b.expires_at) };
        });
    }, [data]);

    const statCounts = useMemo(() => ({
        total: enriched.length,
        pending: enriched.filter(b => b.displayStatus === 'pending').length,
        confirmed: enriched.filter(b => b.displayStatus === 'confirmed').length,
        completed: enriched.filter(b => b.displayStatus === 'completed').length,
        rejected: enriched.filter(b => b.displayStatus === 'rejected').length,
        cancelled: enriched.filter(b => b.displayStatus === 'cancelled').length,
        expired: enriched.filter(b => b.displayStatus === 'expired').length,
        // Informational sub-counts of "confirmed" by how soon the event is — not statuses of their own.
        today: enriched.filter(b => b.displayStatus === 'confirmed' && b.daysDiff === 0).length,
        upcoming7: enriched.filter(b => b.displayStatus === 'confirmed' && b.daysDiff >= 1 && b.daysDiff <= 7).length,
        reschedulePending: enriched.filter(b => b.reschedule_request !== null).length,
    }), [enriched]);

    // This-month revenue snapshot
    const monthStats = useMemo(() => {
        const now = new Date();
        const monthBookings = enriched.filter(b => {
            const d = new Date(b.selected_date + 'T00:00:00');
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        return {
            bookings: monthBookings.filter(b => !['cancelled', 'rejected', 'expired'].includes(b.status)).length,
            revenue: monthBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((sum, b) => sum + b.price_value, 0),
            completed: monthBookings.filter(b => b.displayStatus === 'completed').length,
            pending: monthBookings.filter(b => b.status === 'pending').length,
        };
    }, [enriched]);

    // Alerts: confirmed events happening today or tomorrow
    const alerts = useMemo(
        () => enriched.filter(b => b.displayStatus === 'confirmed' && (b.daysDiff === 0 || b.daysDiff === 1))
            .sort((a, b) => a.daysDiff - b.daysDiff),
        [enriched]
    );

    // Distinct service/category options for the filter panel
    const serviceOptions = useMemo(() => [...new Set(enriched.map(b => b.service_name))].sort(), [enriched]);
    const categoryOptions = useMemo(() => [...new Set(enriched.map(b => b.category))].sort(), [enriched]);

    // Next 14 days mini calendar strip
    const calendarStrip = useMemo(() => {
        const days: { iso: string; dayNum: number; weekday: string; isToday: boolean; count: number; priority: Priority }[] = [];
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        for (let i = 0; i < 14; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dayBookings = enriched.filter(b => b.selected_date === iso && !['cancelled', 'rejected', 'expired'].includes(b.status));
            // `i` is itself the day offset from today, so it doubles as daysDiff here.
            const priority: Priority = dayBookings.length === 0 ? 'neutral' : getPriority('confirmed', i);
            days.push({
                iso,
                dayNum: d.getDate(),
                weekday: d.toLocaleDateString('en-MY', { weekday: 'short' }),
                isToday: i === 0,
                count: dayBookings.length,
                priority,
            });
        }
        return days;
    }, [enriched]);

    // ── Filter pipeline ────────────────────────────────────────────────────────
    const visibleBookings = useMemo(() => {
        let list = activeTab === 'all' ? enriched : enriched.filter(b => b.displayStatus === activeTab);

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(b => b.customer.name.toLowerCase().includes(q) || b.service_name.toLowerCase().includes(q));
        }

        list = list.filter(b =>
            (!filters.service || b.service_name === filters.service) &&
            (!filters.category || b.category === filters.category) &&
            (!filters.dateFrom || b.selected_date >= filters.dateFrom) &&
            (!filters.dateTo || b.selected_date <= filters.dateTo) &&
            (!strippedDate || b.selected_date === strippedDate)
        );

        const sorted = [...list].sort((a, b) => {
            switch (sortBy) {
                case 'newest': return b.booked_at.localeCompare(a.booked_at);
                case 'oldest': return a.booked_at.localeCompare(b.booked_at);
                case 'nearest': return a.selected_date.localeCompare(b.selected_date);
                case 'price': return b.price_value - a.price_value;
                case 'pending_first':
                    return (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || a.selected_date.localeCompare(b.selected_date);
                case 'completed_first':
                    return (a.displayStatus === 'completed' ? 0 : 1) - (b.displayStatus === 'completed' ? 0 : 1) || b.selected_date.localeCompare(a.selected_date);
                default: return 0;
            }
        });

        return sorted;
    }, [enriched, activeTab, search, filters, strippedDate, sortBy]);

    const hasActiveFilters = !!(filters.service || filters.category || filters.dateFrom || filters.dateTo || strippedDate);

    const clearFilters = () => {
        setFilters({ service: '', category: '', dateFrom: '', dateTo: '' });
        setStrippedDate(null);
    };

    const TABS: { key: 'all' | DisplayStatus; label: string; count: number }[] = [
        { key: 'all',       label: 'All',       count: statCounts.total },
        { key: 'pending',   label: 'Pending',   count: statCounts.pending },
        { key: 'confirmed', label: 'Confirmed', count: statCounts.confirmed },
        { key: 'completed', label: 'Completed', count: statCounts.completed },
        { key: 'expired',   label: 'Expired',   count: statCounts.expired },
        { key: 'rejected',  label: 'Rejected',  count: statCounts.rejected },
        { key: 'cancelled', label: 'Cancelled', count: statCounts.cancelled },
    ];

    return (
        <main className="flex-1 overflow-y-auto bg-[#f5f4fb] p-4 sm:p-5">
            <div className="max-w-6xl mx-auto space-y-4 pt-12 md:pt-0">

                {/* ── Page header ─────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-[24px] shadow-xl shadow-purple-900/20"
                >
                    {/* Background layer — clipped to the rounded corners so decorative elements don't spill out */}
                    <div className="absolute inset-0 rounded-[24px] overflow-hidden bg-gradient-to-br from-[#150535] via-[#2d0e6e] to-[#4c1d95]">
                        <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            <defs><pattern id="bdots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
                            <rect width="100%" height="100%" fill="url(#bdots)" />
                        </svg>
                        <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-violet-500/20 blur-[50px] pointer-events-none" />
                    </div>

                    {/* Content layer — NOT clipped, so overlays like the notification dropdown can overflow past the header */}
                    <div className="relative px-6 sm:px-8 py-6">
                        <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">Booking Requests</h1>
                                <p className="text-white/50 text-xs mt-1.5">Review and manage customer bookings for your services.</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Notification bell */}
                                <button
                                    type="button"
                                    onClick={() => navigate('/notifications')}
                                    className="relative w-11 h-11 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
                                    aria-label="Open notifications"
                                >
                                    <BellIcon />
                                    {unreadNotificationCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-[#2d0e6e]">
                                            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                        </span>
                                    )}
                                </button>

                                {statCounts.pending > 0 && (
                                    <motion.button
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        onClick={() => setActiveTab('pending')}
                                        className="flex items-center gap-3 bg-amber-400/15 border border-amber-400/30 hover:bg-amber-400/25 rounded-2xl px-4 py-3 transition-colors text-left"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        <div>
                                            <p className="text-amber-300 text-sm font-black leading-none">{statCounts.pending} pending</p>
                                            <p className="text-amber-400/70 text-[10px] mt-0.5">Awaiting your review</p>
                                        </div>
                                    </motion.button>
                                )}
                                {statCounts.reschedulePending > 0 && (
                                    <motion.button
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        onClick={() => setActiveTab('confirmed')}
                                        className="flex items-center gap-3 rounded-2xl border border-indigo-300/30 bg-indigo-300/15 px-4 py-3 text-left transition-colors hover:bg-indigo-300/25"
                                    >
                                        <div className="h-2 w-2 rounded-full bg-indigo-300 animate-pulse" />
                                        <div>
                                            <p className="text-sm font-black leading-none text-indigo-200">{statCounts.reschedulePending} date change</p>
                                            <p className="mt-0.5 text-[10px] text-indigo-200/70">Awaiting your decision</p>
                                        </div>
                                    </motion.button>
                                )}
                            </div>
                        </div>

                        {/* Expanded quick stats strip */}
                        <div className="relative z-10 mt-5 grid grid-cols-3 sm:grid-cols-7 gap-2">
                            {[
                                { label: 'Total',     value: statCounts.total,     color: 'text-white' },
                                { label: 'Pending',   value: statCounts.pending,   color: 'text-amber-300' },
                                { label: 'Confirmed', value: statCounts.confirmed, color: 'text-blue-300' },
                                { label: 'Completed', value: statCounts.completed, color: 'text-emerald-300' },
                                { label: 'Expired',   value: statCounts.expired,   color: 'text-slate-300' },
                                { label: 'Rejected',  value: statCounts.rejected,  color: 'text-orange-300' },
                                { label: 'Cancelled',  value: statCounts.cancelled, color: 'text-rose-300' },
                            ].map((s, i) => (
                                <div key={i} className="bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-center">
                                    <p className={`text-xl font-black leading-none ${s.color}`}>{s.value}</p>
                                    <p className="text-[10px] text-white/40 mt-1 font-medium">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ── Alert banner ──────────────────────────────────── */}
                {alerts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2"
                    >
                        {alerts.slice(0, 3).map(b => (
                            <div key={b.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                                b.daysDiff === 0 ? 'bg-red-50' : 'bg-orange-50'
                            }`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg shrink-0">{b.daysDiff === 0 ? '⚠️' : '🔔'}</span>
                                    <div className="min-w-0">
                                        <p className={`text-xs font-bold ${b.daysDiff === 0 ? 'text-red-700' : 'text-orange-700'}`}>
                                            {b.daysDiff === 0 ? 'Event starts today' : 'Upcoming event tomorrow'} · {b.service_name}
                                        </p>
                                        <p className="text-[11px] text-gray-500 truncate">Customer: {b.customer.name} · Don't forget to prepare / contact your customer.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDrawerBooking(b)}
                                    className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                        b.daysDiff === 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600'
                                    }`}
                                >
                                    View
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* ── Snapshot + Revenue row ─────────────────────────── */}
                <div className="grid lg:grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Today's Snapshot</p>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: "Today's Bookings", value: statCounts.today },
                                { label: 'Upcoming (7d)', value: statCounts.upcoming7 },
                                { label: 'Pending', value: statCounts.pending },
                                { label: 'Completed', value: statCounts.completed },
                            ].map((s, i) => (
                                <div key={i} className="text-center bg-gray-50 rounded-xl py-3">
                                    <p className="text-xl font-black text-gray-800 leading-none">{s.value}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-tight">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">This Month</p>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Bookings', value: String(monthStats.bookings) },
                                { label: 'Revenue', value: `RM${monthStats.revenue.toLocaleString()}` },
                                { label: 'Completed', value: String(monthStats.completed) },
                                { label: 'Pending', value: String(monthStats.pending) },
                            ].map((s, i) => (
                                <div key={i} className="text-center bg-purple-50 rounded-xl py-3">
                                    <p className="text-lg font-black text-purple-700 leading-none">{s.value}</p>
                                    <p className="text-[10px] text-purple-400 mt-1 font-semibold leading-tight">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Mini calendar strip ────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><CalendarMiniIcon /> Next 14 Days</p>
                        {strippedDate && (
                            <button onClick={() => setStrippedDate(null)} className="text-[11px] font-semibold text-purple-600 hover:text-purple-800">
                                Clear day filter
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {calendarStrip.map(day => {
                            const isSelected = strippedDate === day.iso;
                            const style = PRIORITY_STYLES[day.priority];
                            return (
                                <button
                                    key={day.iso}
                                    onClick={() => setStrippedDate(isSelected ? null : day.iso)}
                                    className={`shrink-0 w-14 rounded-xl px-1 py-2 text-center border transition-all ${
                                        isSelected
                                            ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                                            : day.isToday
                                            ? 'border-purple-300 bg-purple-50 text-gray-700'
                                            : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-purple-200'
                                    }`}
                                >
                                    <p className={`text-[10px] font-semibold ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>{day.weekday}</p>
                                    <p className="text-sm font-black">{day.dayNum}</p>
                                    <div className="flex items-center justify-center mt-1 h-2">
                                        {day.count > 0 && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : style.dot}`} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Toolbar: search / sort / filter ────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search customer or service..."
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-colors"
                        />
                    </div>

                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortKey)}
                        className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
                    >
                        <option value="nearest">Nearest Event</option>
                        <option value="newest">Newest Booked</option>
                        <option value="oldest">Oldest Booked</option>
                        <option value="price">Highest Price</option>
                        <option value="pending_first">Pending First</option>
                        <option value="completed_first">Completed First</option>
                    </select>

                    <button
                        onClick={() => setShowFilterPanel(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            hasActiveFilters ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <FilterIcon /> Filter {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                    </button>

                    <AnimatePresence>
                        {showFilterPanel && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="w-full overflow-hidden"
                            >
                                <div className="pt-3 mt-1 border-t border-gray-100 grid sm:grid-cols-4 gap-2">
                                    <select
                                        value={filters.service}
                                        onChange={e => setFilters(f => ({ ...f, service: e.target.value }))}
                                        className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm"
                                    >
                                        <option value="">All Services</option>
                                        {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select
                                        value={filters.category}
                                        onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                                        className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm capitalize"
                                    >
                                        <option value="">All Categories</option>
                                        {categoryOptions.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                                    </select>
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                                        className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm"
                                    />
                                    <input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                                        className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm"
                                    />
                                </div>
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-800">
                                        Clear all filters
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Tabs ────────────────────────────────────────── */}
                <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                activeTab === tab.key
                                    ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md shadow-purple-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                                activeTab === tab.key
                                    ? 'bg-white/20 text-white'
                                    : tab.key === 'pending' && tab.count > 0
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-500'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Booking grid ─────────────────────────────────── */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {isPending ? (
                        Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    ) : !visibleBookings.length ? (
                        <EmptyState activeTab={activeTab} hasAnyBookings={enriched.length > 0} />
                    ) : (
                        visibleBookings.map((booking, i) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                index={i}
                                onApprove={b => openDialog('approve', b)}
                                onReject={b => openDialog('reject', b)}
                                onCancel={b => openDialog('cancel', b)}
                                onComplete={b => openDialog('complete', b)}
                                onRescheduleApprove={b => openDialog('reschedule_approve', b)}
                                onRescheduleReject={b => openDialog('reschedule_reject', b)}
                                onOpen={b => setDrawerBooking(b)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* ── Confirm dialog ────────────────────────────────── */}
            <AnimatePresence>
                {dialog && (
                    <ConfirmDialog
                        type={dialog.type}
                        booking={dialog.booking}
                        onConfirm={handleDialogConfirm}
                        onClose={() => !isActionLoading && setDialog(null)}
                        loading={isActionLoading}
                        error={actionError}
                    />
                )}
            </AnimatePresence>

            {/* ── Booking detail drawer ─────────────────────────── */}
            <AnimatePresence>
                {drawerBooking && !dialog && (
                    <BookingDrawer
                        booking={drawerBooking}
                        onClose={() => setDrawerBooking(null)}
                        onApprove={b => openDialog('approve', b)}
                        onReject={b => openDialog('reject', b)}
                        onCancel={b => openDialog('cancel', b)}
                        onComplete={b => openDialog('complete', b)}
                        onRescheduleApprove={b => openDialog('reschedule_approve', b)}
                        onRescheduleReject={b => openDialog('reschedule_reject', b)}
                    />
                )}
            </AnimatePresence>

            {/* ── Approve success overlay ───────────────────────── */}
            <AnimatePresence>
                {successBooking && (
                    <SuccessOverlay
                        booking={successBooking}
                        onDone={() => setSuccessBooking(null)}
                    />
                )}
            </AnimatePresence>
        </main>
    );
};

export default VendorBookings;
