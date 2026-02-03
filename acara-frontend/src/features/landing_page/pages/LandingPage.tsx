import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import Navbar from "../../header/pages/navbar";
import audienceBg from "../../../img/audience.jpg";

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        AOS.init({ duration: 800, once: true });
    }, []);

    return (
        <div className="min-h-screen w-full bg-gray-50 text-gray-900 overflow-x-hidden relative text-left font-sans selection:bg-purple-200">
            <Navbar />

            {/* Hero Section */}
            <section className="relative min-h-[100vh] w-full overflow-hidden flex items-center justify-center pt-20">
                {/* Background Elements - Matching Login Page Gradient Vibe */}
                <div className="absolute inset-0 bg-white/40 z-0"></div>

                {/* Decorative background blobs matching Login page style */}
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Event Background Image Overlay */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.03] mix-blend-multiply pointer-events-none z-0 grayscale"
                    style={{ backgroundImage: `url(${audienceBg})` }}
                />

                <div
                    className="relative z-20 text-center max-w-5xl px-6 flex flex-col items-center"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <span className="inline-block px-4 py-1 mb-6 text-xs font-bold tracking-widest text-purple-600 uppercase bg-purple-50 rounded-full border border-purple-100">
                        The Future of Event Planning
                    </span>

                    <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-gray-900 leading-tight">
                        Welcome to <span className="text-[#7E57C2]">Acara</span>
                    </h1>

                    <h1 className="text-5xl md:text-7xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#7E57C2] to-pink-500 drop-shadow-sm my-2 tracking-tight">
                        Plan Your Perfect
                    </h1>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-700 mt-2">
                        Malaysian Event
                    </h1>

                    <div className="w-24 h-1.5 bg-gradient-to-r from-pink-500 to-[#7E57C2] rounded-full my-8 opactiy-80"></div>

                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                        <strong>Stop juggling ten different vendors.</strong>
                        <br />
                        ACARA is the all-in-one platform to find venues, book catering,
                        and hire crew securely.
                    </p>

                    <button
                        onClick={() => navigate('/login')}
                        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-[#7E57C2] font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-[#6C4AB8] shadow-lg hover:shadow-purple-500/30 hover:-translate-y-1"
                    >
                        Find Vendors Now
                        <svg className="w-5 h-5 ml-2 transition-transform duration-200 group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative py-24 bg-white z-10">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap justify-center -mx-4">
                        {[
                            { number: "500+", label: "Curated Venues" },
                            { number: "100+", label: "Verified Crews" },
                            { number: "4.9/5", label: "Customer Satisfaction" }
                        ].map((stat, index) => (
                            <div key={index} className="w-full md:w-1/3 px-4 mb-8 md:mb-0" data-aos="fade-up" data-aos-delay={100 * (index + 1)}>
                                <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100/50 shadow-sm hover:shadow-md transition-shadow duration-300 text-center group">
                                    <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#7E57C2] to-pink-500 mb-2 group-hover:scale-105 transition-transform duration-300">
                                        {stat.number}
                                    </h2>
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-[2px]">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="relative py-32 bg-gray-50">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

                <div className="container mx-auto px-4">
                    <div className="text-center mb-20">
                        <span className="text-[#6C5CE7] font-semibold tracking-wider uppercase text-sm">Simple Process</span>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6" data-aos="fade-up">
                            How It Works
                        </h2>
                        <div className="w-16 h-1 bg-[#6C5CE7] mx-auto rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: "fa-search", title: "1. Discover", desc: "Browse our marketplace of curated vendors for every type of event." },
                            { icon: "fa-comments", title: "2. Connect", desc: "Chat with vendors, get quotes, and manage your bookings all in one place." },
                            { icon: "fa-calendar-check", title: "3. Book", desc: "Securely book your chosen vendor and start planning your event." }
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="relative group bg-white p-10 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-purple-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(108,92,231,0.1)]"
                                data-aos="fade-up"
                                data-aos-delay={100 * (index + 1)}
                            >
                                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#6C5CE7] flex items-center justify-center text-2xl mb-6 group-hover:bg-[#6C5CE7] group-hover:text-white transition-colors duration-300 shadow-sm group-hover:shadow-purple-200">
                                    <i className={`fas ${item.icon}`}></i>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-gray-900">{item.title}</h3>
                                <p className="text-gray-500 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;