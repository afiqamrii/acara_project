import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { usePageTitle } from '../../../utils/usePageTitle';

import Loader from '../../../components/common/Loader';
import api from '../../../lib/Api';

// grid image background
import hero1 from '../../../img/wedimg1.jpg';
import hero2 from '../../../img/wedimg2.jpg';
import hero3 from '../../../img/wedimg3.jpg';
import hero6 from '../../../img/wedimg6.jpg';
import hero7 from '../../../img/wedimg7.jpg';
import audience from '../../../img/audience.jpg';
import marketplaceBg from '../../../img/bg_marketplace.jpg';
import marketplaceBgAlt from '../../../img/bg3_marketplace.jpg';
import onlineVendor from '../../../img/onlinevendor1.jpg';

const heroImages = [hero1, hero2, hero3, hero6, hero7, audience, marketplaceBg, marketplaceBgAlt, onlineVendor];
const ITEMS_PER_PAGE = 6;
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

const emptyMarketplaceServices: MarketplaceService[] = [];

const getServiceImageUrl = (item: MarketplaceService) => {
    const portfolioUrl = item.thumbnail_url ?? item.portfolio_url ?? '';
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(portfolioUrl);
    return isImage ? portfolioUrl : heroImages[item.id % heroImages.length];
};

type AppliedFilters = {
    search: string;
    category: string;
    location: string;
    minPrice: string;
    maxPrice: string;
    page: number;
};

const emptyFilters: AppliedFilters = {
    search: '',
    category: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    page: 1,
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

const marketplaceServicesQueryKey = (params: MarketplaceParams) =>
    ['marketplace-services', params] as const;

const fetchMarketplaceServices = async (params: MarketplaceParams, signal?: AbortSignal) => {
    const response = await api.get<MarketplaceResponse>('/marketplace/services', {
        signal,
        params,
    });
    return response.data;
};

const malaysiaLocations = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
    'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
    'Terengganu', 'Kuala Lumpur', 'Putrajaya', 'Labuan',
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
    hidden: { y: 8, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.15, ease: [0.25, 0, 0, 1] as [number, number, number, number] } },
};

const visibleHeroImages = heroImages.slice(0, 4);

const VendorCard: React.FC<{ item: MarketplaceService; index: number }> = ({ item, index }) => {
    const navigate = useNavigate();
    const imageUrl = getServiceImageUrl(item);

    // Initialise from browser cache so already-loaded images skip the shimmer.
    // Stable key (item.id) means this runs once per unique vendor, not on
    // every filter change — avoiding the full remount/reload cycle.
    const [imageLoaded, setImageLoaded] = useState(() => {
        const img = new Image();
        img.src = imageUrl;
        return img.complete && img.naturalWidth > 0;
    });

    const handleImgRef = (el: HTMLImageElement | null) => {
        if (el && el.complete && el.naturalWidth > 0) setImageLoaded(true);
    };

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -10 }}
            className="group flex h-full flex-col bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
        >
            <div className="relative h-60 overflow-hidden">
                <img
                    ref={handleImgRef}
                    src={imageUrl}
                    alt={item.title}
                    loading="eager"
                    fetchPriority={index < 3 ? 'high' : 'auto'}
                    decoding="async"
                    onLoad={() => setImageLoaded(true)}
                    onError={(event) => {
                        const fallbackImage = heroImages[item.id % heroImages.length];
                        if (event.currentTarget.dataset.fallbackApplied !== 'true') {
                            event.currentTarget.dataset.fallbackApplied = 'true';
                            event.currentTarget.src = fallbackImage;
                            return;
                        }
                        setImageLoaded(true);
                    }}
                    className="relative z-10 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {!imageLoaded && (
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-100 via-gray-100 to-purple-50">
                        <motion.div
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                            className="h-full w-1/2 bg-white/50 blur-xl"
                        />
                    </div>
                )}
                <div className="absolute top-4 left-4 z-20">
                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-purple-600 shadow-sm">
                        {item.category}
                    </span>
                </div>
            </div>
            <div className="p-8 flex flex-1 flex-col">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                    {item.title}
                </h3>
                <p className="text-gray-500 text-sm mt-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400 shrink-0">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="line-clamp-1">By {item.vendor} · {item.location}</span>
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-lg leading-none text-amber-400">★</span>
                    {item.review_count > 0 && item.rating_average !== null ? (
                        <>
                            <span className="font-black text-gray-800">{Number(item.rating_average).toFixed(1)}</span>
                            <span className="text-gray-400">({item.review_count} review{item.review_count === 1 ? '' : 's'})</span>
                        </>
                    ) : (
                        <span className="font-semibold text-gray-400">New service</span>
                    )}
                </div>
                <div className="mt-auto pt-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Package Price</p>
                        <p className="text-lg font-black text-grey-700">{item.price}</p>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(`/marketplace/${item.id}`)}
                        className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-purple-600 transition-colors"
                    >
                        Details
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

