import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../lib/Api";

const Register_admin: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState(false);
    const [defaultPassword, setDefaultPassword] = React.useState("");
    const [emailError, setEmailError] = React.useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setEmailError(false);

        // Validation
        if (!email.trim()) {
            setEmailError(true);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError(true);
            setError("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.post("/admin/invite", { email });
            setDefaultPassword(response.data.default_password);
            setSuccess(true);
            setEmail("");
        } catch (err: any) {
            console.error("Invitation failed:", err);
            setError(err.response?.data?.message || "Failed to send invitation");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSuccess(false);
        setDefaultPassword("");
        setEmail("");
        setError("");
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row relative bg-gray-50">
            {/* LEFT SIDE - Branding */}
            <div className="hidden lg:block relative w-2/5 min-h-screen bg-gradient-to-br from-[#7E57C2] to-[#6C4AB8] overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAgMi4yMSAxLjc5IDQgNCA0czQtMS43OSA0LTQtMS43OS00LTQtNC00IDEuNzktNCA0em0wIDI0YzAgMi4yMSAxLjc5IDQgNCA0czQtMS43OSA0LTQtMS43OS00LTQtNC00IDEuNzktNCA0ek0xNiAxNmMwIDIuMjEgMS43OSA0IDQgNHM0LTEuNzkgNC00LTEuNzktNC00LTQtNCAxLjc5LTQgNHptMCAyNGMwIDIuMjEgMS43OSA0IDQgNHM0LTEuNzkgNC00LTEuNzktNC00LTQtNCAxLjc5LTQgNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

                <div className="relative z-20 h-full flex flex-col justify-between p-12">
                    {/* Logo */}
                    <div className="inline-flex items-center bg-white/95 px-4 py-2 rounded-full w-fit shadow-lg">
                        <img src="/src/img/acara-logo.png" alt="ACARA" className="w-7 h-auto" />
                        <span className="ml-2 font-bold text-base text-gray-900">ACARA</span>
                    </div>

                    {/* Content */}
                    <div className="text-white">
                        <h1 className="text-5xl font-extrabold leading-tight mb-4">
                            Invite New Admins
                        </h1>
                        <p className="text-lg text-white/90 max-w-md leading-relaxed">
                            Expand your team by inviting new administrators. They'll receive login credentials and complete their profile on first login.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="text-white/70 text-sm">
                        © 2026 ACARA. All rights reserved.
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - Form Panel */}
            <div className="w-full lg:w-3/5 flex items-center justify-center p-8 lg:p-12 bg-white min-h-screen">
                <div className="w-full max-w-md my-auto">
                    {!success ? (
                        <>
                            <div className="text-left mb-8">
                                <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-2">
                                    Invite Admin
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Enter the email address of the person you want to invite as an admin.
                                </p>
                            </div>

                            <form onSubmit={handleInvite} className="space-y-4" noValidate>
                                <div>
                                    <input
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 ${emailError
                                            ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                            : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                            }`}
                                        placeholder="Admin email address"
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setEmailError(false);
                                            setError("");
                                        }}
                                    />
                                    {emailError && (
                                        <p className="text-red-500 text-[11px] mt-1 ml-1 text-left font-medium">
                                            {error || "Email address is required"}
                                        </p>
                                    )}
                                </div>

                                {error && !emailError && (
                                    <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-[#7E57C2] hover:bg-[#6C4AB8] text-white font-medium py-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            <span>Sending invitation...</span>
                                        </>
                                    ) : (
                                        "Send Invitation"
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate("/dashboard")}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3.5 rounded-xl transition-all duration-300 text-sm"
                                >
                                    Back to Dashboard
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            {/* Success Icon */}
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                <svg
                                    className="w-8 h-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            <h2 className="text-3xl font-semibold text-gray-900 mb-3">
                                Invitation Sent!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                The admin invitation has been sent successfully.
                            </p>

                            {/* Default Password Display */}
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
                                <p className="text-sm text-gray-700 mb-2 font-medium">
                                    Default Login Credentials:
                                </p>
                                <div className="bg-white rounded-lg p-4 border border-purple-100">
                                    <p className="text-xs text-gray-500 mb-1">Password</p>
                                    <p className="text-lg font-mono font-semibold text-purple-700">
                                        {defaultPassword}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    Please share this password with the new admin. They will be required to complete their profile and set a new password on first login.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleReset}
                                    className="w-full bg-[#7E57C2] hover:bg-[#6C4AB8] text-white font-medium py-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg text-sm"
                                >
                                    Invite Another Admin
                                </button>
                                <button
                                    onClick={() => navigate("/dashboard")}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3.5 rounded-xl transition-all duration-300 text-sm"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register_admin;
