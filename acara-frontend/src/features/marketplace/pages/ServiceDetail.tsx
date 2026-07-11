import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../../components/common/Loader';
import api from '../../../lib/Api';

import hero1 from '../../../img/wedimg1.jpg';
import hero2 from '../../../img/wedimg2.jpg';
import hero3 from '../../../img/wedimg3.jpg';
import hero6 from '../../../img/wedimg6.jpg';
import hero7 from '../../../img/wedimg7.jpg';
import audience from '../../../img/audience.jpg';
import marketplaceBg from '../../../img/bg_marketplace.jpg';
import marketplaceBgAlt from '../../../img/bg3_marketplace.jpg';
import onlineVendor from '../../../img/onlinevendor1.jpg';

const fallbackImages = [hero1, hero2, hero3, hero6, hero7, audience, marketplaceBg, marketplaceBgAlt, onlineVendor];

type ServiceDetailData = {
    id: number;
    title: string;
    category: string;
    description?: string | null;
    price: string;
    price_value: number;
    pricing_unit: string;
    pricing_description?: string | null;
    location: string;
    location_town?: string | null;
    location_state?: string | null;
    vendor: string;
    vendor_experience?: number | null;
    vendor_website?: string | null;
    portfolio_url?: string | null;
};

const fetchServiceDetail = async (id: string, signal?: AbortSignal) => {
    const res = await api.get<ServiceDetailData>(`/marketplace/services/${id}`, { signal });
    return res.data;
};

const fetchAvailability = async (serviceId: number): Promise<{ dates: string[] }> => {
    const res = await api.get<{ dates: string[] }>(`/marketplace/services/${serviceId}/availability`);
    return res.data;
};

const getImageUrl = (service: ServiceDetailData) => {
    const url = service.portfolio_url ?? '';
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
        ? url
        : fallbackImages[service.id % fallbackImages.length];
};

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

function formatDateLong(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-MY', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

const IconLocation = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconStar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const IconLink = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
);

const IconBack = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
);

const IconTag = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
);

const IconX = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

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

const IconCalendar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);


