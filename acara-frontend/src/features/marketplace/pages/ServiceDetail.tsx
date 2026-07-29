import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import type { AxiosError } from 'axios';
import { BadgeCheck, CheckCircle2, ChevronRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import Loader from '../../../components/common/Loader';
import Navbar from '../../header/pages/navbar';
import Footer from '../../../components/common/Footer';
import LoginGateModal from '../../../components/common/LoginGateModal';
import api from '../../../lib/Api';
import { hasAuthToken } from '../../../lib/auth';
import BookingBriefForm from '../../bookings/components/BookingBriefForm';
import ReusableEventBriefPicker from '../../bookings/components/ReusableEventBriefPicker';
import {
    applyReusableEventDetails,
    bookingBriefPayload,
    emptyBookingBrief,
    isBookingBriefValid,
    type BookingBriefFormValue,
} from '../../bookings/components/bookingBriefFormState';
import { fetchCart } from '../../header/pages/cartApi';

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

type PublicReview = {
    id: number;
    rating: number;
    comment: string;
    reviewer_name: string;
    created_at: string;
};

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
    rating_average: number | null;
    review_count: number;
    reviews: PublicReview[];
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

function formatReviewDate(value: string): string {
    return new Date(value.replace(' ', 'T')).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'short', year: 'numeric',
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
    const [step, setStep] = useState<'date' | 'brief'>('date');
    const [brief, setBrief] = useState<BookingBriefFormValue>(() => emptyBookingBrief());
    const [submitted, setSubmitted] = useState(false);
    const [cartError, setCartError] = useState<string | null>(null);

    const addToCartMutation = useMutation({
        mutationFn: (data: { service_id: number; date: string } & ReturnType<typeof bookingBriefPayload>) =>
            api.post('/bookings/cart', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            setCartError(null);
            setSubmitted(true);
        },
        onError: (error: AxiosError<{ message?: string }>) => {
            setCartError(error.response?.data?.message ?? 'Failed to add to cart. Please try again.');
        },
    });

    const { data, isPending } = useQuery({
        queryKey: ['service-availability', service.id],
        queryFn: () => fetchAvailability(service.id),
        staleTime: 1000 * 60 * 5,
    });

    const cartBriefQuery = useQuery({
        queryKey: ['cart'],
        queryFn: fetchCart,
        staleTime: 1000 * 30,
        enabled: step === 'brief',
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
                className={`bg-white rounded-[28px] w-full shadow-2xl overflow-hidden ${step === 'brief' ? 'max-w-3xl' : 'max-w-sm'}`}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-gray-900 text-base">{step === 'brief' ? 'Event Brief' : 'Choose a Date'}</h3>
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
                    ) : step === 'date' ? (
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
                                            onClick={() => {
                                                setCartError(null);
                                                setStep('brief');
                                            }}
                                            disabled={cartError?.includes('already in your cart')}
                                            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-purple-200"
                                        >
                                            {cartError?.includes('already in your cart') ? 'Already in Cart' : 'Continue to Event Details'}
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="brief"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex max-h-[78vh] flex-col"
                        >
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                {selectedDate && (
                                    <>
                                        <ReusableEventBriefPicker
                                            items={cartBriefQuery.data?.items ?? []}
                                            selectedDate={selectedDate}
                                            isLoading={cartBriefQuery.isPending}
                                            isError={cartBriefQuery.isError}
                                            onApply={(source) => {
                                                setBrief((current) => applyReusableEventDetails(current, source));
                                                setCartError(null);
                                            }}
                                        />
                                        <BookingBriefForm
                                            value={brief}
                                            onChange={setBrief}
                                            selectedDate={selectedDate}
                                        />
                                    </>
                                )}
                            </div>
                            <div className="border-t border-gray-100 bg-white px-6 py-4">
                                {cartError && (
                                    <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                                        {cartError}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep('date')}
                                        disabled={addToCartMutation.isPending}
                                        className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        Back to date
                                    </button>
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => selectedDate && addToCartMutation.mutate({
                                            service_id: service.id,
                                            date: selectedDate,
                                            ...bookingBriefPayload(brief),
                                        })}
                                        disabled={addToCartMutation.isPending || !isBookingBriefValid(brief)}
                                        className="flex-1 rounded-2xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {addToCartMutation.isPending ? 'Adding...' : 'Add Complete Request'}
                                    </motion.button>
                                </div>
                                {!isBookingBriefValid(brief) && (
                                    <p className="mt-2 text-center text-[10px] text-gray-400">Complete all required fields before adding this service.</p>
                                )}
                            </div>
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
    const [showLoginGate, setShowLoginGate] = useState(false);
    const isAuthenticated = hasAuthToken();
    const role = localStorage.getItem('role') ?? '';
    const canBook = isAuthenticated && ['user', 'vendor'].includes(role);

    const { data: service, isPending, isError } = useQuery({
        queryKey: ['marketplace-service', serviceId],
        queryFn: ({ signal }) => fetchServiceDetail(serviceId!, signal),
        enabled: !!serviceId,
        staleTime: 1000 * 60 * 10,
    });

    if (isPending) {
        return (
            <div className="min-h-screen bg-[#f7f6f9]">
                <Navbar />
                <div className="min-h-[70vh]">
                    <Loader title="ACARA Marketplace" message="Loading service details..." />
                </div>
            </div>
        );
    }

    if (isError || !service) {
        return (
            <div className="min-h-screen bg-[#f7f6f9]">
                <Navbar />
                <div className="flex min-h-[65vh] items-center justify-center px-5">
                    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <p className="text-2xl font-black text-slate-800">Service not found</p>
                        <p className="mt-2 text-sm text-slate-500">This service may no longer be available.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 rounded-xl bg-[#65478d] px-6 py-3 font-bold text-white transition hover:bg-[#543875]"
                        >
                            Browse other services
                        </button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const imageUrl = getImageUrl(service);
    const reviews = service.reviews ?? [];
    const startBooking = () => {
        if (!isAuthenticated) {
            setShowLoginGate(true);
            return;
        }
        if (canBook) setShowBookingModal(true);
    };

    return (
        <div className="min-h-screen bg-[#f7f6f9] text-left text-slate-900">
            <Navbar />

            <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
                <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <button onClick={() => navigate('/')} className="transition hover:text-[#62458f]">Marketplace</button>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <button
                        onClick={() => navigate(`/?search=${encodeURIComponent(service.category)}#services`)}
                        className="transition hover:text-[#62458f]"
                    >
                        {service.category}
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span className="max-w-[240px] truncate text-slate-400">{service.title}</span>
                </nav>

                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(36,28,58,0.07)] lg:grid-cols-[1.05fr_0.95fr]"
                >
                    <div className="relative min-h-[300px] overflow-hidden bg-slate-100 sm:min-h-[430px] lg:min-h-[540px]">
                        {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-slate-100" />}
                        <img
                            src={imageUrl}
                            alt={service.title}
                            onLoad={() => setImgLoaded(true)}
                            onError={(event) => {
                                if (event.currentTarget.dataset.fallbackApplied !== 'true') {
                                    event.currentTarget.dataset.fallbackApplied = 'true';
                                    event.currentTarget.src = fallbackImages[service.id % fallbackImages.length];
                                }
                                setImgLoaded(true);
                            }}
                            className="h-full w-full object-cover"
                        />
                        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#62458f] shadow-sm backdrop-blur">
                            <IconTag /> {service.category}
                        </span>
                    </div>

                    <div className="flex flex-col p-6 sm:p-8 lg:p-10">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                                <BadgeCheck className="h-4 w-4" />
                                Verified provider
                            </span>
                            {service.review_count > 0 && service.rating_average !== null && (
                                <>
                                    <span className="h-3 w-px bg-slate-200" />
                                    <span className="flex items-center gap-1 font-bold text-slate-700">
                                        <span className="text-amber-400"><IconStar /></span>
                                        {Number(service.rating_average).toFixed(1)}
                                        <span className="font-medium text-slate-400">({service.review_count} reviews)</span>
                                    </span>
                                </>
                            )}
                        </div>

                        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-0.03em] text-slate-900 sm:text-4xl">
                            {service.title}
                        </h1>
                        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <IconLocation />
                            {service.location}
                        </p>

                        <div className="mt-6 rounded-2xl bg-[#f5f1f8] p-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Starting from</p>
                            <p className="mt-1 text-3xl font-black tracking-tight text-[#55367f]">{service.price}</p>
                            {service.pricing_description && (
                                <ExpandableText
                                    text={service.pricing_description}
                                    previewLength={PRICING_PREVIEW_LENGTH}
                                    className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-500"
                                />
                            )}
                        </div>

                        <div className="mt-6 flex items-center gap-3 border-y border-slate-100 py-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ede6f4] text-lg font-black text-[#62458f]">
                                {service.vendor.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate font-extrabold text-slate-900">{service.vendor}</p>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">
                                    {service.vendor_experience != null
                                        ? `${service.vendor_experience} year${service.vendor_experience === 1 ? '' : 's'} in business`
                                        : 'Approved Acara service provider'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2.5 text-sm text-slate-600">
                            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Check live vendor availability</p>
                            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Keep your request and quotation in Acara</p>
                        </div>

                        <div className="mt-auto pt-7">
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={startBooking}
                                disabled={isAuthenticated && !canBook}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#65478d] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#65478d]/15 transition hover:bg-[#543875] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                            >
                                {!isAuthenticated && <LockKeyhole className="h-4 w-4" />}
                                {isAuthenticated && !canBook
                                    ? 'Customer account required to book'
                                    : isAuthenticated
                                        ? 'Check availability & book'
                                        : 'Sign in to check availability'}
                            </motion.button>
                            {!isAuthenticated && (
                                <p className="mt-3 text-center text-xs font-medium text-slate-400">
                                    You can browse all service details without an account.
                                </p>
                            )}
                        </div>
                    </div>
                </motion.section>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
                    <div className="space-y-6">
                        <section className="rounded-[22px] border border-slate-200 bg-white p-6 sm:p-8">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#76539f]">Service overview</p>
                            <h2 className="mt-1 text-xl font-extrabold text-slate-900">About this service</h2>
                            <ExpandableText
                                text={service.description || 'No description has been provided for this service.'}
                                previewLength={DESCRIPTION_PREVIEW_LENGTH}
                                className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600"
                            />
                        </section>

                        <section className="rounded-[22px] border border-slate-200 bg-white p-6 sm:p-8">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#76539f]">Customer feedback</p>
                                    <h2 className="mt-1 text-xl font-extrabold text-slate-900">Verified reviews</h2>
                                    <p className="mt-1 text-sm text-slate-500">Only customers with completed Acara bookings can review.</p>
                                </div>
                                {service.review_count > 0 && service.rating_average !== null && (
                                    <div className="rounded-2xl bg-amber-50 px-5 py-3 text-left ring-1 ring-amber-100 sm:text-right">
                                        <p className="text-2xl font-black text-slate-900">{Number(service.rating_average).toFixed(1)}</p>
                                        <div className="mt-1 flex items-center gap-0.5 text-amber-400">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <span key={star} className={star <= Math.round(service.rating_average ?? 0) ? 'text-amber-400' : 'text-slate-200'}>
                                                    <IconStar />
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {reviews.length === 0 ? (
                                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                    <p className="font-bold text-slate-700">No reviews yet</p>
                                    <p className="mt-1 text-sm text-slate-400">A completed customer can publish the first verified review.</p>
                                </div>
                            ) : (
                                <div className="mt-6 space-y-3">
                                    {reviews.map((review) => (
                                        <article key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{review.reviewer_name}</p>
                                                    <p className="mt-0.5 text-xs text-slate-400">{formatReviewDate(review.created_at)}</p>
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <span key={star} className={star <= review.rating ? 'text-amber-400' : 'text-slate-200'}>
                                                            <IconStar />
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.comment}</p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="sticky top-28 rounded-[22px] border border-slate-200 bg-white p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#76539f]">Provider details</p>
                        <h2 className="mt-2 text-lg font-extrabold text-slate-900">{service.vendor}</h2>
                        <div className="mt-5 space-y-3 text-sm text-slate-600">
                            <p className="flex items-start gap-2"><span className="mt-0.5 text-[#76539f]"><IconLocation /></span>{service.location}</p>
                            {service.vendor_experience != null && (
                                <p className="flex items-center gap-2"><span className="text-amber-400"><IconStar /></span>{service.vendor_experience} year{service.vendor_experience === 1 ? '' : 's'} of experience</p>
                            )}
                            {service.vendor_website && (
                                <a href={service.vendor_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-[#62458f] hover:underline">
                                    <IconLink /> Visit provider website
                                </a>
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/#services')}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[#8062ad]/40 hover:bg-[#f8f5fa]"
                        >
                            <IconBack /> Browse more services
                        </button>
                    </aside>
                </div>
            </main>

            <Footer />

            <AnimatePresence>
                {canBook && showBookingModal && (
                    <BookingModal service={service} onClose={() => setShowBookingModal(false)} />
                )}
            </AnimatePresence>
            <LoginGateModal
                open={showLoginGate}
                onClose={() => setShowLoginGate(false)}
                serviceName={service.title}
            />
        </div>
    );
};

export default ServiceDetail;