const Marketplace: React.FC = () => {
    usePageTitle("Marketplace");
    const [search, setSearch] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [location, setLocation] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(emptyFilters);

    const marketplaceParams = useMemo(
        () => buildMarketplaceParams(appliedFilters),
        [appliedFilters],
    );

    const marketplaceQuery = useQuery({
        queryKey: marketplaceServicesQueryKey(marketplaceParams),
        queryFn: ({ signal }) => fetchMarketplaceServices(marketplaceParams, signal),
        placeholderData: keepPreviousData,
        staleTime: MARKETPLACE_STALE_TIME,
        gcTime: MARKETPLACE_CACHE_TIME,
    });

    const servicesData = marketplaceQuery.data?.data ?? emptyMarketplaceServices;
    const totalPages = Math.max(1, marketplaceQuery.data?.last_page ?? 1);
    const totalServices = marketplaceQuery.data?.total ?? 0;
    const loading = marketplaceQuery.isPending;
    const updating = marketplaceQuery.isFetching && !marketplaceQuery.isPending;
    const queryBusy = loading || updating;
    const hasActiveFilters = Object.values(appliedFilters).some(
        (v, i) => i < 5 && Boolean(v),
    );
    const error =
        marketplaceQuery.isError && servicesData.length === 0
            ? 'Unable to load marketplace services right now.'
            : '';

    const handleFilter = () => {
        setAppliedFilters({
            search: search.trim(),
            category: serviceType,
            location,
            minPrice,
            maxPrice,
            page: 1,
        });
    };

    const handleReset = () => {
        setSearch('');
        setServiceType('');
        setLocation('');
        setMinPrice('');
        setMaxPrice('');
        setAppliedFilters(emptyFilters);
    };

    const filterSessionKey = JSON.stringify(appliedFilters);

    return (
        <div className="flex-1 overflow-y-auto bg-[#fcfaff]">

            {/* --- HERO SECTION --- */}
            <div className="relative h-[20vh] md:h-[40vh] overflow-hidden bg-[#640D5F] flex items-center justify-center rounded-b-[40px] shadow-2xl">
                <div className="absolute inset-0 opacity-70 grid grid-cols-4 md:grid-cols-6 gap-4 rotate-12 scale-125">
                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: i % 2 === 0 ? 0 : -100 }}
                            animate={{ y: i % 2 === 0 ? -100 : 0 }}
                            transition={{ duration: 20, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }}
                            className="h-40 md:h-64 w-full bg-cover bg-center rounded-2xl"
                            style={{ backgroundImage: `url(${visibleHeroImages[i % visibleHeroImages.length]})` }}
                        />
                    ))}
                </div>

                <div className="relative h-[20vh] md:h-[40vh] w-full md:w-full rounded-b-[40px] bg-transparent">
                    <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="flex flex-col items-center"
                        >
                            <h1 className="md:text-8xl w-full font-black text-white tracking-tight flex flex-col md:flex-row gap-x-4">
                                <span>Event Vendor</span>
                                <motion.span
                                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                                    className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#B12C00,#ff7ad9,#EB5B00,#B12C00)] bg-[length:300%_300%] drop-shadow-[0_0_20px_rgba(209,41,255,0.5)]"
                                >
                                    Marketplace
                                </motion.span>
                            </h1>
                            <p className="text-gray-100 mt-6 text-lg md:text-xl max-w-2xl font-medium">
                                Discover the best local vendors for your next big celebration.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* --- FILTER BAR --- */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative z-20 -mt-12 px-4"
            >
                <div className="mx-auto max-w-6xl bg-white/80 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col lg:flex-row flex-wrap gap-4 items-center">
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            className="w-full lg:flex-1 min-w-[200px] rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-400 outline-none transition-all"
                        />
                        <select
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            className="w-full lg:w-48 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                        >
                            <option value="">All Services</option>
                            <option value="Catering">Catering</option>
                            <option value="Photography">Photography</option>
                            <option value="Decor">Decoration</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Venue">Venue</option>
                            <option value="Transportation">Transportation</option>
                            <option value="Planning">Planning</option>
                        </select>
                        <select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full lg:w-48 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                        >
                            <option value="">All Locations</option>
                            {malaysiaLocations.map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <input
                                type="number"
                                placeholder="Min"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="w-1/2 lg:w-24 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="w-1/2 lg:w-24 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                            />
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <button
                                onClick={handleFilter}
                                disabled={queryBusy}
                                className="flex-1 lg:w-auto bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-8 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-purple-200"
                            >
                                {updating ? 'Filtering...' : 'Filter'}
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                                RESET
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* --- VENDOR GRID --- */}
            <div className="relative max-w-6xl mx-auto px-4 py-16">
                {queryBusy ? (
                    <Loader
                        title="ACARA Marketplace"
                        message={hasActiveFilters ? 'Finding matching vendors...' : 'Loading marketplace services...'}
                    />
                ) : (
                    <motion.div
                        key={filterSessionKey}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {error && (
                            <div className="col-span-full rounded-[32px] bg-white p-10 text-center text-red-500 shadow-sm">
                                {error}
                            </div>
                        )}

                        {!error && servicesData.length === 0 && (
                            <div className="col-span-full rounded-[32px] bg-white p-10 text-center text-gray-500 shadow-sm">
                                No approved services found.
                            </div>
                        )}

                        {!error && servicesData.map((item, index) => (
                            <VendorCard
                                key={item.id}
                                item={item}
                                index={index}
                            />
                        ))}
                    </motion.div>
                )}

                {/* --- PAGINATION --- */}
                {!error && totalServices > 0 && (
                    <div className="flex justify-center items-center gap-3 mt-16">
                        <button
                            disabled={queryBusy || appliedFilters.page === 1}
                            onClick={() => setAppliedFilters((f) => ({ ...f, page: f.page - 1 }))}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                        >
                            ←
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                disabled={queryBusy}
                                onClick={() => setAppliedFilters((f) => ({ ...f, page: i + 1 }))}
                                className={`w-12 h-12 rounded-2xl font-bold transition-all disabled:opacity-50 ${appliedFilters.page === i + 1
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                    : 'hover:bg-white border border-transparent hover:border-gray-200'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            disabled={queryBusy || appliedFilters.page === totalPages}
                            onClick={() => setAppliedFilters((f) => ({ ...f, page: f.page + 1 }))}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Marketplace;
