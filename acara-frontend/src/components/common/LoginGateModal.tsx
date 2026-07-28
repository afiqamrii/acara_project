import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, X } from 'lucide-react';

type LoginGateModalProps = {
    open: boolean;
    onClose: () => void;
    serviceName?: string;
};

const LoginGateModal = ({ open, onClose, serviceName }: LoginGateModalProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = `${location.pathname}${location.search}`;

    useEffect(() => {
        if (!open) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-[#17111f]/60 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="login-gate-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-[24px] bg-white text-left shadow-2xl"
            >
                <div className="relative bg-[#292035] px-7 pb-7 pt-8 text-white">
                    <button
                        onClick={onClose}
                        aria-label="Close sign-in prompt"
                        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-violet-200 ring-1 ring-white/10">
                        <LockKeyhole className="h-6 w-6" />
                    </span>
                    <h2 id="login-gate-title" className="mt-5 text-2xl font-extrabold tracking-tight">
                        Sign in when you&apos;re ready to book
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                        Browsing service details is open to everyone. An account is only required to check dates, add a service to your cart, or contact a vendor.
                    </p>
                </div>

                <div className="px-7 py-6">
                    {serviceName && (
                        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Continue with</p>
                            <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-800">{serviceName}</p>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/login', { state: { returnTo } })}
                        autoFocus
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#65478d] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#543875] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65478d] focus-visible:ring-offset-2"
                    >
                        Log in to continue
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => navigate('/register', { state: { returnTo } })}
                        className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-[#8062ad]/40 hover:bg-[#f8f5fa]"
                    >
                        Create a free account
                    </button>
                    <button onClick={onClose} className="mt-4 w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600">
                        Keep browsing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginGateModal;
