import React, { useState } from "react";
import api from "../../../lib/Api";
import { AxiosError } from "axios";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../header/pages/navbar";
import { FiEye, FiEyeOff } from "react-icons/fi";

type LoginResponse = {
  message: string;
  role: "user" | "vendor" | "crew" | "admin";
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
};

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setSuccessMsg("Verification successful! You can now log in.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user_name", res.data.user.name);

      switch (res.data.role) {
        case "vendor":
          navigate("/marketplace");
          break;
        case "crew":
          navigate("/crew/jobs");
          break;
        case "admin":
          navigate("/admin/panel");
          break;
        default:
          navigate("/");
      }
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white-100">
      <Navbar />

      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* LEFT SIDE */}
        <div className="flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl p-10">

            <div className="text-center mb-6">
              <img src="/src/img/acara-logo.png" className="mx-auto w-40" />
              <h3 className="text-2xl text-black font-bold mt-6">Welcome back 👋</h3>
              <p className="text-gray-600 mt-2">
                Log in to manage your events & vendors
              </p>
            </div>

            {successMsg && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400"
              />



              <div className="relative w-full group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border rounded-xl
               focus:outline-none focus:ring-2 focus:ring-indigo-500
               focus:bg-white transition-all text-sm text-gray-900
               placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-indigo-500
                             transition-all duration-200
                             transform hover:scale-110 active:scale-95

                             bg-transparent
                             p-0
                             border-none
                             outline-none
                             shadow-none
                             appearance-none
                             focus:outline-none
                             focus:ring-0
                             focus:bg-transparent
                             active:bg-transparent"
                >
                  <span
                    className={`block transition-all duration-200 ease-in-out
        ${showPassword ? "scale-100 opacity-100" : "scale-90 opacity-80"}`}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-white bg-[#7E57C2] hover:bg-[#6C4AB8]"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
            <div className="mt-6 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-500 hover:text-purple-600 hover:underline transition"
              >
                Forgot password?
              </Link>
            </div>

            <div className="flex justify-center items-center mt-6 gap-2 text-sm">
              <span className="text-gray-500">Don’t have an account?</span>
              <Link
                to="/register"
                className="text-purple-600 font-semibold hover:underline"
              >
                Register
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex relative items-center justify-center overflow-hidden">
          <img
            src="/src/img/bg1_login.jpg"
            className="absolute inset-0 w-full h-full object-cover"
            alt="Background"
          />
          <div className="absolute inset-0 bg-linear-to-br from-purple-900/90 via-purple-800/80 to-pink-600/70" />

          {/* Content Container */}
          <div className="relative z-10 px-12 max-w-2xl">
            {/* Decorative Tag */}
            <span className="inline-block px-4 py-1 mb-6 mt-8 text-xs font-bold tracking-widest text-white uppercase bg-white/20 backdrop-blur-md rounded-full border border-white/30">
              Everything you need
            </span>

            <h1 className="text-6xl lg:text-7xl font-black text-white leading-tight mb-4 drop-shadow-2xl">
              Vendor <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-300 to-purple-200">
                Marketplace
              </span>
            </h1>

            {/* Accent Line */}
            <div className="w-20 h-1.5 bg-linear-to-r from-pink-500 to-purple-500 rounded-full mb-8" />

            <p className="mb-10 text-xl leading-relaxed text-gray-100/90 font-medium">
              Your all-in-one platform to plan, manage, and elevate unforgettable
              events. Built for organizers and vendors who demand excellence.
            </p>

            {/* Feature List */}
            <ul className="space-y-5">
              {[
                "Manage all events in one place",
                "Connect with trusted vendors",
                "Track bookings & payments",
                "Grow your vendor business",
              ].map((text, index) => (
                <li
                  key={index}
                  className="flex items-center gap-4 group cursor-default transition-transform duration-300 hover:translate-x-2"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 text-green-300 ring-1 ring-white/40 group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-lg font-medium text-white/95">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-[-5%] left-[-5%] w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
        </div>
      </div >
    </div >
  );
};

export default Login;
