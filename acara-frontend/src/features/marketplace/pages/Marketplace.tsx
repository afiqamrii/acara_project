import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    Bus,
    Camera,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Headphones,
    MapPin,
    Music2,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Star,
    Store,
    Utensils,
    X,
} from 'lucide-react';
import { usePageTitle } from '../../../utils/usePageTitle';
import Navbar from '../../header/pages/navbar';
import Footer from '../../../components/common/Footer';
import api from '../../../lib/Api';

import hero1 from '../../../img/wedimg1.jpg';
import hero2 from '../../../img/wedimg2.jpg';
import hero3 from '../../../img/wedimg3.jpg';
import hero4 from '../../../img/wedimg4.jpg';
import hero6 from '../../../img/wedimg6.jpg';
import hero7 from '../../../img/wedimg7.jpg';
import audience from '../../../img/audience.jpg';
import marketplaceBg from '../../../img/bg_marketplace.jpg';
import marketplaceBgAlt from '../../../img/bg3_marketplace.jpg';
import onlineVendor from '../../../img/onlinevendor1.jpg';

const fallbackImages = [
    hero1,
    hero2,
    hero3,
    hero4,
    hero6,
    hero7,
    audience,
    marketplaceBg,
    marketplaceBgAlt,
    onlineVendor,
];

const ITEMS_PER_PAGE = 12;
const MARKETPLACE_STALE_TIME = 1000 * 60 * 30;
const MARKETPLACE_CACHE_TIME = 1000 * 60 * 30;

type MarketplaceService = {
    id: number;
    title: string;
    category: string;
    description?: string | null;
    price: string;
    price_value: number;
    location: string;
    vendor: string;
    rating_average: number | null;
    review_count: number;
    thumbnail_url?: string | null;
    portfolio_url?: string | null;
};

type MarketplaceResponse = {
    data: MarketplaceService[];
    current_page: number;
    last_page: number;
    total: number;
};

type AppliedFilters = {
    search: string;
    category: string;
    location: string;
    minPrice: string;
    maxPrice: string;
    page: number;
};

type SortOption = 'recommended' | 'rating' | 'price-low' | 'price-high';

type MarketplaceProps = {
    variant?: 'landing' | 'catalog';
};

