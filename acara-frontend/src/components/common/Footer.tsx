import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-gray-900 pt-20 pb-10 border-t border-gray-800">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand Section */}
                    <div className="col-span-1 lg:col-span-1">
                        <Link to="/" className="inline-block mb-6">
                            <span className="text-3xl font-black tracking-tight text-white">
                                Acara<span className="text-purple-500">.</span>
                            </span>
                        </Link>
                        <p className="text-gray-400 leading-relaxed mb-6">
                            The ultimate all-in-one platform to discover premium venues, book exquisite catering, and hire professional event crews securely in Malaysia.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-purple-600 hover:text-white transition-all duration-300">
                                <i className="fab fa-twitter"></i>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-purple-600 hover:text-white transition-all duration-300">
                                <i className="fab fa-instagram"></i>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-purple-600 hover:text-white transition-all duration-300">
                                <i className="fab fa-facebook-f"></i>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-purple-600 hover:text-white transition-all duration-300">
                                <i className="fab fa-linkedin-in"></i>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-lg tracking-wide">Platform</h4>
                        <ul className="space-y-4">
                            <li><Link to="/marketplace" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Browse Vendors</Link></li>
                            <li><Link to="/crew/jobs" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Hire Crew</Link></li>
                            <li><Link to="/service/register" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Register as Vendor</Link></li>
                            <li><Link to="/about" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">How It Works</Link></li>
                            <li><Link to="/login" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Log In</Link></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-lg tracking-wide">Categories</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Venues & Spaces</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Catering & Food</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Photography & Video</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Event Decorators</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">Entertainment</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-lg tracking-wide">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <i className="fas fa-map-marker-alt text-purple-500 mt-1"></i>
                                <span className="text-gray-400">123 Event Street, Kuala Lumpur, 50000, Malaysia</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <i className="fas fa-envelope text-purple-500"></i>
                                <span className="text-gray-400">support@acara.com</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <i className="fas fa-phone-alt text-purple-500"></i>
                                <span className="text-gray-400">+60 3 1234 5678</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} Acara Platform. All rights reserved.
                    </p>
                    <div className="flex space-x-6 text-sm">
                        <Link to="/privacy-policy" className="text-gray-500 hover:text-white transition-colors duration-200">Privacy Policy</Link>
                        <Link to="/terms-of-service" className="text-gray-500 hover:text-white transition-colors duration-200">Terms of Service</Link>
                        <Link to="/cookie-policy" className="text-gray-500 hover:text-white transition-colors duration-200">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
