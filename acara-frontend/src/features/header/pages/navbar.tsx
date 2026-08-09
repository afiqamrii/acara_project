import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  BriefcaseBusiness,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Search,
  ShoppingBag,
  Bell,
  UserRound,
  X,
  Receipt,
  Settings,
  Star,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchUnreadNotificationCount } from '../../notifications/api';
import NotificationPopover from '../../notifications/components/NotificationPopover';
import CartDrawer from './cartdrawer';

const dashboardShortcuts = [
  { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'bookings', label: 'View Bookings', path: '/bookings', icon: Receipt },
  { id: 'security', label: 'Account Security', path: '/settings', icon: ShieldCheck },
  { id: 'personal-info', label: 'Personal Information', path: '/profile', icon: UserRound },
  { id: 'settings', label: 'General Settings', path: '/settings', icon: Settings },
  { id: 'notification-settings', label: 'Notification Settings', path: '/settings/notifications', icon: Bell },
  { id: 'reviews', label: 'My Reviews', path: '/reviews', icon: Star },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('user_name');
  const role = localStorage.getItem('role') || 'user';
  const canUseCart = Boolean(token && ['user', 'vendor'].includes(role));
  const isMarketplaceRoute = location.pathname === '/' || location.pathname.startsWith('/marketplace');
  const isLandingPage = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  const { data: notificationCountData } = useQuery({
    queryKey: ["notification-unread-count"],
    queryFn: fetchUnreadNotificationCount,
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: !!token,
  });
  const unreadCount = notificationCountData?.unread_count ?? 0;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 550);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isMarketplacePage = location.pathname === '/marketplace' || location.pathname === '/marketplace/';
  const showSearchBar = (!isLandingPage && !isMarketplacePage) || scrolled;

  useEffect(() => {
    const syncSearch = window.setTimeout(
      () => setSearch(new URLSearchParams(location.search).get('search') ?? ''),
      0,
    );
    return () => window.clearTimeout(syncSearch);
  }, [location.search]);

  useEffect(() => {
    const closeMenu = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', closeMenu);
    return () => window.removeEventListener('resize', closeMenu);
  }, []);

  const getDashboardPath = () => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return '/admin/dashboard';
      case 'vendor':
        return '/vendor/dashboard';
      case 'crew':
        return '/crew/jobs';
      default:
        return '/dashboard';
    }
  };

  const filteredShortcuts = search.trim()
    ? dashboardShortcuts.filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
    : dashboardShortcuts;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isMarketplaceRoute) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < filteredShortcuts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredShortcuts.length) {
        e.preventDefault();
        const shortcut = filteredShortcuts[activeSuggestionIndex];
        goTo(shortcut.path, { pickedLabel: shortcut.label });
        setSearch('');
        setIsFocused(false);
      }
    }
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    
    if (isMarketplaceRoute) {
      navigate(query ? `/?search=${encodeURIComponent(query)}#services` : '/#services');
      setMobileOpen(false);
    }
  };

  const goTo = (path: string, state?: any) => {
    navigate(path, { state });
    setMobileOpen(false);
  };

  const locationState = location.state as { pickedLabel?: string } | null;
  const getPlaceholder = () => {
    if (isMarketplaceRoute) return "Search venues, catering, photography…";
    if (locationState?.pickedLabel) return `Search in ${locationState.pickedLabel}...`;
    if (location.pathname.includes('/settings')) return "Search in Settings...";
    if (location.pathname.includes('/profile')) return "Search in Profile...";
    if (location.pathname.includes('/bookings')) return "Search your Bookings...";
    return "Search settings, bookings, etc...";
  };
  const currentPlaceholder = getPlaceholder();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-[0_4px_18px_rgba(36,28,58,0.05)]">
        <div className="hidden bg-[#251d31] text-slate-300 lg:block">
          <div className="mx-auto flex h-8 max-w-[1536px] items-center justify-between w-[90%] lg:w-[80%] text-[11px] font-medium">
            <div className="flex items-center gap-5">
              <button onClick={() => goTo('/register')} className="flex items-center gap-1.5 transition hover:text-white">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                List your event service
              </button>
              <button onClick={() => goTo('/contact')} className="flex items-center gap-1.5 transition hover:text-white">
                <HelpCircle className="h-3.5 w-3.5" />
                Help & support
              </button>
            </div>
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
              Malaysia&apos;s verified event service marketplace
            </span>
          </div>
        </div>

        <div className="mx-auto flex min-h-[72px] max-w-[1536px] items-center gap-4 w-[90%] lg:w-[80%]">
          <button onClick={() => goTo('/')} className="group flex shrink-0 items-center gap-2" aria-label="Acara home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6f52a3] text-lg font-black text-white shadow-sm transition group-hover:bg-[#4b3480]">
              A
            </span>
            <span className="hidden text-2xl font-black tracking-[-0.04em] text-[#261e31] sm:block">
              acara<span className="text-[#6f52a3]">.</span>
            </span>
          </button>

          <AnimatePresence mode="wait">
            {showSearchBar ? (
              <motion.form
                key="search-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={submitSearch}
                className="mx-auto hidden max-w-2xl flex-1 md:flex relative"
              >
                <label className={`flex h-11 w-full items-center gap-3 rounded-xl border px-4 transition ${isFocused ? 'border-[#6f52a3] bg-white ring-2 ring-[#6f52a3]/10' : 'border-slate-200 bg-slate-50'}`}>
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="sr-only">Search services</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={currentPlaceholder}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  {isMarketplaceRoute && (
                    <button type="submit" className="rounded-lg bg-[#251d31] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#6f52a3]">
                      Search
                    </button>
                  )}
                </label>
                
                <AnimatePresence>
                  {!isMarketplaceRoute && isFocused && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
                    >
                      {filteredShortcuts.length > 0 ? (
                        <ul className="py-2">
                          {filteredShortcuts.map((shortcut, idx) => {
                            const Icon = shortcut.icon;
                            return (
                              <li key={shortcut.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    goTo(shortcut.path, { pickedLabel: shortcut.label });
                                    setSearch('');
                                    setIsFocused(false);
                                  }}
                                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                                    idx === activeSuggestionIndex ? 'bg-[#f3eef8] text-[#6f52a3]' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                  onMouseEnter={() => setActiveSuggestionIndex(idx)}
                                >
                                  <Icon className={`h-4 w-4 ${idx === activeSuggestionIndex ? 'text-[#6f52a3]' : 'text-slate-400'}`} />
                                  <span className="flex-1 font-semibold">{shortcut.label}</span>
                                  <ChevronRight className="h-4 w-4 text-slate-300" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">
                          No matching sections found
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            ) : (
              <div className="mx-auto hidden max-w-2xl flex-1 md:flex" aria-hidden="true" />
            )}
          </AnimatePresence>

          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <button
              onClick={() => goTo('/#services')}
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#62458f]"
            >
              Browse
            </button>

            {token ? (
              <>
                <div className="relative flex items-center justify-center">
                  <button
                    onClick={() => setNotificationsOpen((prev) => !prev)}
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-[#f1ecf8] hover:text-[#62458f]"
                    aria-label="View notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                  </button>
                  <NotificationPopover isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
                </div>
                {canUseCart && (
                  <button
                    onClick={() => setCartOpen(true)}
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-[#f1ecf8] hover:text-[#62458f]"
                    aria-label="Open booking cart"
                  >
                    <ShoppingBag className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => goTo(getDashboardPath())}
                  aria-label={`Open dashboard for ${userName || 'your account'}`}
                  className="flex items-center gap-2 rounded-xl border border-[#e4d9f5] bg-[#f7f4fc] px-3 py-2 text-sm font-bold text-[#6f52a3] transition hover:border-[#6f52a3] hover:bg-[#f0eaf8]"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#6f52a3]" aria-hidden="true" />
                  <span>Dashboard</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6f52a3] to-[#4b3480] text-xs font-black uppercase text-white" aria-hidden="true">
                    {(userName || 'U').charAt(0)}
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => goTo('/login')}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Log in
                </button>
                <button
                  onClick={() => goTo('/register')}
                  className="rounded-xl bg-[#6f52a3] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#4b3480]"
                >
                  Create account
                </button>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 lg:hidden">
            {token && (
              <div className="relative flex items-center justify-center">
                <button
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>
                <NotificationPopover isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
              </div>
            )}
            {canUseCart && (
              <button
                onClick={() => setCartOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
                aria-label="Open booking cart"
              >
                <ShoppingBag className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSearchBar && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={submitSearch}
              className="overflow-hidden border-t border-slate-100 bg-white md:hidden relative"
            >
              <div className="px-5 pb-3 pt-2 relative z-20 bg-white">
                <label className={`flex h-11 items-center gap-3 rounded-xl border px-3 transition ${isFocused ? 'border-[#6f52a3] bg-white ring-2 ring-[#6f52a3]/10' : 'border-slate-200 bg-slate-50'}`}>
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="sr-only">Search services</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={currentPlaceholder}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  {isMarketplaceRoute && (
                    <button type="submit" className="rounded-lg bg-[#251d31] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#6f52a3]">
                      Search
                    </button>
                  )}
                </label>
              </div>

              <AnimatePresence>
                  {!isMarketplaceRoute && isFocused && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white border-t border-slate-100 z-10"
                    >
                      {filteredShortcuts.length > 0 ? (
                        <ul className="py-2">
                          {filteredShortcuts.map((shortcut, idx) => {
                            const Icon = shortcut.icon;
                            return (
                              <li key={shortcut.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    goTo(shortcut.path, { pickedLabel: shortcut.label });
                                    setSearch('');
                                    setIsFocused(false);
                                  }}
                                  className={`flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition ${
                                    idx === activeSuggestionIndex ? 'bg-[#f3eef8] text-[#6f52a3]' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <Icon className={`h-4 w-4 ${idx === activeSuggestionIndex ? 'text-[#6f52a3]' : 'text-slate-400'}`} />
                                  <span className="flex-1 font-semibold">{shortcut.label}</span>
                                  <ChevronRight className="h-4 w-4 text-slate-300" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="px-5 py-6 text-center text-sm text-slate-500">
                          No matching sections found
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
            </motion.form>
          )}
        </AnimatePresence>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white p-4 shadow-xl lg:hidden">
            <div className="mx-auto max-w-[1536px] space-y-1">
              <button onClick={() => goTo('/#services')} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Search className="h-4 w-4 text-[#6f52a3]" />
                Browse services
              </button>
              <button onClick={() => goTo('/register')} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <BriefcaseBusiness className="h-4 w-4 text-[#6f52a3]" />
                List your service
              </button>
              <button onClick={() => goTo('/contact')} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <HelpCircle className="h-4 w-4 text-[#6f52a3]" />
                Help & support
              </button>
              <div className="my-2 border-t border-slate-100" />
              {token ? (
                <>
                  <button onClick={() => goTo(getDashboardPath())} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <LayoutDashboard className="h-4 w-4 text-[#6f52a3]" />
                    Go to dashboard
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-2">
                  <button onClick={() => goTo('/login')} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                    <UserRound className="h-4 w-4" />
                    Log in
                  </button>
                  <button onClick={() => goTo('/register')} className="rounded-xl bg-[#6f52a3] px-4 py-3 text-sm font-bold text-white">
                    Join Acara
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {canUseCart && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
    </>
  );
};

export default Navbar;
