import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import './navbar.css';
import { performLogout } from "../../../lib/auth";

const Navbar = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("user_name");
  const role = localStorage.getItem("role") || "user";

  const getDashboardPath = () => {
    switch (role) {
      case "admin":
      case "super_admin":
        return "/admin/dashboard";
      case "vendor":
        return "/marketplace";
      case "crew":
        return "/crew/jobs";
      default:
        return "/dashboard";
    }
  };

  const handleLogout = async () => {
    await performLogout();
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ── Shared link items ─────────────────────────────── */
  const navLinks = [
    { label: "How It Works", path: "/#how-it-works" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/85 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_4px_24px_-2px_rgba(0,0,0,0.06)] py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="relative max-w-7xl mx-auto px-6 flex items-center justify-between h-[52px]">
          {/* ── Logo ──────────────────────────── */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7E57C2] to-[#6C4AB8] shadow-md shadow-purple-200/50 transition-all duration-300">
              <span className="text-xs font-black tracking-tight text-white">
                AC
              </span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900 transition-colors duration-300">
              ACARA
            </span>
          </button>

          {/* ── Desktop Nav Links (Perfectly Centered) ── */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {navLinks.map(({ label, path }) => (
              <button
                key={label}
                onClick={() => {
                  if (path.startsWith("/#")) {
                    if (window.location.pathname !== "/") {
                      navigate(path);
                    } else {
                      document.querySelector(path.replace("/", ""))?.scrollIntoView({ behavior: "smooth" });
                    }
                  } else {
                    navigate(path);
                  }
                }}
                className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer text-gray-700 hover:text-[#7E57C2] hover:bg-purple-100 hover:scale-105 active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Desktop Right Actions ─────────── */}
          <div className="hidden md:flex items-center gap-3">
            {token ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 bg-gray-100/70">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">
                      {(userName || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="max-w-[120px] truncate">{userName}</span>
                </div>

                <button
                  onClick={() => navigate(getDashboardPath())}
                  className="px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer text-[#7E57C2] bg-purple-50 hover:bg-purple-100 ring-1 ring-purple-100"
                >
                  Dashboard
                </button>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer text-gray-500 hover:text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-100/80"
                >
                  Log In
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer text-white bg-gradient-to-r from-[#7E57C2] to-[#6C4AB8] shadow-purple-200/50 hover:shadow-purple-300/60"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* ── Mobile Hamburger ──────────────── */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl transition-colors cursor-pointer hover:bg-gray-100/70"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-[2px] rounded-full transition-all duration-300 bg-gray-800 ${mobileOpen ? "rotate-45 translate-y-[5px]" : ""}`}
            />
            <span
              className={`block w-5 h-[2px] rounded-full my-[3px] transition-all duration-300 bg-gray-800 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`}
            />
            <span
              className={`block w-5 h-[2px] rounded-full transition-all duration-300 bg-gray-800 ${mobileOpen ? "-rotate-45 -translate-y-[5px]" : ""}`}
            />
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Drawer ─────────────── */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${
          mobileOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85vw] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-900">Menu</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links */}
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(({ label, path }) => (
              <button
                key={label}
                onClick={() => { 
                  if (path.startsWith("/#")) {
                    if (window.location.pathname !== "/") {
                      navigate(path);
                    } else {
                      document.querySelector(path.replace("/", ""))?.scrollIntoView({ behavior: "smooth" });
                    }
                  } else {
                    navigate(path);
                  }
                  setMobileOpen(false); 
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#7E57C2] transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Auth actions */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100 bg-gray-50/50 space-y-3">
            {token ? (
              <>
                <div className="flex items-center gap-3 px-2 pb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-white">
                      {(userName || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                    <p className="text-xs text-gray-400 capitalize">{role}</p>
                  </div>
                </div>
                <button
                  onClick={() => { navigate(getDashboardPath()); setMobileOpen(false); }}
                  className="w-full py-3 bg-[#7E57C2] text-white font-semibold rounded-xl text-sm hover:bg-[#6C4AB8] transition-colors shadow-md shadow-purple-200/50 cursor-pointer"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full py-3 text-red-500 font-medium rounded-xl text-sm hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate("/login"); setMobileOpen(false); }}
                  className="w-full py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => { navigate("/register"); setMobileOpen(false); }}
                  className="w-full py-3 bg-gradient-to-r from-[#7E57C2] to-[#6C4AB8] text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-purple-200/50 transition-all shadow-md cursor-pointer"
                >
                  Get Started — Free
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
