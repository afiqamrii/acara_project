import { Link } from 'react-router-dom';
import { BadgeCheck, Mail, ShieldCheck } from 'lucide-react';

const Footer = () => (
    <footer className="bg-[#211a2b] text-left text-slate-300">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
            <div className="grid gap-10 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr_1fr]">
                <div>
                    <Link to="/" className="inline-flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#76539f] text-lg font-black text-white">A</span>
                        <span className="text-2xl font-black tracking-[-0.04em] text-white">acara<span className="text-[#a988cf]">.</span></span>
                    </Link>
                    <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                        A trusted marketplace for discovering and booking professional event services across Malaysia.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Approved providers</span>
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Secure booking flow</span>
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-extrabold text-white">Marketplace</h2>
                    <nav className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
                        <Link to="/#services" className="transition hover:text-white">Browse services</Link>
                        <Link to="/?search=venue#services" className="transition hover:text-white">Venues</Link>
                        <Link to="/?search=catering#services" className="transition hover:text-white">Catering</Link>
                        <Link to="/?search=photography#services" className="transition hover:text-white">Photography</Link>
                    </nav>
                </div>

                <div>
                    <h2 className="text-sm font-extrabold text-white">For business</h2>
                    <nav className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
                        <Link to="/register" className="transition hover:text-white">Become a vendor</Link>
                        <Link to="/login" className="transition hover:text-white">Vendor login</Link>
                        <Link to="/about" className="transition hover:text-white">How Acara works</Link>
                        <Link to="/contact" className="transition hover:text-white">Contact support</Link>
                    </nav>
                </div>

                <div>
                    <h2 className="text-sm font-extrabold text-white">Need help planning?</h2>
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        Sign in to manage enquiries, booking requests and vendor conversations in one place.
                    </p>
                    <Link
                        to="/contact"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                        <Mail className="h-4 w-4" />
                        Contact support
                    </Link>
                </div>
            </div>

            <div className="flex flex-col gap-3 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>&copy; {new Date().getFullYear()} Acara. All rights reserved.</p>
                <div className="flex gap-5">
                    <Link to="/privacy-policy" className="transition hover:text-slate-300">Privacy</Link>
                    <Link to="/terms-of-service" className="transition hover:text-slate-300">Terms</Link>
                    <Link to="/contact" className="transition hover:text-slate-300">Support</Link>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
