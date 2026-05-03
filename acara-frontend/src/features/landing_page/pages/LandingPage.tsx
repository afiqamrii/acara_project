import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import Navbar from "../../header/pages/navbar";
import Footer from "../../../components/common/Footer";

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        AOS.init({ duration: 800, once: true });
    }, []);

    const handleGetStarted = () => {
        const token = localStorage.getItem('token');
        if (token) {
            const role = localStorage.getItem('role') || 'user';
            if (role === 'admin' || role === 'super_admin') navigate('/admin/dashboard');
            else if (role === 'vendor') navigate('/marketplace');
            else if (role === 'crew') navigate('/crew/jobs');
            else navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#FCFBFF] text-gray-900 overflow-x-hidden relative text-left selection:bg-purple-200 font-sans">
            <Navbar />

            {/* Hero Section */}
            <section className="relative min-h-[100vh] w-full overflow-hidden flex items-center justify-center pt-24 pb-12">
                {/* Background Elements */}
                <div className="absolute inset-0 z-0">
                    {/* Event Background Image Overlay with Gradient Mask */}
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-[0.04] mix-blend-multiply grayscale"
                        style={{ 
                            backgroundImage: `url('https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=2070&auto=format&fit=crop')`,
                            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                        }}
                    />

                    {/* Decorative abstract mesh gradients */}
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-pink-400/20 to-purple-400/20 rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
                </div>

                <div
                    className="relative z-20 text-center max-w-6xl px-4 sm:px-6 flex flex-col items-center"
                >
                    {/* Premium Badge */}
                    <div 
                        className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/60 border border-purple-100/50 shadow-sm backdrop-blur-md"
                        data-aos="fade-down"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                        </span>
                        <span className="text-xs font-bold tracking-widest text-purple-700 uppercase">
                            The Future of Event Planning
                        </span>
                    </div>

                    {/* Main Headline */}
                    <h1 
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-gray-900 leading-[1.1] mb-6 drop-shadow-sm"
                        data-aos="fade-up"
                        data-aos-delay="100"
                    >
                        Craft Your <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600">
                            Perfect Event
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p 
                        className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed font-light"
                        data-aos="fade-up"
                        data-aos-delay="200"
                    >
                        Stop juggling multiple tabs and endless spreadsheets. <strong className="font-semibold text-gray-800">Acara</strong> is your all-in-one platform to discover venues, book catering, and hire crews securely.
                    </p>

                    {/* CTA Buttons */}
                    <div 
                        className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full"
                        data-aos="fade-up"
                        data-aos-delay="300"
                    >
                        <button
                            onClick={handleGetStarted}
                            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white transition-all duration-300 bg-gray-900 rounded-full hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-900/20 hover:-translate-y-1 overflow-hidden w-full sm:w-auto"
                        >
                            <span className="relative flex items-center gap-2">
                                Get Started Free
                                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="group inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-gray-700 transition-all duration-300 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full hover:bg-white hover:border-gray-300 hover:shadow-md w-full sm:w-auto"
                        >
                            <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            See How It Works
                        </button>
                    </div>

                    {/* Social Proof / Small avatars */}
                    <div className="mt-12 flex flex-col items-center gap-3 opacity-80" data-aos="fade-in" data-aos-delay="500">
                        <div className="flex -space-x-3">
                            <img className="w-10 h-10 rounded-full border-2 border-[#FCFBFF] object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="User" />
                            <img className="w-10 h-10 rounded-full border-2 border-[#FCFBFF] object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80" alt="User" />
                            <img className="w-10 h-10 rounded-full border-2 border-[#FCFBFF] object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="User" />
                            <img className="w-10 h-10 rounded-full border-2 border-[#FCFBFF] object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="User" />
                            <div className="w-10 h-10 rounded-full border-2 border-[#FCFBFF] bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                +2k
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Trusted by 2,000+ event planners & vendors</p>
                    </div>
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
            <section id="how-it-works" className="relative py-32 bg-gray-50">
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

            {/* Register a Service Section */}
            <section className="relative py-24 bg-white overflow-hidden">
                <div className="container mx-auto px-12">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="w-full md:w-1/2" data-aos="fade-right">
                            <span className="text-[#6C5CE7] font-semibold tracking-wider uppercase text-sm">For Professionals</span>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
                                Grow Your Business with Acara
                            </h2>
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                Join our network of top-tier service providers. Showcase your services, connect with clients, and manage bookings effortlessly.
                            </p>
                            <button
                                onClick={() => {
                                    const token = localStorage.getItem('token');
                                    if (token) {
                                        navigate('/service/register');
                                    } else {
                                        navigate('/register');
                                    }
                                }}
                                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-gray-900 rounded-full hover:bg-gray-800 shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                            >
                                Register Your Service
                            </button>
                        </div>
                        <div className="w-full md:w-1/2 relative" data-aos="fade-left">
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                                <img
                                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2070&auto=format&fit=crop"
                                    alt="Event Planning Team"
                                    className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default LandingPage;
