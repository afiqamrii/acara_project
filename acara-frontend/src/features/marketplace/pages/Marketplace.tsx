import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../header/pages/navbar';


// grid image background
import hero1 from '../../../img/wedimg1.jpg';
import hero2 from '../../../img/wedimg2.jpg';
import hero3 from '../../../img/wedimg3.jpg';
import hero4 from '../../../img/wedimg4.jpg';
import hero5 from '../../../img/wedimg5.jpg';
import hero6 from '../../../img/wedimg6.jpg';
import hero7 from '../../../img/wedimg7.jpg';
import hero8 from '../../../img/wedimg8.jpg';
import hero9 from '../../../img/wedimg9.jpg';


const heroImages = [hero1, hero2, hero3, hero4, hero5, hero6, hero7, hero8, hero9];


const servicesData = [
    { id: 1, title: "Wedding Catering Package", category: "Catering", price: "RM 2,500 – RM 6,000", location: "Selangor", vendor: "Delicious Events" },
    { id: 2, title: "Corporate Catering Package", category: "Catering", price: "RM 3,000 – RM 8,000", location: "Kuala Lumpur", vendor: "Elite Buffet" },
    { id: 3, title: "Birthday Catering Package", category: "Catering", price: "RM 1,500 – RM 4,000", location: "Johor", vendor: "Party Bites" },
    { id: 4, title: "Luxury Wedding Photography", category: "Photography", price: "RM 4,000 – RM 10,000", location: "Penang", vendor: "Pixel Perfect" },
    { id: 5, title: "Garden Decor Set", category: "Decoration", price: "RM 2,000 – RM 5,000", location: "Melaka", vendor: "Floral Dreams" },
    { id: 6, title: "Grand Ballroom Setup", category: "Decoration", price: "RM 10,000 – RM 20,000", location: "Selangor", vendor: "Royal Decor" },
];

const Marketplace: React.FC = () => {
    const [serviceType, setServiceType] = useState('');
    const [location, setLocation] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleReset = () => {
        setServiceType('');
        setLocation('');
        setMinPrice('');
        setMaxPrice('');
        setSearch('');
    };

    const malaysiaLocations = [
        "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
        "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
        "Terengganu", "Kuala Lumpur", "Putrajaya", "Labuan",
    ];

    const itemsPerPage = 6;
    const totalPages = Math.ceil(servicesData.length / itemsPerPage);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-[#fcfaff]">
            <Navbar />

            {/* --- HERO SECTION WITH GRID MOTION --- */}
            <div className="relative h-[50vh] md:h-[60vh] overflow-hidden bg-[#640D5F] flex items-center justify-center rounded-b-[40px] shadow-2xl">
                {/* Grid Motion Background */}
                <div className="absolute inset-0 opacity-70 grid grid-cols-4 md:grid-cols-6 gap-4 rotate-12 scale-125">
                    {[...Array(24)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: i % 2 === 0 ? 0 : -100 }}
                            animate={{ y: i % 2 === 0 ? -100 : 0 }}
                            transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
                            className="h-40 md:h-64 w-full bg-cover bg-center rounded-2xl"
                            style={{ backgroundImage: `url(${heroImages[i % heroImages.length]})` }}
                        />
                    ))}
                </div>
                {/* --- HERO SECTION --- */}
                <div className="relative h-[50vh] w-full md:h-[60vh] rounded-b-[40px] bg-transparent">
                    <div className="absolute inset-0 bg-none" />

                    {/* Hero Content */}
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
                                    animate={{
                                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                    }}
                                    transition={{
                                        duration: 6,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                    className="
                        text-transparent bg-clip-text
                        bg-[linear-gradient(90deg,#B12C00,#ff7ad9,#EB5B00,#B12C00)]
                        bg-[length:300%_300%]
                        drop-shadow-[0_0_20px_rgba(209,41,255,0.5)]
                    "
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

            {/* --- SEARCH & FILTER BAR (Floating Glassmorphism) --- */}
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
                            <button className="flex-1 lg:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-purple-200">
                                Filter
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
            <div className="max-w-6xl mx-auto px-4 py-16">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {servicesData.map((item) => (
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
                                    src={`https://picsum.photos/600/400?random=${item.id}`}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-purple-600 shadow-sm">
                                        {item.category}
                                    </span>
                                </div>
                            </div>

                            <div className="p-8">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-gray-500 text-sm mt-2 flex items-center gap-2">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-4 h-4 text-red-400"
                                    >
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
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-purple-600 transition-colors"
                                    >
                                        Details
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* --- PAGINATION --- */}
                <div className="flex justify-center items-center gap-3 mt-16">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                    >
                        ←
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-12 h-12 rounded-2xl font-bold transition-all ${currentPage === i + 1
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                                : "hover:bg-white border border-transparent hover:border-gray-200"
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                    >
                        →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Marketplace;