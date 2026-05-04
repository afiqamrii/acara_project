import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/Api';
import Loader from '../../../components/common/Loader';

type VendorService = {
    id: number;
    service_name: string;
    service_category: string;
    status: string;
    service_details?: string | null;
    pricing_starting_from?: number | null;
    pricing_unit?: string | null;
    pricing_description?: string | null;
    portfolio_path?: string | null;
    portfolio_url?: string | null;
};

type BookedDate = { date: string; customers: string[] };

type AvailabilityData = {
    service_id: number;
    service_name: string;
    dates: string[];
    booked_dates: BookedDate[];
};

const fetchVendorServices = async (): Promise<{ services: VendorService[] }> => {
    const res = await api.get('/vendor/services');
    return res.data;
};

const fetchServiceAvailability = async (serviceId: number): Promise<AvailabilityData> => {
    const res = await api.get<AvailabilityData>(`/vendor/availability/${serviceId}`);
    return res.data;
};

const syncAvailability = async ({ serviceId, dates }: { serviceId: number; dates: string[] }) => {
    const res = await api.put(`/vendor/availability/${serviceId}`, { dates });
    return res.data;
};

const reopenDate = async ({ serviceId, date }: { serviceId: number; date: string }) => {
    const res = await api.post(`/vendor/availability/${serviceId}/reopen`, { date });
    return res.data;
};

// ── Calendar helpers ──────────────────────────────────────────────────────────
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendar(year: number, month: number): (number | null)[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

function toIso(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconChevLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);
const IconChevRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M9 18l6-6-6-6" />
    </svg>
);
const IconCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

// ── Service detail card ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    active:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    pending:  'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
    rejected: 'bg-red-50    text-red-700    ring-1 ring-red-200',
};