const categoryOptions = [
    { label: 'Catering', value: 'Catering', icon: Utensils, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Photography', value: 'Photography', icon: Camera, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Decoration', value: 'Decor', icon: Sparkles, tone: 'bg-rose-50 text-rose-700' },
    { label: 'Entertainment', value: 'Entertainment', icon: Music2, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Venues', value: 'Venue', icon: Building2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Transport', value: 'Transportation', icon: Bus, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Planning', value: 'Planning', icon: ClipboardList, tone: 'bg-orange-50 text-orange-700' },
];

const malaysiaLocations = [
    'Johor',
    'Kedah',
    'Kelantan',
    'Melaka',
    'Negeri Sembilan',
    'Pahang',
    'Perak',
    'Perlis',
    'Pulau Pinang',
    'Sabah',
    'Sarawak',
    'Selangor',
    'Terengganu',
    'Kuala Lumpur',
    'Putrajaya',
    'Labuan',
];

const getServiceImageUrl = (item: MarketplaceService) => {
    const portfolioUrl = item.thumbnail_url ?? item.portfolio_url ?? '';
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(portfolioUrl)
        ? portfolioUrl
        : fallbackImages[item.id % fallbackImages.length];
};

const buildMarketplaceParams = (filters: AppliedFilters) => ({
    page: filters.page,
    per_page: ITEMS_PER_PAGE,
    search: filters.search || undefined,
    category: filters.category || undefined,
    location: filters.location || undefined,
    min_price: filters.minPrice || undefined,
    max_price: filters.maxPrice || undefined,
});

type MarketplaceParams = ReturnType<typeof buildMarketplaceParams>;

const fetchMarketplaceServices = async (params: MarketplaceParams, signal?: AbortSignal) => {
    const response = await api.get<MarketplaceResponse>('/marketplace/services', {
        signal,
        params,
    });
    return response.data;
};

const ProductCard: React.FC<{ item: MarketplaceService; priority: boolean }> = ({ item, priority }) => {
    const navigate = useNavigate();
    const [imageLoaded, setImageLoaded] = useState(false);
    const imageUrl = getServiceImageUrl(item);
    const rating = item.rating_average == null ? null : Number(item.rating_average);

    return (
        <article
            onClick={() => navigate(`/marketplace/${item.id}`)}
            className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-[0_8px_30px_rgba(36,28,58,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#6f52a3]/30 hover:shadow-[0_18px_40px_rgba(62,44,91,0.12)]"
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-slate-100" />}
                <img
                    src={imageUrl}
                    alt={item.title}
                    loading={priority ? 'eager' : 'lazy'}
                    fetchPriority={priority ? 'high' : 'auto'}
                    onLoad={() => setImageLoaded(true)}
                    onError={(event) => {
                        if (event.currentTarget.dataset.fallbackApplied !== 'true') {
                            event.currentTarget.dataset.fallbackApplied = 'true';
                            event.currentTarget.src = fallbackImages[item.id % fallbackImages.length];
                        }
                        setImageLoaded(true);
                    }}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#62458f] shadow-sm backdrop-blur">
                    {item.category}
                </span>
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#211a2f]/85 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                    Verified provider
                </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-900 transition-colors group-hover:text-[#62458f]">
                    {item.title}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">{item.vendor}</p>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{item.location}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-slate-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {rating == null ? 'New' : rating.toFixed(1)}
                        {item.review_count > 0 && (
                            <span className="font-normal text-slate-400">({item.review_count})</span>
                        )}
                    </span>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">From</p>
                        <p className="truncate text-base font-extrabold text-[#55367f]">{item.price}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1ecf8] text-[#62458f] transition group-hover:bg-[#62458f] group-hover:text-white">
                        <ArrowRight className="h-4 w-4" />
                    </span>
                </div>
            </div>
        </article>
    );
};

const ProductSkeleton = () => (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="aspect-[4/3] animate-pulse bg-slate-100" />
        <div className="space-y-3 p-4">
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-px bg-slate-100" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
    </div>
);

const Marketplace: React.FC<MarketplaceProps> = ({ variant = 'catalog' }) => {
    const isLanding = variant === 'landing';
    usePageTitle(isLanding ? 'Plan Your Event' : 'Marketplace');
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSearch = searchParams.get('search') ?? '';
    const [search, setSearch] = useState(initialSearch);
    const [serviceType, setServiceType] = useState('');
    const [location, setLocation] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sort, setSort] = useState<SortOption>('recommended');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        search: initialSearch,
        category: '',
        location: '',
        minPrice: '',
        maxPrice: '',
        page: 1,
    });

    useEffect(() => {
        const urlSearch = searchParams.get('search') ?? '';
        const syncFromUrl = window.setTimeout(() => {
            setSearch(urlSearch);
            setAppliedFilters((current) =>
                current.search === urlSearch
                    ? current
                    : { ...current, search: urlSearch, page: 1 },
            );

            if (window.location.hash === '#services') {
                document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);

        return () => window.clearTimeout(syncFromUrl);
    }, [searchParams]);

    const marketplaceParams = useMemo(
        () => buildMarketplaceParams(appliedFilters),
        [appliedFilters],
    );

    const marketplaceQuery = useQuery({
        queryKey: ['marketplace-services', marketplaceParams],
        queryFn: ({ signal }) => fetchMarketplaceServices(marketplaceParams, signal),
        placeholderData: keepPreviousData,
        staleTime: MARKETPLACE_STALE_TIME,
        gcTime: MARKETPLACE_CACHE_TIME,
    });

    const sortedServices = useMemo(() => {
        const services = [...(marketplaceQuery.data?.data ?? [])];
        if (sort === 'price-low') return services.sort((a, b) => a.price_value - b.price_value);
        if (sort === 'price-high') return services.sort((a, b) => b.price_value - a.price_value);
        if (sort === 'rating') {
            return services.sort(
                (a, b) => (Number(b.rating_average) || 0) - (Number(a.rating_average) || 0),
            );
        }
        return services;
    }, [marketplaceQuery.data?.data, sort]);

    const totalPages = Math.max(1, marketplaceQuery.data?.last_page ?? 1);
    const totalServices = marketplaceQuery.data?.total ?? 0;
    const loading = marketplaceQuery.isPending;
    const updating = marketplaceQuery.isFetching && !marketplaceQuery.isPending;
    const hasActiveFilters = Boolean(
        appliedFilters.search ||
        appliedFilters.category ||
        appliedFilters.location ||
        appliedFilters.minPrice ||
        appliedFilters.maxPrice,
    );

    const applyFilters = (overrides: Partial<AppliedFilters> = {}) => {
        const nextFilters = {
            search: search.trim(),
            category: serviceType,
            location,
            minPrice,
            maxPrice,
            page: 1,
            ...overrides,
        };
        setAppliedFilters(nextFilters);
        setSearchParams(nextFilters.search ? { search: nextFilters.search } : {}, { replace: true });
        setMobileFiltersOpen(false);
        window.setTimeout(
            () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
            0,
        );
    };

    const selectCategory = (category: string) => {
        setServiceType(category);
        applyFilters({ category });
    };

    const resetFilters = () => {
        setSearch('');
        setServiceType('');
        setLocation('');
        setMinPrice('');
        setMaxPrice('');
        setSort('recommended');
        setAppliedFilters({
            search: '',
            category: '',
            location: '',
            minPrice: '',
            maxPrice: '',
            page: 1,
        });
        setSearchParams({}, { replace: true });
        setMobileFiltersOpen(false);
    };

    const filterPanel = (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-[#62458f]" />
                    Refine results
                </h3>
                {hasActiveFilters && (
                    <button onClick={resetFilters} className="text-xs font-bold text-[#62458f] hover:underline">
                        Clear all
                    </button>
                )}
            </div>

            <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Category</span>
                <select
                    value={serviceType}
                    onChange={(event) => setServiceType(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#8062ad] focus:ring-2 focus:ring-[#8062ad]/15"
                >
                    <option value="">All services</option>
                    {categoryOptions.map((category) => (
                        <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                </select>
            </label>

            <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Location</span>
                <select
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#8062ad] focus:ring-2 focus:ring-[#8062ad]/15"
                >
                    <option value="">Anywhere in Malaysia</option>
                    {malaysiaLocations.map((state) => (
                        <option key={state} value={state}>{state}</option>
                    ))}
                </select>
            </label>

            <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Budget range</legend>
                <div className="grid grid-cols-2 gap-2">
                    <label>
                        <span className="sr-only">Minimum price</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="Min RM"
                            value={minPrice}
                            onChange={(event) => setMinPrice(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[#8062ad] focus:ring-2 focus:ring-[#8062ad]/15"
                        />
                    </label>
                    <label>
                        <span className="sr-only">Maximum price</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="Max RM"
                            value={maxPrice}
                            onChange={(event) => setMaxPrice(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[#8062ad] focus:ring-2 focus:ring-[#8062ad]/15"
                        />
                    </label>
                </div>
            </fieldset>

            <button
                onClick={() => applyFilters()}
                disabled={updating}
                className="w-full rounded-xl bg-[#2a2139] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#62458f] disabled:cursor-wait disabled:opacity-60"
            >
                {updating ? 'Updating results…' : 'Apply filters'}
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f7f6f9] text-left text-slate-900">
            <Navbar />

            <main>
                {isLanding ? (
                    <>
                        <section className="relative overflow-hidden bg-[#282033]">
                            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_top_right,#b9a0d6,transparent_35%),radial-gradient(circle_at_bottom_left,#7e5ba7,transparent_30%)]" />
                            <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:py-16">
                                <div className="max-w-2xl">
                                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                                        <ShieldCheck className="h-4 w-4 text-emerald-300" />
                                        Verified event professionals across Malaysia
                                    </div>
                                    <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.035em] text-white sm:text-5xl lg:text-[56px]">
                                        Everything your event needs, in one trusted marketplace.
                                    </h1>
                                    <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                                        Compare venues, catering, photographers, decorators and more. Browse freely, then sign in only when you are ready to book.
                                    </p>

                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            applyFilters();
                                        }}
                                        className="mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/20 sm:flex-row"
                                    >
                                        <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                                            <Search className="h-5 w-5 shrink-0 text-[#75559e]" />
                                            <span className="sr-only">Search event services</span>
                                            <input
                                                type="search"
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                                placeholder="Search catering, venues, photographers…"
                                                className="h-12 w-full min-w-0 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            className="h-12 rounded-xl bg-[#76539f] px-7 text-sm font-bold text-white transition hover:bg-[#634486] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76539f] focus-visible:ring-offset-2"
                                        >
                                            Search services
                                        </button>
                                    </form>

                                    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-300">
                                        <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Verified vendors</span>
                                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Secure booking flow</span>
                                        <span className="flex items-center gap-1.5"><Headphones className="h-4 w-4 text-emerald-300" /> Local support</span>
                                    </div>
                                </div>

                                <div className="relative hidden h-[340px] lg:block">
                                    <div className="absolute left-4 top-4 h-64 w-[58%] overflow-hidden rounded-[28px] border border-white/15 shadow-2xl">
                                        <img src={hero1} alt="Elegant event venue" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="absolute bottom-3 right-2 h-56 w-[52%] overflow-hidden rounded-[28px] border-4 border-[#282033] shadow-2xl">
                                        <img src={hero7} alt="Professional event catering" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="absolute bottom-5 left-0 rounded-2xl border border-white/15 bg-white/95 p-4 shadow-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                                <Store className="h-5 w-5" />
                                            </span>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Marketplace access</p>
                                                <p className="text-sm font-extrabold text-slate-900">Browse before signing in</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section aria-labelledby="categories-heading" className="border-b border-slate-200 bg-white">
                            <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
                                <div className="mb-5 flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#76539f]">Browse faster</p>
                                        <h2 id="categories-heading" className="mt-1 text-xl font-extrabold text-slate-900">Popular categories</h2>
                                    </div>
                                    {serviceType && (
                                        <button onClick={() => selectCategory('')} className="text-xs font-bold text-slate-500 hover:text-[#62458f]">
                                            View all
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                                    {categoryOptions.map(({ label, value, icon: Icon, tone }) => (
                                        <button
                                            key={value}
                                            onClick={() => selectCategory(value)}
                                            className={`group flex min-w-0 flex-col items-center rounded-2xl border px-2 py-4 transition ${
                                                serviceType === value
                                                    ? 'border-[#8062ad] bg-[#f3eef8] shadow-sm'
                                                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#8062ad]/40 hover:shadow-md'
                                            }`}
                                        >
                                            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <span className="mt-2 w-full truncate text-center text-[11px] font-bold text-slate-700 sm:text-xs">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </>
                ) : (
                    <section className="border-b border-slate-200 bg-white">
                        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#76539f]">Acara Marketplace</p>
                                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Find event services</h1>
                                </div>
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        applyFilters();
                                    }}
                                    className="flex w-full max-w-2xl gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-[#8062ad]/60 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#8062ad]/10"
                                >
                                    <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                                        <Search className="h-5 w-5 shrink-0 text-[#75559e]" />
                                        <span className="sr-only">Search event services</span>
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search services or vendors"
                                            className="h-11 w-full min-w-0 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        className="h-11 rounded-xl bg-[#2a2139] px-5 text-sm font-bold text-white transition hover:bg-[#62458f]"
                                    >
                                        Search
                                    </button>
                                </form>
                            </div>

                            <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Service categories">
                                <button
                                    onClick={() => selectCategory('')}
                                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                                        serviceType === ''
                                            ? 'border-[#62458f] bg-[#62458f] text-white'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-[#8062ad]/50 hover:text-[#62458f]'
                                    }`}
                                >
                                    All services
                                </button>
                                {categoryOptions.map(({ label, value, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => selectCategory(value)}
                                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                                            serviceType === value
                                                ? 'border-[#62458f] bg-[#62458f] text-white'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-[#8062ad]/50 hover:text-[#62458f]'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section id="services" className="scroll-mt-24">
                    <div className={`mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 ${isLanding ? 'py-10 lg:py-14' : 'py-8 lg:py-10'}`}>
                        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                {isLanding && (
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#76539f]">Marketplace</p>
                                )}
                                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                    {appliedFilters.search
                                        ? `Results for “${appliedFilters.search}”`
                                        : isLanding
                                            ? 'Services for your next event'
                                            : 'All services'}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {loading
                                        ? 'Loading services…'
                                        : `${totalServices} service${totalServices === 1 ? '' : 's'} available`}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setMobileFiltersOpen(true)}
                                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 lg:hidden"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Filters
                                </button>
                                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                                    <span className="hidden text-xs font-semibold text-slate-400 sm:inline">Sort</span>
                                    <select
                                        value={sort}
                                        onChange={(event) => setSort(event.target.value as SortOption)}
                                        className="h-11 border-0 bg-transparent pr-2 text-sm font-semibold text-slate-700 outline-none"
                                    >
                                        <option value="recommended">Recommended</option>
                                        <option value="rating">Highest rated</option>
                                        <option value="price-low">Price: low to high</option>
                                        <option value="price-high">Price: high to low</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr]">
                            <aside className="sticky top-28 hidden rounded-2xl border border-slate-200 bg-white p-5 lg:block">
                                {filterPanel}
                            </aside>

                            <div>
                                {marketplaceQuery.isError && sortedServices.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                                            <X className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-extrabold text-slate-900">The marketplace is temporarily unavailable</h3>
                                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                            We could not load services right now. Please try again in a moment.
                                        </p>
                                        <button
                                            onClick={() => marketplaceQuery.refetch()}
                                            className="mt-5 rounded-xl bg-[#2a2139] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#62458f]"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                ) : loading ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {Array.from({ length: 6 }).map((_, index) => <ProductSkeleton key={index} />)}
                                    </div>
                                ) : sortedServices.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                                        <Search className="mx-auto h-9 w-9 text-slate-300" />
                                        <h3 className="mt-4 text-lg font-extrabold text-slate-900">No services match those filters</h3>
                                        <p className="mt-2 text-sm text-slate-500">Try a broader category, location or budget range.</p>
                                        <button onClick={resetFilters} className="mt-5 text-sm font-bold text-[#62458f] hover:underline">
                                            Clear all filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${updating ? 'opacity-55' : 'opacity-100'}`}>
                                        {sortedServices.map((item, index) => (
                                            <ProductCard key={item.id} item={item} priority={index < 3} />
                                        ))}
                                    </div>
                                )}

                                {!marketplaceQuery.isError && totalServices > 0 && totalPages > 1 && (
                                    <nav aria-label="Marketplace pages" className="mt-10 flex items-center justify-center gap-2">
                                        <button
                                            aria-label="Previous page"
                                            disabled={updating || appliedFilters.page === 1}
                                            onClick={() => setAppliedFilters((current) => ({ ...current, page: current.page - 1 }))}
                                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#8062ad] hover:text-[#62458f] disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="px-3 text-sm font-semibold text-slate-600">
                                            Page {appliedFilters.page} of {totalPages}
                                        </span>
                                        <button
                                            aria-label="Next page"
                                            disabled={updating || appliedFilters.page === totalPages}
                                            onClick={() => setAppliedFilters((current) => ({ ...current, page: current.page + 1 }))}
                                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#8062ad] hover:text-[#62458f] disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </nav>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {isLanding && (
                    <section className="bg-white">
                        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:grid-cols-3 sm:px-8 lg:px-10">
                            {[
                                { icon: BadgeCheck, title: 'Approved providers', text: 'Every listing is reviewed before it appears in the marketplace.' },
                                { icon: ShieldCheck, title: 'Protected booking flow', text: 'Your request, quotation and booking history stay together in Acara.' },
                                { icon: Headphones, title: 'Local event support', text: 'Plan with Malaysian vendors who understand your location and event.' },
                            ].map(({ icon: Icon, title, text }) => (
                                <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f1ecf8] text-[#62458f]">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <h3 className="font-extrabold text-slate-900">{title}</h3>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Footer />

            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-[70] lg:hidden">
                    <button
                        aria-label="Close filters"
                        onClick={() => setMobileFiltersOpen(false)}
                        className="absolute inset-0 h-full w-full bg-black/45"
                    />
                    <div className="absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <p className="text-lg font-extrabold text-slate-900">Filter services</p>
                            <button
                                aria-label="Close filters"
                                onClick={() => setMobileFiltersOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {filterPanel}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
