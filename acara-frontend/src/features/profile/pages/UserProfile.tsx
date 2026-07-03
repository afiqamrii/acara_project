import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/Api';
import { ME_QUERY_KEY } from '../../../hooks/useCurrentUser';

// ── Types ─────────────────────────────────────────────────────────────────────
type ProfileUser = {
    id: number; name: string; email: string;
    phone_number: string | null; role: string;
    avatar_url: string | null; profile_completed: boolean;
    email_verified_at: string | null; created_at: string;
};
type VendorProfile = {
    business_name: string; status: string;
    service_area_state: string | null; service_area_town: string | null;
};
type BookingStats = { total: number; pending: number; confirmed: number; };
type ProfileData = { user: ProfileUser; vendor_profile: VendorProfile | null; booking_stats: BookingStats; };

const fetchProfile = async (): Promise<ProfileData> => {
    const res = await api.get('/profile');
    return res.data;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function formatJoined(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}
function profileCompletion(user: ProfileUser) {
    let s = 0;
    if (user.name) s += 25;
    if (user.email_verified_at) s += 25;
    if (user.phone_number) s += 25;
    if (user.avatar_url) s += 25;
    return s;
}

function passwordStrength(pw: string): { score: number; label: string; color: string; textColor: string } {
    if (!pw) return { score: 0, label: '', color: '', textColor: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const map = [
        { label: 'Weak',        color: 'bg-red-400',      textColor: 'text-red-500' },
        { label: 'Fair',        color: 'bg-amber-400',    textColor: 'text-amber-500' },
        { label: 'Good',        color: 'bg-yellow-400',   textColor: 'text-yellow-600' },
        { label: 'Strong',      color: 'bg-emerald-400',  textColor: 'text-emerald-600' },
        { label: 'Very Strong', color: 'bg-emerald-500',  textColor: 'text-emerald-700' },
    ];
    return { score, ...map[score] };
}

const ROLE_LABELS: Record<string, string> = {
    customer: 'Customer', vendor: 'Vendor', admin: 'Admin', super_admin: 'Super Admin',
};
const VENDOR_STATUS_STYLES: Record<string, string> = {
    pending_verification: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

// ── SVG dot-grid texture overlay ──────────────────────────────────────────────
const DotGrid = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
);

// ── Icons ─────────────────────────────────────────────────────────────────────
const CheckIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
        <path d="M20 6L9 17l-5-5" />
    </svg>
);
const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

// ── Shared UI components ──────────────────────────────────────────────────────
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-[20px] border border-gray-100/80 shadow-[0_2px_16px_rgba(0,0,0,0.06)] ${className}`}>
        {children}
    </div>
);

const InputField = ({
    label, value, onChange, type = 'text', disabled = false, readOnly = false, hint, rightEl,
}: {
    label: string; value: string; onChange?: (v: string) => void;
    type?: string; disabled?: boolean; readOnly?: boolean;
    hint?: React.ReactNode; rightEl?: React.ReactNode;
}) => (
    <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-1.5">{label}</label>
        <div className="relative">
            <input
                type={type} value={value} readOnly={readOnly} disabled={disabled}
                onChange={e => onChange?.(e.target.value)}
                className={`w-full px-3.5 py-3 rounded-xl border text-sm font-medium transition-all outline-none
                    ${readOnly || disabled
                        ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-default'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 hover:border-gray-300'
                    } ${rightEl ? 'pr-11' : ''}`}
            />
            {rightEl && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                    {rightEl}
                </div>
            )}
        </div>
        {hint}
    </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const UserProfile = () => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, isPending } = useQuery({
        queryKey: ['profile'], queryFn: fetchProfile, staleTime: 1000 * 60,
    });

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [infoName, setInfoName]   = useState('');
    const [infoPhone, setInfoPhone] = useState('');
    const [infoInit, setInfoInit]   = useState(false);
    const [curPw, setCurPw]         = useState('');
    const [newPw, setNewPw]         = useState('');
    const [confPw, setConfPw]       = useState('');
    const [showCur, setShowCur]     = useState(false);
    const [showNew, setShowNew]     = useState(false);
    const [showConf, setShowConf]   = useState(false);
    const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
    const [infoError, setInfoError]     = useState<string | null>(null);
    const [pwSuccess, setPwSuccess]     = useState<string | null>(null);
    const [pwError, setPwError]         = useState<Record<string, string>>({});
    const [avatarError, setAvatarError] = useState<string | null>(null);

    if (data && !infoInit) {
        setInfoName(data.user.name);
        setInfoPhone(data.user.phone_number ?? '');
        setInfoInit(true);
    }

    const infoMutation = useMutation({
        mutationFn: () => api.put('/profile', { name: infoName, phone_number: infoPhone }),
        onSuccess: (res) => {
            localStorage.setItem('user_name', res.data.user.name);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
            setInfoSuccess('Profile updated successfully.');
            setInfoError(null);
            setTimeout(() => setInfoSuccess(null), 3000);
        },
        onError: (err: any) => setInfoError(err?.response?.data?.message ?? 'Failed to save.'),
    });

    const avatarMutation = useMutation({
        mutationFn: (file: File) => {
            const form = new FormData();
            form.append('avatar', file);
            return api.post('/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
            setAvatarError(null);
        },
        onError: (err: any) => { setAvatarError(err?.response?.data?.message ?? 'Upload failed.'); setAvatarPreview(null); },
    });

    const pwMutation = useMutation({
        mutationFn: () => api.put('/profile/password', {
            current_password: curPw, password: newPw, password_confirmation: confPw,
        }),
        onSuccess: () => {
            setCurPw(''); setNewPw(''); setConfPw(''); setPwError({});
            setPwSuccess('Password changed successfully.');
            setTimeout(() => setPwSuccess(null), 3000);
        },
        onError: (err: any) => {
            const errs = err?.response?.data?.errors ?? {};
            setPwError(Object.keys(errs).length ? errs : { _general: err?.response?.data?.message ?? 'Failed.' });
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setAvatarError('Photo must be under 2 MB.'); return; }
        setAvatarError(null);
        setAvatarPreview(URL.createObjectURL(file));
        avatarMutation.mutate(file);
    };

    const pwStrength = passwordStrength(newPw);

    // ── Skeleton ──────────────────────────────────────────────────────────────
    if (isPending) return (
        <main className="flex-1 overflow-y-auto bg-[#f5f4fb] p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-3 pt-12 md:pt-0">
                <div className="h-72 rounded-[24px] bg-purple-100 animate-pulse" />
                <div className="h-20 rounded-[20px] bg-amber-50 animate-pulse" />
                <div className="grid grid-cols-4 gap-3">
                    {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-[20px] bg-gray-100 animate-pulse" />)}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                    <div className="h-96 rounded-[20px] bg-gray-100 animate-pulse" />
                    <div className="h-96 rounded-[20px] bg-gray-100 animate-pulse" />
                </div>
            </div>
        </main>
    );

    if (!data) return null;

    const { user, vendor_profile, booking_stats } = data;
    const initials      = getInitials(user.name);
    const displayAvatar = avatarPreview ?? user.avatar_url;
    const completion    = profileCompletion(user);

    return (
        <main className="flex-1 overflow-y-auto bg-[#f5f4fb] p-4 sm:p-5">
            <div className="max-w-4xl mx-auto space-y-3 pt-12 md:pt-0">

                {/* ══ HERO ══════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="rounded-[24px] overflow-hidden shadow-2xl shadow-purple-900/25"
                >
                    {/* Main gradient area */}
                    <div className="relative bg-gradient-to-br from-[#150535] via-[#2d0e6e] to-[#4c1d95]">
                        <DotGrid />

                        {/* Glow blobs */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-violet-600/25 blur-[60px]" />
                            <div className="absolute top-8 left-1/2 w-48 h-48 rounded-full bg-purple-500/15 blur-[50px]" />
                            <div className="absolute bottom-0 left-8 w-64 h-64 rounded-full bg-indigo-500/20 blur-[55px]" />
                        </div>

                        <div className="relative z-10 px-6 sm:px-8 pt-7 pb-6">
                            <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-7">

                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-[100px] h-[100px] sm:w-[112px] sm:h-[112px] rounded-2xl overflow-hidden cursor-pointer group shadow-2xl ring-2 ring-white/15"
                                    >
                                        {displayAvatar ? (
                                            <img src={displayAvatar} alt={user.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 flex items-center justify-center">
                                                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{initials}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-6 h-6">
                                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Camera badge */}
                                    <motion.button
                                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.92 }}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white shadow-lg border border-gray-100 flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinecap="round" className="w-3.5 h-3.5">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </motion.button>

                                    {avatarMutation.isPending && (
                                        <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                                </div>

                                {/* Identity block */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Welcome back</p>
                                    <h1 className="text-2xl sm:text-[28px] font-black text-white leading-tight tracking-tight mb-2.5">
                                        {user.name}
                                    </h1>

                                    {/* Badges row */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white backdrop-blur-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-yellow-300">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            {ROLE_LABELS[user.role] ?? user.role}
                                        </span>

                                        {user.email_verified_at && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                                                <CheckIcon className="w-3 h-3" /> Verified
                                            </span>
                                        )}

                                        {vendor_profile && (
                                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                                                vendor_profile.status === 'approved'
                                                    ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                                                    : 'bg-amber-500/20 border border-amber-400/30 text-amber-300'
                                            }`}>
                                                Vendor
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/45">
                                        <span className="flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                                            </svg>
                                            {user.email}
                                        </span>
                                        {user.phone_number && (
                                            <span className="flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2z" />
                                                </svg>
                                                {user.phone_number}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            Member since {formatJoined(user.created_at)}
                                        </span>
                                    </div>

                                    {avatarError && (
                                        <p className="mt-2 text-[11px] text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-1.5 inline-block">{avatarError}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats strip — inset at bottom of hero */}
                        <div className="relative z-10 mx-4 sm:mx-6 mb-4 rounded-xl bg-white/8 border border-white/10 backdrop-blur-md overflow-hidden">
                            <div className="grid grid-cols-3 divide-x divide-white/10">
                                {[
                                    {
                                        label: 'Bookings', value: booking_stats.total,
                                        icon: (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/60">
                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        label: 'Confirmed', value: booking_stats.confirmed,
                                        icon: (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/60">
                                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        label: 'Pending', value: booking_stats.pending,
                                        icon: (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/60">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        ),
                                    },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                                        {s.icon}
                                        <div>
                                            <p className="text-lg font-black text-white leading-none">{s.value}</p>
                                            <p className="text-[10px] text-white/50 mt-0.5 font-medium">{s.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Profile completion footer bar */}
                    <div className="bg-white px-6 sm:px-8 py-3 flex items-center gap-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2.5} className="w-3 h-3">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <span className="text-[11px] font-bold text-gray-500">Profile</span>
                        </div>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${completion}%` }}
                                transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                            />
                        </div>
                        <span className="text-[11px] font-black text-purple-600 shrink-0">{completion}%</span>
                        <span className="text-[11px] text-gray-400 shrink-0 hidden sm:block">
                            {completion < 100 ? `${4 - Math.round(completion / 25)} steps left` : 'Complete!'}
                        </span>
                    </div>
                </motion.div>

                {/* ══ OVERVIEW METRICS ═════════════════════════════════ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'Total Bookings', value: booking_stats.total,
                            sub: `${booking_stats.confirmed} confirmed`,
                            bg: 'bg-gradient-to-br from-violet-600 to-purple-700',
                            numCls: 'text-white', labelCls: 'text-violet-200', subCls: 'text-violet-300',
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-white/70">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                            ),
                        },
                        {
                            label: 'Confirmed', value: booking_stats.confirmed,
                            sub: 'completed',
                            bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
                            numCls: 'text-white', labelCls: 'text-emerald-100', subCls: 'text-emerald-200',
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-white/70">
                                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            ),
                        },
                        {
                            label: 'Pending', value: booking_stats.pending,
                            sub: 'awaiting vendor',
                            bg: 'bg-white',
                            numCls: 'text-amber-600', labelCls: 'text-gray-600', subCls: 'text-gray-400',
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-amber-400">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                            ),
                        },
                        {
                            label: 'Account',
                            value: user.email_verified_at ? 'Verified' : 'Unverified',
                            sub: ROLE_LABELS[user.role] ?? user.role,
                            bg: 'bg-white',
                            numCls: user.email_verified_at ? 'text-emerald-600' : 'text-amber-500',
                            labelCls: 'text-gray-600', subCls: 'text-gray-400',
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={`w-5 h-5 ${user.email_verified_at ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            ),
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.07 }}
                            whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        >
                            <div className={`${stat.bg} rounded-[20px] p-4 h-full border border-gray-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col justify-between gap-3 cursor-default`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg === 'bg-white' ? 'bg-gray-50 border border-gray-100' : 'bg-white/15'}`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className={`text-[22px] sm:text-2xl font-black leading-none ${stat.numCls}`}>{stat.value}</p>
                                    <p className={`text-[11px] font-bold mt-1 ${stat.labelCls}`}>{stat.label}</p>
                                    <p className={`text-[10px] capitalize mt-0.5 ${stat.subCls}`}>{stat.sub}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ══ FORMS ROW ════════════════════════════════════════ */}
                <div className="grid md:grid-cols-2 gap-3">

                    {/* Personal Information */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <Card className="p-5 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={1.8} className="w-4.5 h-4.5 w-[18px]">
                                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
                                        <p className="text-[11px] text-gray-400">Name and contact details</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${user.email_verified_at ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {user.email_verified_at ? 'Verified' : 'Unverified'}
                                </span>
                            </div>

                            <div className="space-y-3.5 flex-1">
                                <InputField label="Full Name" value={infoName} onChange={setInfoName} />
                                <InputField
                                    label="Email Address"
                                    value={user.email}
                                    readOnly
                                    hint={
                                        user.email_verified_at ? (
                                            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-1.5">
                                                <CheckIcon /> Email verified
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-amber-500 font-medium mt-1.5 block">Email not verified</span>
                                        )
                                    }
                                />
                                <InputField
                                    label="Phone Number"
                                    value={infoPhone}
                                    onChange={setInfoPhone}
                                    hint={<p className="text-[10px] text-gray-300 mt-1">e.g. +60 12-345 6789</p>}
                                />
                            </div>

                            <AnimatePresence>
                                {infoSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mt-4 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5 font-semibold"
                                    >
                                        <CheckIcon /> {infoSuccess}
                                    </motion.div>
                                )}
                                {infoError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mt-4 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5"
                                    >
                                        {infoError}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                onClick={() => { setInfoError(null); infoMutation.mutate(); }}
                                disabled={infoMutation.isPending || !infoName.trim()}
                                className="mt-4 w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-purple-200/80"
                            >
                                {infoMutation.isPending
                                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>
                                    : 'Save Changes'}
                            </motion.button>
                        </Card>
                    </motion.div>

                    {/* Account Security */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                        <Card className="p-5 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.8} className="w-[18px] h-[18px]">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">Account Security</h2>
                                    <p className="text-[11px] text-gray-400">Change your password</p>
                                </div>
                            </div>

                            {/* Security score bar */}
                            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80">
                                <div className="w-7 h-7 rounded-lg bg-white shadow-sm border border-indigo-100 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={2} className="w-3.5 h-3.5">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Security Score</span>
                                        <span className="text-[10px] font-black text-indigo-600">{user.email_verified_at ? '80' : '40'}/100</span>
                                    </div>
                                    <div className="h-1 bg-indigo-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: user.email_verified_at ? '80%' : '40%' }}
                                            transition={{ duration: 0.9, delay: 0.5 }}
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <div className={`w-1.5 h-1.5 rounded-full ${user.email_verified_at ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                                    <span className={`text-[10px] font-bold ${user.email_verified_at ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {user.email_verified_at ? 'Good' : 'Fair'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3.5 flex-1">
                                <InputField
                                    label="Current Password" value={curPw} onChange={setCurPw}
                                    type={showCur ? 'text' : 'password'}
                                    rightEl={<button type="button" onClick={() => setShowCur(v => !v)}><EyeIcon open={showCur} /></button>}
                                    hint={pwError.current_password && <p className="text-[11px] text-red-500 mt-1">{pwError.current_password[0]}</p>}
                                />
                                <div>
                                    <InputField
                                        label="New Password" value={newPw} onChange={setNewPw}
                                        type={showNew ? 'text' : 'password'}
                                        rightEl={<button type="button" onClick={() => setShowNew(v => !v)}><EyeIcon open={showNew} /></button>}
                                    />
                                    <AnimatePresence>
                                        {newPw && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                className="mt-2 space-y-1 overflow-hidden"
                                            >
                                                <div className="flex gap-1">
                                                    {[0,1,2,3].map(i => (
                                                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-400 ${i < pwStrength.score ? pwStrength.color : 'bg-gray-100'}`} />
                                                    ))}
                                                </div>
                                                <p className={`text-[10px] font-bold ${pwStrength.textColor}`}>
                                                    {pwStrength.label} <span className="text-gray-400 font-normal">strength</span>
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <InputField
                                    label="Confirm New Password" value={confPw} onChange={setConfPw}
                                    type={showConf ? 'text' : 'password'}
                                    rightEl={<button type="button" onClick={() => setShowConf(v => !v)}><EyeIcon open={showConf} /></button>}
                                    hint={confPw && confPw !== newPw && <p className="text-[11px] text-red-500 mt-1">Passwords don't match</p>}
                                />
                            </div>

                            <AnimatePresence>
                                {pwSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mt-4 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5 font-semibold"
                                    >
                                        <CheckIcon /> {pwSuccess}
                                    </motion.div>
                                )}
                                {pwError._general && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mt-4 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5"
                                    >
                                        {pwError._general}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                onClick={() => { setPwError({}); pwMutation.mutate(); }}
                                disabled={pwMutation.isPending || !curPw || !newPw || newPw !== confPw}
                                className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-200/80"
                            >
                                {pwMutation.isPending
                                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</span>
                                    : 'Update Password'}
                            </motion.button>
                        </Card>
                    </motion.div>
                </div>

                {/* ══ BOTTOM ROW: Checklist + Vendor ═══════════════════ */}
                <div className={`grid gap-3 ${vendor_profile ? 'md:grid-cols-2' : 'grid-cols-1'}`}>

                    {/* Account Checklist */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                        <Card className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={1.8} className="w-[18px] h-[18px]">
                                        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-sm font-bold text-gray-900">Account Checklist</h2>
                                    <p className="text-[11px] text-gray-400">{completion}% complete</p>
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                                    completion === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                    {completion === 100 ? 'All done!' : `${4 - Math.round(completion / 25)} remaining`}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { label: 'Set your full name',   done: !!user.name,               desc: 'Display name on your account' },
                                    { label: 'Verify email address', done: !!user.email_verified_at,  desc: 'Confirm your email for security' },
                                    { label: 'Add phone number',     done: !!user.phone_number,        desc: 'For account recovery' },
                                    { label: 'Upload profile photo', done: !!user.avatar_url,          desc: 'Personalise your profile' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + i * 0.05 }}
                                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${
                                            item.done
                                                ? 'bg-emerald-50/60 border-emerald-100'
                                                : 'bg-gray-50/80 border-gray-100 opacity-70'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                            {item.done
                                                ? <CheckIcon className="w-3 h-3 text-white" />
                                                : <span className="w-1.5 h-1.5 rounded-full bg-gray-400 block" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[12px] font-semibold leading-tight ${item.done ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-gray-600'}`}>
                                                {item.label}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Vendor Profile */}
                    {vendor_profile && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                            <Card className="p-5 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={1.8} className="w-[18px] h-[18px]">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-sm font-bold text-gray-900">Vendor Profile</h2>
                                        <p className="text-[11px] text-gray-400">Business details</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize ${VENDOR_STATUS_STYLES[vendor_profile.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {vendor_profile.status.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Business Name</p>
                                        <p className="text-sm font-bold text-purple-800">{vendor_profile.business_name}</p>
                                    </div>
                                    {(vendor_profile.service_area_town || vendor_profile.service_area_state) && (
                                        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2} className="w-4 h-4 shrink-0 mt-0.5">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                            </svg>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Service Area</p>
                                                <p className="text-xs font-semibold text-gray-700 mt-0.5">
                                                    {[vendor_profile.service_area_town, vendor_profile.service_area_state].filter(Boolean).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {vendor_profile.status === 'pending_verification' && (
                                        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-100">
                                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                            <div>
                                                <p className="text-[11px] font-bold text-amber-700">Under Review</p>
                                                <p className="text-[10px] text-amber-500 mt-0.5">Verification takes 1–3 business days</p>
                                            </div>
                                        </div>
                                    )}
                                    {vendor_profile.status === 'approved' && (
                                        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                            <div>
                                                <p className="text-[11px] font-bold text-emerald-700">Approved &amp; Active</p>
                                                <p className="text-[10px] text-emerald-500 mt-0.5">Your business is visible to customers</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>

            </div>
        </main>
    );
};

export default UserProfile;
