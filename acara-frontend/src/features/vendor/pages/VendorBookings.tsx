import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/Api';

// ── Types ─────────────────────────────────────────────────────────────────────
type Customer = { id: number; name: string; email: string; phone: string | null };
type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

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
    notes: string | null;
    customer: Customer;
};

type BookingsResponse = {
    bookings: VendorBooking[];
    counts: { pending: number; confirmed: number; cancelled: number };
};

// ── API ───────────────────────────────────────────────────────────────────────
const fetchVendorBookings = async (status: string): Promise<BookingsResponse> => {
    const params = status !== 'all' ? `?status=${status}` : '';
    const res = await api.get(`/vendor/bookings${params}`);
    return res.data;
};

const approveBooking  = (id: number) => api.patch(`/vendor/bookings/${id}/approve`);
const cancelBooking   = (id: number) => api.patch(`/vendor/bookings/${id}/cancel`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBookedAt(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; pill: string; dot: string }> = {
    pending:   { label: 'Pending',   pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',    dot: 'bg-amber-400' },
    confirmed: { label: 'Confirmed', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-400' },
    cancelled: { label: 'Cancelled', pill: 'bg-red-50 text-red-600 ring-1 ring-red-200',            dot: 'bg-red-400' },
};

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
            {/* Green gradient header */}
            <div className="relative bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500 pt-10 pb-8 px-6">
                {/* Dot texture */}
                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs><pattern id="sdots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="white" /></pattern></defs>
                    <rect width="100%" height="100%" fill="url(#sdots)" />
                </svg>

                {/* Animated circle + checkmark */}
                <div className="relative flex items-center justify-center mx-auto w-20 h-20">
                    {/* Ripple rings */}
                    {[1, 2, 3].map(i => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.6, opacity: 0.6 }}
                            animate={{ scale: 1.8 + i * 0.3, opacity: 0 }}
                            transition={{ duration: 1.2, delay: i * 0.18, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.5 }}
                            className="absolute inset-0 rounded-full border-2 border-white/50"
                        />
                    ))}

                    {/* Circle bg */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.05 }}
                        className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-lg"
                    >
                        {/* SVG animated checkmark */}
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

            {/* Booking detail */}
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

// ── Sub-components ────────────────────────────────────────────────────────────
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

