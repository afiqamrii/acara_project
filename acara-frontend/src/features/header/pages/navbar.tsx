import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  BriefcaseBusiness,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { performLogout } from '../../../lib/auth';
import { LogoutConfirmationModal } from '../../../components/common/LogoutConfirmationModal';
import CartDrawer from './cartdrawer';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') ?? '');

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('user_name');
  const role = localStorage.getItem('role') || 'user';
  const canUseCart = Boolean(token && ['user', 'vendor'].includes(role));

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

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/?search=${encodeURIComponent(query)}#services` : '/#services');
    setMobileOpen(false);
  };

  const goTo = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-[0_4px_18px_rgba(36,28,58,0.05)]">
        <div className="hidden bg-[#251d31] text-slate-300 lg:block">
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-10 text-[11px] font-medium">
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

        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center gap-4 px-5 sm:px-8 lg:px-10">
          <button
            onClick={() => goTo('/')}
            className="group flex shrink-0 items-center gap-2"
            aria-label="Acara home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#65478d] text-lg font-black text-white shadow-sm transition group-hover:bg-[#543875]">
              A
            </span>
            <span className="hidden text-2xl font-black tracking-[-0.04em] text-[#261e31] sm:block">
              acara<span className="text-[#76539f]">.</span>
            </span>
          </button>

          <form onSubmit={submitSearch} className="mx-auto hidden max-w-2xl flex-1 md:flex">
            <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#8062ad] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#8062ad]/10">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="sr-only">Search services</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search venues, catering, photography…"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button type="submit" className="rounded-lg bg-[#2a2139] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#65478d]">
                Search
              </button>
            </label>
          </form>

          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <button
              onClick={() => goTo('/#services')}
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#62458f]"
            >
              Browse
            </button>

            {token ? (
              <>
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
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[#8062ad]/40 hover:bg-[#f7f3fa] hover:text-[#62458f]"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#62458f]" aria-hidden="true" />
                  <span>Dashboard</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#efe8f6] text-xs font-black uppercase text-[#62458f]" aria-hidden="true">
                    {(userName || 'U').charAt(0)}
                  </span>
                </button>
                <button
                  onClick={() => setLogoutConfirmationOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
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
                  className="rounded-xl bg-[#65478d] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#543875]"
                >
                  Create account
                </button>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 lg:hidden">
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

        <form onSubmit={submitSearch} className="border-t border-slate-100 px-5 pb-3 pt-2 md:hidden">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="sr-only">Search services</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event services…"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            />
          </label>
        </form>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white p-4 shadow-xl lg:hidden">
            <div className="mx-auto max-w-7xl space-y-1">
              <button onClick={() => goTo('/#services')} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Search className="h-4 w-4 text-[#62458f]" />
                Browse services
              </button>
              <button onClick={() => goTo('/register')} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <BriefcaseBusiness className="h-4 w-4 text-[#62458f]" />
                List your service
              </button>
              <button onClick={() => goTo('/contact')} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                <HelpCircle className="h-4 w-4 text-[#62458f]" />
                Help & support
              </button>
              <div className="my-2 border-t border-slate-100" />
              {token ? (
                <>
                  <button onClick={() => goTo(getDashboardPath())} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <LayoutDashboard className="h-4 w-4 text-[#62458f]" />
                    Go to dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setLogoutConfirmationOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-2">
                  <button onClick={() => goTo('/login')} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                    <UserRound className="h-4 w-4" />
                    Log in
                  </button>
                  <button onClick={() => goTo('/register')} className="rounded-xl bg-[#65478d] px-4 py-3 text-sm font-bold text-white">
                    Join Acara
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {canUseCart && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
      <LogoutConfirmationModal
        isOpen={logoutConfirmationOpen}
        onCancel={() => setLogoutConfirmationOpen(false)}
        onConfirm={() => performLogout()}
      />
    </>
  );
};

export default Navbar;
