import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../lib/Api";

const CompleteProfile: React.FC = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: "",
        phone_number: "",
        password: "",
        password_confirmation: "",
    });

    const [errors, setErrors] = React.useState({
        name: false,
        phone_number: false,
        password: false,
        password_confirmation: false,
    });

    const [passwordCriteria, setPasswordCriteria] = React.useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
    });

    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        const { password } = formData;
        setPasswordCriteria({
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        });
    }, [formData.password]);

    const getPasswordStrength = () => {
        const { length, upper, lower, number, special } = passwordCriteria;
        return [length, upper, lower, number, special].filter(Boolean).length;
    };

    const passwordStrength = getPasswordStrength();

    const getStrengthColor = () => {
        if (passwordStrength <= 2) return "bg-red-500";
        if (passwordStrength <= 4) return "bg-yellow-500";
        return "bg-green-500";
    };

    const getStrengthLabel = () => {
        if (passwordStrength === 0) return "";
        if (passwordStrength <= 2) return "Weak";
        if (passwordStrength <= 4) return "Medium";
        return "Strong";
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
        if (errors[id as keyof typeof errors]) {
            setErrors((prev) => ({ ...prev, [id]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
        const passwordsMatch = formData.password === formData.password_confirmation;

        const newErrors = {
            name: !formData.name.trim(),
            phone_number: !formData.phone_number.trim(),
            password: !isPasswordValid,
            password_confirmation: !passwordsMatch || !formData.password_confirmation,
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.post("/profile/complete", formData);
            // Update user data in localStorage or context if needed
            localStorage.setItem("user", JSON.stringify(response.data.user));
            navigate("/dashboard");
        } catch (err: any) {
            console.error("Profile completion failed:", err);
            setError(err.response?.data?.message || "Failed to complete profile");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#7E57C2] to-[#6C4AB8] p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center bg-purple-100 px-4 py-2 rounded-full mb-4">
                        <img src="/src/img/acara-logo.png" alt="ACARA" className="w-6 h-auto" />
                        <span className="ml-2 font-bold text-sm text-gray-900">ACARA</span>
                    </div>
                    <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                        Complete Your Profile
                    </h2>
                    <p className="text-sm text-gray-500">
                        Please provide your details to continue
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                    <div>
                        <input
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 ${errors.name
                                ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                }`}
                            placeholder="Full name"
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={handleInputChange}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-[11px] mt-1 ml-1 text-left font-medium">
                                Full name is required
                            </p>
                        )}
                    </div>

                    <div>
                        <input
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 ${errors.phone_number
                                ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                }`}
                            placeholder="Phone number"
                            id="phone_number"
                            type="tel"
                            value={formData.phone_number}
                            onChange={handleInputChange}
                        />
                        {errors.phone_number && (
                            <p className="text-red-500 text-[11px] mt-1 ml-1 text-left font-medium">
                                Phone number is required
                            </p>
                        )}
                    </div>

                    <div className="relative">
                        <input
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 pr-12 ${errors.password
                                ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                }`}
                            placeholder="New password"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleInputChange}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-red-500 text-[11px] mt-0.5 ml-1 text-left font-medium">
                            Password must meet all requirements
                        </p>
                    )}

                    <div className="px-1 text-xs text-gray-500 text-left">
                        Must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.
                    </div>

                    {formData.password && (
                        <div className="space-y-1 px-1">
                            <div className="flex justify-between items-center">
                                <span
                                    className={`text-xs font-medium ${passwordStrength <= 2
                                        ? "text-red-500"
                                        : passwordStrength <= 4
                                            ? "text-yellow-600"
                                            : "text-green-600"
                                        }`}
                                >
                                    {getStrengthLabel()}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <input
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 pr-12 ${errors.password_confirmation
                                ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                }`}
                            placeholder="Confirm new password"
                            id="password_confirmation"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.password_confirmation}
                            onChange={handleInputChange}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        >
                            {showConfirmPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    {errors.password_confirmation && !formData.password_confirmation && (
                        <p className="text-red-500 text-[11px] mt-0.5 ml-1 text-left font-medium">
                            Please confirm your password
                        </p>
                    )}
                    {formData.password_confirmation &&
                        formData.password !== formData.password_confirmation && (
                            <p className="text-red-500 text-[11px] mt-0.5 ml-1 text-left font-medium">
                                Passwords do not match
                            </p>
                        )}

                    {error && (
                        <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#7E57C2] hover:bg-[#6C4AB8] text-white font-medium py-3.5 rounded-xl transition-all duration-300 mt-4 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
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
                                <span>Completing profile...</span>
                            </>
                        ) : (
                            "Complete Profile"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;
