import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
const LOADING_ANIMATION_MS = 10;

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });

const waitForLoadingAnimation = async (startedAt: number) => {
    const remainingTime = LOADING_ANIMATION_MS - (Date.now() - startedAt);

    if (remainingTime > 0) {
        await wait(remainingTime);
    }
};

const MarketplaceLoader = ({ message }: { message: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="col-span-full flex flex-col items-center justify-center rounded-[32px] bg-white p-12 text-center shadow-sm"
    >
        <div className="relative h-16 w-16">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-purple-100 border-t-purple-600"
            />
            <motion.div
                animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-4 rounded-full bg-purple-500"
            />
        </div>
        <p className="mt-5 text-sm font-semibold text-purple-700">{message}</p>
    </motion.div>
);

type MarketplaceService = {
    id: number;
    title: string;
    category: string;
    description?: string | null;
    price: string;
    price_value: number;
    location: string;
    vendor: string;
    portfolio_url?: string | null;
};

type MarketplaceResponse = {
    data: MarketplaceService[];
    current_page: number;
    last_page: number;
    total: number;
};

const getServiceImageUrl = (item: MarketplaceService) => {
    const portfolioUrl = item.portfolio_url ?? '';
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(portfolioUrl);

    return isImage ? portfolioUrl : heroImages[item.id % heroImages.length];
};

type AppliedFilters = {
    search: string;
    category: string;
    location: string;
    minPrice: string;
    maxPrice: string;
};

const emptyFilters: AppliedFilters = {
    search: '',
    category: '',
    location: '',
    minPrice: '',
    maxPrice: '',
};

const Marketplace: React.FC = () => {
    const [serviceType, setServiceType] = useState('');
    const [location, setLocation] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [servicesData, setServicesData] = useState<MarketplaceService[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(emptyFilters);
    const [filtering, setFiltering] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [totalServices, setTotalServices] = useState(0);
    const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
    const responseCache = useRef(new Map<string, MarketplaceResponse>());
    const itemsPerPage = 6;

    useEffect(() => {
        const controller = new AbortController();

        const fetchMarketplaceServices = async () => {
            const loadingStartedAt = Date.now();
            const params = {
                page: currentPage,
                per_page: itemsPerPage,
                search: appliedFilters.search || undefined,
                category: appliedFilters.category || undefined,
                location: appliedFilters.location || undefined,
                min_price: appliedFilters.minPrice || undefined,
                max_price: appliedFilters.maxPrice || undefined,
            };
            const cacheKey = JSON.stringify(params);
            setError('');
            setLoading(true);

            if (responseCache.current.has(cacheKey)) {
                const cached = responseCache.current.get(cacheKey)!;
                await waitForLoadingAnimation(loadingStartedAt);
                if (controller.signal.aborted) return;

                setServicesData(cached.data);
                setTotalPages(Math.max(1, cached.last_page));
                setTotalServices(cached.total);
                setFiltering(false);
                setLoading(false);
                return;
            }

            try {
                const response = await api.get<MarketplaceResponse>('/marketplace/services', {
                    signal: controller.signal,
                    params,
                });
                await waitForLoadingAnimation(loadingStartedAt);
                if (controller.signal.aborted) return;

                responseCache.current.set(cacheKey, response.data);
                setServicesData(response.data.data);
                setTotalPages(Math.max(1, response.data.last_page));
                setTotalServices(response.data.total);
            } catch (err: any) {
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
                console.error('Failed to load marketplace services:', err);
                setError('Unable to load marketplace services right now.');
            } finally {
                if (!controller.signal.aborted) {
                    setFiltering(false);
                    setLoading(false);
                }
            }
        };

        fetchMarketplaceServices();
        return () => controller.abort();
    }, [currentPage, appliedFilters]);

    const handleFilter = () => {
        setFiltering(true);
        setLoading(true);
        // setServicesData([]);
        // setTotalServices(0);
        setLoadedImages({});
        setAppliedFilters({
            search: search.trim(),
            category: serviceType,
            location,
            minPrice,
            maxPrice,
        });
        setCurrentPage(1);
    };

    const handleReset = () => {
        setServiceType('');
        setLocation('');
        setMinPrice('');
        setMaxPrice('');
        setSearch('');
        setFiltering(true);
        setLoading(true);
        setLoadedImages({});
        setAppliedFilters(emptyFilters);
        setCurrentPage(1);
    };

    const malaysiaLocations = [
        "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
        "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
        "Terengganu", "Kuala Lumpur", "Putrajaya", "Labuan",
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const visibleHeroImages = heroImages.slice(0,4);

    return (
        
        <div className="flex-1 overflow-y-auto bg-[#fcfaff]">

                {/* --- HERO SECTION WITH GRID MOTION --- */}
                <div className="relative h-[50vh] md:h-[60vh] overflow-hidden bg-[#640D5F] flex items-center justify-center rounded-b-[40px] shadow-2xl">
                    <div className="absolute inset-0 opacity-70 grid grid-cols-4 md:grid-cols-6 gap-4 rotate-12 scale-125">

                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: i % 2 === 0 ? 0 : -100 }}
                                animate={{ y: i % 2 === 0 ? -100 : 0 }}
                                transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
                                className="h-40 md:h-64 w-full bg-cover bg-center rounded-2xl"
                                style={{ backgroundImage: `url(${visibleHeroImages[i % visibleHeroImages.length]})` }}
                            />
                        ))}
                    </div>

                    <div className="relative h-[50vh] w-full md:h-[60vh] rounded-b-[40px] bg-transparent">
                        <div className="absolute inset-0 bg-none" />
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
                                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
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

                {/* --- SEARCH & FILTER BAR --- */}
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
                                <option value="Decoration">Decoration</option>
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
                                <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-1/2 lg:w-24 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
                                <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-1/2 lg:w-24 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
                            </div>
                            <div className="flex gap-2 w-full lg:w-auto">
                                <button onClick={handleFilter} disabled={loading} className="flex-1 lg:w-auto bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-8 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-purple-200">Filter</button>
                                <button onClick={handleReset} className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">RESET</button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* --- VENDOR GRID --- */}
                <div className="max-w-6xl mx-auto px-4 py-16">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {loading && servicesData.length === 0 && (
                            <MarketplaceLoader message={filtering ? "Filtering services..." : "Loading marketplace services..."} />
                        )}

                        {loading && servicesData.length > 0 && (
                            <div className="col-span-full rounded-2xl bg-purple-50 px-5 py-3 text-center text-sm font-semibold text-purple-700">
                                Updating results...
                            </div>
                        )}

                        {!loading && error && servicesData.length === 0 && (
                            <div className="col-span-full rounded-[32px] bg-white p-10 text-center text-red-500 shadow-sm">
                                {error}
                            </div>
                        )}

                        {!loading && !error && servicesData.length === 0 && (
                            <div className="col-span-full rounded-[32px] bg-white p-10 text-center text-gray-500 shadow-sm">
                                No approved services found.
                            </div>
                        )}

                        {!error && servicesData.map((item, index) => (
                            <motion.div
                                key={item.id}
                                variants={itemVariants}
                                whileHover={{ y: -10 }}
                                className="group bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="relative h-60 overflow-hidden">
                                    <motion.img
                                        whileHover={{ scale: 1.1 }}
                                        transition={{ duration: 0.6 }}
                                        src={getServiceImageUrl(item)}
                                        alt={item.title}
                                        loading={index === 0 ? "eager" : "lazy"}
                                        fetchPriority={index === 0 ? "high" : "auto"}
                                        decoding="async"
                                        onLoad={() => {
                                            setLoadedImages((current) => ({
                                                ...current,
                                                [item.id]: true,
                                            }));
                                        }}
                                        onError={(event) => {
                                            const fallbackImage = heroImages[item.id % heroImages.length];

                                            if (event.currentTarget.dataset.fallbackApplied !== "true") {
                                                event.currentTarget.dataset.fallbackApplied = "true";
                                                event.currentTarget.src = fallbackImage;
                                                return;
                                            }

                                            setLoadedImages((current) => ({
                                                ...current,
                                                [item.id]: true,
                                            }));
                                        }}
                                        className={`w-full h-full object-cover transition-opacity duration-500 ${loadedImages[item.id] ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {!loadedImages[item.id] && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-gray-100 to-purple-50">
                                            <motion.div
                                                animate={{ x: ["-100%", "100%"] }}
                                                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                                                className="h-full w-1/2 bg-white/50 blur-xl"
                                            />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-purple-600 shadow-sm">
                                            {item.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{item.title}</h3>
                                    <p className="text-gray-500 text-sm mt-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400">
                                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                        <span>By {item.vendor} · {item.location}</span>
                                    </p>
                                    <div className="mt-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Package Price</p>
                                            <p className="text-lg font-black text-purple-700">{item.price}</p>
                                        </div>
                                        <motion.button whileTap={{ scale: 0.9 }} className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-purple-600 transition-colors">
                                            Details
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* --- PAGINATION --- */}
                    {!error && totalServices > 0 && (
                    <div className="flex justify-center items-center gap-3 mt-16">
                        <button disabled={loading || currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm">←</button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button key={i} disabled={loading} onClick={() => setCurrentPage(i + 1)} className={`w-12 h-12 rounded-2xl font-bold transition-all disabled:opacity-50 ${currentPage === i + 1 ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "hover:bg-white border border-transparent hover:border-gray-200"}`}>{i + 1}</button>
                        ))}
                        <button disabled={loading || currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm">→</button>
                    </div>
                    )}
                </div>

        </div>
    );
};

export default Marketplace;