// ── Confirm dialog ─────────────────────────────────────────────────────────────
const ConfirmDialog = ({
    type, booking, onConfirm, onClose, loading,
}: {
    type: 'approve' | 'cancel';
    booking: VendorBooking;
    onConfirm: () => void;
    onClose: () => void;
    loading: boolean;
}) => (
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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                type === 'approve' ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
                {type === 'approve'
                    ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2} className="w-6 h-6"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                }
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1">
                {type === 'approve' ? 'Approve booking?' : 'Cancel booking?'}
            </h3>
            <p className="text-sm text-gray-500 mb-1">
                <span className="font-semibold text-gray-700">{booking.customer.name}</span> · {booking.service_name}
            </p>
            <p className="text-sm text-gray-400 mb-6">{formatDate(booking.selected_date)}</p>

            {type === 'cancel' && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
                    The customer will be notified that their booking was cancelled.
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
                    onClick={onConfirm}
                    disabled={loading}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 ${
                        type === 'approve'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-100'
                            : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md shadow-red-100'
                    }`}
                >
                    {loading
                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{type === 'approve' ? 'Approving...' : 'Cancelling...'}</span>
                        : type === 'approve' ? 'Yes, Approve' : 'Yes, Cancel'
                    }
                </button>
            </div>
        </motion.div>
    </motion.div>
);

// ── Booking card ──────────────────────────────────────────────────────────────
const BookingCard = ({
    booking, index,
    onApprove, onCancel,
}: {
    booking: VendorBooking;
    index: number;
    onApprove: (b: VendorBooking) => void;
    onCancel: (b: VendorBooking) => void;
}) => {
    const cfg = STATUS_CONFIG[booking.status];
    const initials = getInitials(booking.customer.name);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden hover:shadow-[0_4px_20px_rgba(109,40,217,0.08)] transition-shadow duration-200"
        >
            {/* Card top accent bar */}
            <div className={`h-1 w-full ${
                booking.status === 'pending'   ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                booking.status === 'confirmed' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
                'bg-gradient-to-r from-red-300 to-rose-300'
            }`} />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        {/* Customer avatar */}
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
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Service</p>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{booking.service_name}</p>
                        <p className="text-[10px] text-purple-500 font-medium mt-0.5 capitalize">{booking.category}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Event Date</p>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{formatDate(booking.selected_date)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{booking.price} / {booking.pricing_unit}</p>
                    </div>
                </div>

                {/* Phone + booked at */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-4">
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
                </div>

                {/* Notes */}
                {booking.notes && (
                    <div className="mb-4 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Customer Note</p>
                        <p className="text-xs text-blue-700">{booking.notes}</p>
                    </div>
                )}

                {/* Actions */}
                {booking.status === 'pending' && (
                    <div className="flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            onClick={() => onCancel(booking)}
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

                {booking.status === 'confirmed' && (
                    <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={() => onCancel(booking)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <XIcon /> Cancel Booking
                    </motion.button>
                )}

                {booking.status === 'cancelled' && (
                    <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 text-xs text-gray-400 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Booking cancelled
                    </div>
                )}
            </div>
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
const EmptyState = ({ activeTab }: { activeTab: string }) => (
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
        <p className="text-xs text-gray-400">
            {activeTab === 'pending'
                ? "You don't have any pending booking requests right now."
                : activeTab === 'confirmed'
                ? "No confirmed bookings yet."
                : activeTab === 'cancelled'
                ? "No cancelled bookings."
                : "You haven't received any bookings yet."}
        </p>
    </motion.div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const VendorBookings = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'all' | BookingStatus>('all');
    const [dialog, setDialog] = useState<{ type: 'approve' | 'cancel'; booking: VendorBooking } | null>(null);
    const [successBooking, setSuccessBooking] = useState<VendorBooking | null>(null);

    const { data, isPending } = useQuery({
        queryKey: ['vendor-bookings', activeTab],
        queryFn: () => fetchVendorBookings(activeTab),
        staleTime: 30_000,
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['vendor-bookings'] });
    };

    const approveMutation = useMutation({
        mutationFn: (id: number) => approveBooking(id),
        onSuccess: () => {
            const approved = dialog?.booking ?? null;
            setDialog(null);
            setSuccessBooking(approved);
            invalidate();
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: number) => cancelBooking(id),
        onSuccess: () => { setDialog(null); invalidate(); },
    });

    const handleDialogConfirm = () => {
        if (!dialog) return;
        if (dialog.type === 'approve') approveMutation.mutate(dialog.booking.id);
        else cancelMutation.mutate(dialog.booking.id);
    };

    const isActionLoading = approveMutation.isPending || cancelMutation.isPending;

    const counts = data?.counts ?? { pending: 0, confirmed: 0, cancelled: 0 };
    const totalCount = counts.pending + counts.confirmed + counts.cancelled;

    const TABS: { key: 'all' | BookingStatus; label: string; count: number }[] = [
        { key: 'all',       label: 'All',       count: totalCount },
        { key: 'pending',   label: 'Pending',   count: counts.pending },
        { key: 'confirmed', label: 'Confirmed', count: counts.confirmed },
        { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
    ];

    return (
        <main className="flex-1 overflow-y-auto bg-[#f5f4fb] p-4 sm:p-5">
            <div className="max-w-5xl mx-auto space-y-4 pt-12 md:pt-0">

                {/* ── Page header ─────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[24px] overflow-hidden shadow-xl shadow-purple-900/20"
                >
                    <div className="relative bg-gradient-to-br from-[#150535] via-[#2d0e6e] to-[#4c1d95] px-6 sm:px-8 py-6">
                        {/* Dot grid texture */}
                        <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            <defs><pattern id="bdots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
                            <rect width="100%" height="100%" fill="url(#bdots)" />
                        </svg>
                        <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-violet-500/20 blur-[50px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                {/* <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Vendor Dashboard</p> */}
                                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">Booking Requests</h1>
                                <p className="text-white/50 text-xs mt-1.5">Review and manage customer bookings for your services.</p>
                            </div>

                            {/* Pending alert badge */}
                            {counts.pending > 0 && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-3 bg-amber-400/15 border border-amber-400/30 rounded-2xl px-4 py-3 shrink-0"
                                >
                                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <div>
                                        <p className="text-amber-300 text-sm font-black leading-none">{counts.pending} pending</p>
                                        <p className="text-amber-400/70 text-[10px] mt-0.5">Awaiting your review</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Quick stats strip */}
                        <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
                            {[
                                { label: 'Total',     value: totalCount,         color: 'text-white' },
                                { label: 'Confirmed', value: counts.confirmed,   color: 'text-emerald-300' },
                                { label: 'Pending',   value: counts.pending,     color: 'text-amber-300' },
                            ].map((s, i) => (
                                <div key={i} className="bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-center">
                                    <p className={`text-xl font-black leading-none ${s.color}`}>{s.value}</p>
                                    <p className="text-[10px] text-white/40 mt-1 font-medium">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

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
                    ) : !data?.bookings.length ? (
                        <EmptyState activeTab={activeTab} />
                    ) : (
                        data.bookings.map((booking, i) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                index={i}
                                onApprove={b => setDialog({ type: 'approve', booking: b })}
                                onCancel={b => setDialog({ type: 'cancel', booking: b })}
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