const ServiceDetailCard: React.FC<{ service: VendorService; selectedDatesCount: number }> = ({
    service,
    selectedDatesCount,
}) => {
    const [imgError, setImgError] = useState(false);
    const statusStyle = STATUS_STYLES[service.status] ?? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
    const showImage = !!service.portfolio_url && !imgError;

    return (
        <motion.div
            key={`detail-${service.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden h-full"
        >
            {/* service image header */}
            <div className="relative h-36 overflow-hidden">
                {showImage ? (
                    <img
                        src={service.portfolio_url!}
                        alt={service.service_name}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-600 to-violet-500" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {/* Text over image */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                            Selected Service
                        </p>
                        <h2 className="text-base font-bold text-white leading-snug truncate drop-shadow">
                            {service.service_name}
                        </h2>
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold capitalize ${statusStyle}`}>
                        {service.status}
                    </span>
                </div>
            </div>

            {/* service detail Body */}
            <div className="px-6 py-4 space-y-3">
                {/* Category */}
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-purple-100">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        {service.service_category}
                    </span>
                </div>

                {/* Pricing */}
                {service.pricing_starting_from != null && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-purple-400 shrink-0">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                        <span className="font-bold text-purple-700">
                            RM {Number(service.pricing_starting_from).toLocaleString()}
                        </span>
                        {service.pricing_unit && (
                            <span className="text-gray-400">/ {service.pricing_unit}</span>
                        )}
                        {service.pricing_description && (
                            <span className="text-gray-400 text-xs">— {service.pricing_description}</span>
                        )}
                    </div>
                )}

                {/* Description */}
                {service.service_details && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                        {service.service_details}
                    </p>
                )}

                {/* Stats row */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-purple-400">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>
                            <span className="font-bold text-purple-700">{selectedDatesCount}</span>
                            {' '}available date{selectedDatesCount !== 1 ? 's' : ''} set
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ── Calendar panel (per-service) ──────────────────────────────────────────────
const CalendarPanel: React.FC<{ service: VendorService }> = ({ service }) => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [unlockTarget, setUnlockTarget] = useState<string | null>(null);
    const initializedRef = useRef(false);
    const queryClient = useQueryClient();

    const { data, isPending } = useQuery({
        queryKey: ['vendor-availability', service.id],
        queryFn: () => fetchServiceAvailability(service.id),
        staleTime: 1000 * 60 * 5,
    });

    const bookedDates = new Set((data?.booked_dates ?? []).map(b => b.date));
    const bookedCustomers = new Map((data?.booked_dates ?? []).map(b => [b.date, b.customers]));

    // Reset and re-initialise when switching services
    useEffect(() => {
        initializedRef.current = false;
        setSelectedDates(new Set());
        setSaveSuccess(false);
        setUnlockTarget(null);
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
    }, [service.id]);

    useEffect(() => {
        if (data && !initializedRef.current) {
            setSelectedDates(new Set(data.dates));
            initializedRef.current = true;
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: syncAvailability,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-availability', service.id] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
    });

    const reopenMutation = useMutation({
        mutationFn: reopenDate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-availability', service.id] });
            setUnlockTarget(null);
        },
    });

    const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
    const isPastMonth =
        viewYear < today.getFullYear() ||
        (viewYear === today.getFullYear() && viewMonth < today.getMonth());

    const prevMonth = () => {
        if (isPastMonth) return;
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const toggleDate = (iso: string) => {
        setSelectedDates(prev => {
            const next = new Set(prev);
            if (next.has(iso)) next.delete(iso);
            else next.add(iso);
            return next;
        });
    };

    const cells = buildCalendar(viewYear, viewMonth);

    return (
        <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {/* Side-by-side: detail card + calendar */}
            <div className="flex flex-col md:flex-row gap-4 items-start">

                {/* Left — service detail card */}
                <div className="w-full md:w-80 shrink-0">
                    <ServiceDetailCard service={service} selectedDatesCount={selectedDates.size} />
                </div>

                {/* Right — calendar */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-5">
                            <button
                                onClick={prevMonth}
                                disabled={isPastMonth}
                                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <IconChevLeft />
                            </button>
                            <span className="font-bold text-gray-900">{MONTHS[viewMonth]} {viewYear}</span>
                            <button
                                onClick={nextMonth}
                                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
                            >
                                <IconChevRight />
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {DAY_LABELS.map(d => (
                                <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        {isPending ? (
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {cells.map((day, i) => {
                                    if (!day) return <div key={`e-${i}`} />;
                                    const iso = toIso(viewYear, viewMonth, day);
                                    const isPast = iso < todayIso;
                                    const isSelected = selectedDates.has(iso);
                                    const isBooked = bookedDates.has(iso);
                                    const isBookedAndOpen = isBooked && isSelected;
                                    const isToday = iso === todayIso;

                                    let cellClass = 'aspect-square rounded-xl text-sm font-medium transition-all duration-150 relative ';

                                    if (isPast) {
                                        cellClass += 'text-gray-300 cursor-not-allowed';
                                    } else if (isBooked && !isSelected) {
                                        // Booked by customer, not yet re-opened
                                        cellClass += 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer';
                                    } else if (isBookedAndOpen) {
                                        // Booked but vendor re-opened for more customers
                                        cellClass += 'bg-purple-600 text-white shadow-md shadow-purple-200 hover:bg-purple-700 scale-105 ring-2 ring-amber-400 ring-offset-1';
                                    } else if (isSelected) {
                                        cellClass += 'bg-purple-600 text-white shadow-md shadow-purple-200 hover:bg-purple-700 scale-105';
                                    } else {
                                        cellClass += 'text-gray-700 hover:bg-purple-50 hover:text-purple-700';
                                    }

                                    if (isToday && !isSelected && !isBooked) {
                                        cellClass += ' ring-2 ring-purple-300 ring-offset-1';
                                    }

                                    const handleClick = () => {
                                        if (isPast) return;
                                        if (isBooked && !isSelected) {
                                            setUnlockTarget(iso);
                                        } else {
                                            toggleDate(iso);
                                        }
                                    };

                                    return (
                                        <button
                                            key={iso}
                                            onClick={handleClick}
                                            disabled={isPast}
                                            className={cellClass}
                                            title={isBooked && !isSelected ? 'Customer booked — click to re-open' : undefined}
                                        >
                                            {day}
                                            {isBooked && (
                                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Unlock confirmation banner */}
                        <AnimatePresence>
                            {unlockTarget && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-auto">
                                        <p className="text-xs font-bold text-amber-800">Re-open this date?</p>
                                        <p className="text-[11px] text-amber-600 mt-0.5 truncate">
                                            {new Date(unlockTarget + 'T00:00:00').toLocaleDateString('en-MY', {
                                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                                            })} — booked by{' '}
                                            <span className="font-semibold text-amber-800">
                                                {(bookedCustomers.get(unlockTarget) ?? []).join(', ') || 'a customer'}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setUnlockTarget(null)}
                                            className="text-xs font-semibold text-amber-600 hover:text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 hover:border-amber-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => reopenMutation.mutate({ serviceId: service.id, date: unlockTarget })}
                                            disabled={reopenMutation.isPending}
                                            className="text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-xl transition-colors"
                                        >
                                            {reopenMutation.isPending ? 'Opening…' : 'Yes, Re-open'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Legend */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-400">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" /> Available
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-amber-200 ring-1 ring-amber-400 inline-block" /> Booked
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-purple-600 ring-2 ring-amber-400 ring-offset-1 inline-block" /> Booked + Open
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> Unavailable
                            </span>
                        </div>
                    </div>

                    {/* Save bar */}
                    <div className="mt-4 flex items-center justify-between bg-white rounded-[20px] shadow-sm border border-gray-100 px-6 py-4">
                        <p className="text-sm text-gray-500">
                            <span className="font-bold text-purple-700">{selectedDates.size}</span>
                            {' '}date{selectedDates.size !== 1 ? 's' : ''} selected
                        </p>
                        <div className="flex items-center gap-3">
                            <AnimatePresence>
                                {saveSuccess && (
                                    <motion.span
                                        initial={{ opacity: 0, x: 6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"
                                    >
                                        <IconCheck /> Saved!
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => mutation.mutate({ serviceId: service.id, dates: [...selectedDates] })}
                                disabled={mutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-purple-100"
                            >
                                {mutation.isPending ? 'Saving...' : 'Save Availability'}
                            </motion.button>
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const VendorAvailability: React.FC = () => {
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

    const { data, isPending, isError, error } = useQuery({
        queryKey: ['vendor-services'],
        queryFn: fetchVendorServices,
        staleTime: 1000 * 60 * 10,
    });

    // Auto-select first service once loaded
    useEffect(() => {
        if (data?.services?.length && selectedServiceId === null) {
            setSelectedServiceId(data.services[0].id);
        }
    }, [data, selectedServiceId]);

    const isNoService = isError && (error as any)?.response?.status === 404;
    const selectedService = data?.services.find(s => s.id === selectedServiceId) ?? null;

    if (isPending) {
        return <Loader title="ACARA" message="Loading your services..." />;
    }

    if (isError) {
        return (
            <main className="flex-1 flex items-center justify-center bg-[#f8f7ff]">
                <div className="text-center p-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-purple-400">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    {isNoService ? (
                        <>
                            <p className="text-lg font-bold text-gray-700 mb-2">No services registered</p>
                            <p className="text-sm text-gray-400">Register a service first before managing your availability.</p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-bold text-gray-700 mb-2">Something went wrong</p>
                            <p className="text-sm text-gray-400">Could not load your services. Please try refreshing the page.</p>
                        </>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto bg-[#f8f7ff] p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">

                <div className="mb-6 pt-12 md:pt-0">
                    <h1 className="text-5xl font-bold text-gray-900 mb-2">Manage Availability</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Click dates to toggle availability. Customers only see the dates you mark.
                    </p>
                </div>

                {/* Service selector */}
                <div className="mb-5">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Select Service
                    </label>
                    <div className="relative">
                        <select
                            value={selectedServiceId ?? ''}
                            onChange={e => setSelectedServiceId(Number(e.target.value))}
                            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-sm font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-colors cursor-pointer"
                        >
                            {data?.services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.service_name} — {service.service_category}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </div>
                    </div>
                    {data?.services && data.services.length > 1 && (
                        <p className="mt-1.5 text-xs text-gray-400">
                            {data.services.length} services — each has its own availability calendar
                        </p>
                    )}
                </div>

                {/* Calendar for selected service */}
                {selectedService && (
                    <CalendarPanel key={selectedService.id} service={selectedService} />
                )}

            </div>
        </main>
    );
};

export default VendorAvailability;