type BookingModalProps = {
    service: ServiceDetailData;
    onClose: () => void;
};

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose }) => {
    const today = new Date();
    const queryClient = useQueryClient();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [cartError, setCartError] = useState<string | null>(null);

    const addToCartMutation = useMutation({
        mutationFn: (data: { service_id: number; date: string }) =>
            api.post('/bookings/cart', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            setCartError(null);
            setSubmitted(true);
        },
        onError: (err: any) => {
            setCartError(err?.response?.data?.message ?? 'Failed to add to cart. Please try again.');
        },
    });

    const { data, isPending } = useQuery({
        queryKey: ['service-availability', service.id],
        queryFn: () => fetchAvailability(service.id),
        staleTime: 1000 * 60 * 5,
    });

    const availableSet = useMemo(() => new Set(data?.dates ?? []), [data]);
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

    const cells = buildCalendar(viewYear, viewMonth);
    const hasAvailability = availableSet.size > 0;

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-gray-900 text-base">Choose a Date</h3>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{service.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors flex-shrink-0 ml-3"
                    >
                        <IconX />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {submitted ? (
                        /* ── Success state ── */
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-6 py-10 text-center"
                        >
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-7 h-7 text-emerald-500">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            </div>
                            <p className="font-bold text-gray-900 mb-1">Added to Cart!</p>
                            <p className="text-sm text-gray-400 mb-1">
                                {selectedDate && formatDateLong(selectedDate)}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 mb-6">
                                Open the Cart in the sidebar to review your selections and confirm your booking.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-2xl font-bold text-sm transition-colors"
                            >
                                Done
                            </button>
                        </motion.div>
                    ) : (
                        /* ── Calendar state ── */
                        <motion.div key="calendar">
                            <div className="px-6 pt-5 pb-4">
                                {/* Month navigation */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={prevMonth}
                                        disabled={isPastMonth}
                                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <IconChevLeft />
                                    </button>
                                    <span className="font-bold text-gray-900 text-sm">
                                        {MONTHS[viewMonth]} {viewYear}
                                    </span>
                                    <button
                                        onClick={nextMonth}
                                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
                                    >
                                        <IconChevRight />
                                    </button>
                                </div>

                                {/* Day headers */}
                                <div className="grid grid-cols-7 mb-1">
                                    {DAY_LABELS.map(d => (
                                        <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar cells */}
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
                                            const isAvailable = availableSet.has(iso);
                                            const isSelected = selectedDate === iso;
                                            const isToday = iso === todayIso;
                                            const clickable = !isPast && isAvailable;

                                            return (
                                                <button
                                                    key={iso}
                                                    onClick={() => clickable && setSelectedDate(iso)}
                                                    disabled={!clickable}
                                                    className={[
                                                        'aspect-square rounded-xl text-xs font-medium transition-all duration-150',
                                                        isPast
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-105'
                                                                : isAvailable
                                                                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:scale-105 cursor-pointer'
                                                                    : 'text-gray-300 cursor-not-allowed',
                                                        isToday && !isSelected ? 'ring-2 ring-purple-300 ring-offset-1' : '',
                                                    ].join(' ')}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* No availability notice */}
                                {!isPending && !hasAvailability && (
                                    <div className="mt-4 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl py-4 px-3">
                                        <IconCalendar />
                                        <p className="mt-1 font-medium">No available dates set by vendor</p>
                                        <p className="text-gray-400 mt-0.5">Check back later or contact the vendor directly.</p>
                                    </div>
                                )}

                                {/* Legend */}
                                {!isPending && hasAvailability && (
                                    <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-purple-100 border border-purple-300 inline-block" />
                                            Available
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                                            Selected
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Footer — confirm strip */}
                            <AnimatePresence>
                                {selectedDate && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border-t border-gray-100 px-6 py-4"
                                    >
                                        {cartError && (
                                            <div className={`mb-3 p-3 rounded-2xl text-xs border ${cartError.includes('already in your cart') ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                                {cartError.includes('already in your cart')
                                                    ? 'This item is already in your cart. Open the Cart in the sidebar to review it.'
                                                    : cartError}
                                            </div>
                                        )}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <p className="text-xs text-gray-400">Selected date</p>
                                                <p className="text-sm font-bold text-gray-900 mt-0.5">
                                                    {formatDateLong(selectedDate)}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs text-gray-400">Starting from</p>
                                                <p className="text-sm font-bold text-purple-700 mt-0.5">{service.price}</p>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => addToCartMutation.mutate({ service_id: service.id, date: selectedDate })}
                                            disabled={addToCartMutation.isPending || cartError?.includes('already in your cart')}
                                            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-purple-200"
                                        >
                                            {addToCartMutation.isPending ? 'Adding...' : cartError?.includes('already in your cart') ? 'Already in Cart' : 'Add to Cart'}
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

const DESCRIPTION_PREVIEW_LENGTH = 260;
const PRICING_PREVIEW_LENGTH = 140;

const ExpandableText: React.FC<{ text: string; previewLength: number; className?: string }> = ({ text, previewLength, className }) => {
    const [expanded, setExpanded] = useState(false);
    const isLong = text.length > previewLength;
    const shown = expanded || !isLong ? text : `${text.slice(0, previewLength).trimEnd()}...`;

    return (
        <>
            <p className={className}>{shown}</p>
            {isLong && (
                <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="mt-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors"
                >
                    {expanded ? 'Show less' : 'Read more'}
                </button>
            )}
        </>
    );
};

const ServiceDetail: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const navigate = useNavigate();
    const [imgLoaded, setImgLoaded] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const canBook = ["user", "vendor"].includes(localStorage.getItem("role") ?? "");

    const { data: service, isPending, isError } = useQuery({
        queryKey: ['marketplace-service', serviceId],
        queryFn: ({ signal }) => fetchServiceDetail(serviceId!, signal),
        enabled: !!serviceId,
        staleTime: 1000 * 60 * 10,
    });

    if (isPending) {
        return <Loader title="ACARA Marketplace" message="Loading service details..." />;
    }

    if (isError || !service) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#fcfaff]">
                <div className="text-center p-12">
                    <p className="text-2xl font-black text-gray-300 mb-2">Service not found</p>
                    <p className="text-sm text-gray-400 mb-6">This service may no longer be available.</p>
                    <button
                        onClick={() => navigate('/marketplace')}
                        className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-colors"
                    >
                        Back to Marketplace
                    </button>
                </div>
            </div>
        );
    }

    const imageUrl = getImageUrl(service);

    return (
        <div className="flex-1 overflow-y-auto bg-[#fcfaff]">

            {/* ── Back nav ── */}
            <div className="max-w-5xl mx-auto px-4 pt-8">
                <button
                    onClick={() => navigate('/marketplace')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <IconBack /> Back to Marketplace
                </button>
            </div>

            {/* ── Hero image ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="max-w-5xl mx-auto px-4 pt-5"
            >
                <div className="relative rounded-[32px] overflow-hidden h-64 md:h-[420px] bg-purple-50">
                    {!imgLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-gray-100 to-purple-50">
                            <motion.div
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute inset-0 w-1/3 bg-white/60 blur-xl skew-x-12"
                            />
                        </div>
                    )}
                    <img
                        src={imageUrl}
                        alt={service.title}
                        onLoad={() => setImgLoaded(true)}
                        onError={(e) => {
                            e.currentTarget.src = fallbackImages[service.id % fallbackImages.length];
                            setImgLoaded(true);
                        }}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                        <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-purple-600 shadow-sm">
                            <IconTag /> {service.category}
                        </span>
                        <h1 className="text-white text-2xl md:text-4xl font-black mt-2 drop-shadow-lg leading-tight">
                            {service.title}
                        </h1>
                        <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                            <IconLocation /> {service.vendor} · {service.location}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* ── Content grid ── */}
            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left column — about + vendor */}
                <div className="lg:col-span-2 space-y-5">

                    {/* About */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100"
                    >
                        <h2 className="text-base font-bold text-gray-900 mb-3">About this Service</h2>
                        <ExpandableText
                            text={service.description || 'No description has been provided for this service.'}
                            previewLength={DESCRIPTION_PREVIEW_LENGTH}
                            className="text-gray-500 text-sm leading-relaxed whitespace-pre-line"
                        />
                    </motion.div>

                    {/* Vendor */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                        className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100"
                    >
                        <h2 className="text-base font-bold text-gray-900 mb-5">Vendor Information</h2>
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center font-black text-purple-600 text-2xl flex-shrink-0 select-none">
                                {service.vendor.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="font-bold text-gray-900">{service.vendor}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <span className="text-red-400"><IconLocation /></span>
                                    {service.location}
                                </p>
                                {service.vendor_experience != null && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                        <span className="text-yellow-400"><IconStar /></span>
                                        {service.vendor_experience} year{service.vendor_experience !== 1 ? 's' : ''} of experience
                                    </p>
                                )}
                                {service.vendor_website && (
                                    <a
                                        href={service.vendor_website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1.5 transition-colors"
                                    >
                                        <IconLink /> Visit vendor website
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right column — pricing card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="sticky top-6"
                >
                    <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Starting from</p>
                        <p className="text-3xl font-black text-gray-700 mt-1">{service.price}</p>
                        {service.pricing_description && (
                            <ExpandableText
                                text={service.pricing_description}
                                previewLength={PRICING_PREVIEW_LENGTH}
                                className="text-xs text-gray-400 mt-2 leading-relaxed whitespace-pre-line"
                            />
                        )}

                        <div className="mt-6 space-y-3">
                            {canBook && <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setShowBookingModal(true)}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-2xl font-bold transition-colors shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                            >
                                <IconCalendar />
                                Book Now
                            </motion.button>}
                            <button
                                onClick={() => navigate('/marketplace')}
                                className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 py-3 rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <IconBack /> Back to Marketplace
                            </button>
                        </div>
                    </div>
                </motion.div>

            </div>

            {/* ── Booking modal ── */}
            <AnimatePresence>
                {canBook && showBookingModal && (
                    <BookingModal
                        service={service}
                        onClose={() => setShowBookingModal(false)}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

export default ServiceDetail;
