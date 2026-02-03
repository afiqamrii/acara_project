import React from "react";
import { useNavigate } from "react-router-dom";
import { useRegister } from "../../hooks";
import Loader from "../../../../components/common/Loader";
import SuccessModal from "../../components/SuccessModal";

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
    });

    // Error state for validation
    const [errors, setErrors] = React.useState({
        name: false,
        phone: false,
        email: false,
        password: false,
        confirmPassword: false,
        terms: false
    });

    const [passwordCriteria, setPasswordCriteria] = React.useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false
    });

    const slides = [
        {
            title: "Find Your Sweet Home",
            description: "Visiting your dream property is now just a few clicks away — fast, easy, reliable.",
            bgImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Manage Events Anywhere",
            description: "ACARA connects organizers with the best vendors and crew in one seamless marketplace.",
            bgImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Grow Your Business",
            description: "Join a growing community of event professionals. Scale your business with ease.",
            bgImage: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070&auto=format&fit=crop"
        }
    ];

    // Auto-slide
    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    React.useEffect(() => {
        const { password } = formData;
        setPasswordCriteria({
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        });
    }, [formData.password]);

    // Calculate password strength score (0-5)
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
        // Clear error when user types
        if (errors[id as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAgreedToTerms(e.target.checked);
        if (errors.terms && e.target.checked) {
            setErrors(prev => ({ ...prev, terms: false }));
        }
    };

    const { register, isLoading, error, isSuccess } = useRegister();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Custom Validation
        const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
        const passwordsMatch = formData.password === formData.confirmPassword;

        const newErrors = {
            name: !formData.name.trim(),
            phone: !formData.phone.trim(),
            email: !formData.email.trim(),
            password: !isPasswordValid,
            confirmPassword: !passwordsMatch || !formData.confirmPassword,
            terms: !agreedToTerms
        };

        setErrors(newErrors);

        // If any error exists, stop submission
        if (Object.values(newErrors).some(Boolean)) {
            return;
        }

        // Prepare data for the hook
        const payload = {
            name: formData.name,
            phone_number: formData.phone,
            email: formData.email,
            password: formData.password,
            password_confirmation: formData.confirmPassword,
            role: "user"
        };

        // Use the custom hook
        await register(payload);
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row relative">
            {/* Success Modal */}
            <SuccessModal isOpen={isSuccess} />

            {/* Global Loader Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader />
                </div>
            )}

            {/* LEFT SIDE - Dynamic Carousel Background */}
            <div className="hidden lg:block relative w-3/5 min-h-screen bg-gray-900 overflow-hidden rounded-r-none">
                {/* Background Images */}
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                        style={{ backgroundImage: `url(${slide.bgImage})`, zIndex: 1 }}
                    />
                ))}

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-linear-to-b from-black/30 to-black/70 z-10" />

                {/* Content */}
                <div className="relative z-20 h-full min-h-screen flex flex-col justify-between p-8">
                    {/* Logo */}
                    <div className="inline-flex items-center bg-white/95 px-4 py-2 rounded-full w-fit shadow-lg">
                        <img src="src/img/acara-logo.png" alt="ACARA" className="w-7 h-auto" />
                        <span className="ml-2 font-bold text-base text-gray-900">ACARA</span>
                    </div>

                    {/* Text at Bottom */}
                    <div className="text-white relative grow">
                        {slides.map((slide, index) => (
                            <div key={index} className={`transition-all duration-600 ease-out absolute bottom-20 left-8 text-left ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'}`}>
                                <h1 className="text-4xl font-extrabold leading-tight mb-3 max-w-md">{slide.title}</h1>
                                <p className="text-base text-white/85 max-w-sm leading-relaxed">{slide.description}</p>
                            </div>
                        ))}

                        {/* Indicators */}
                        <div className="flex gap-2 absolute bottom-15 left-8">
                            {slides.map((_, index) => (
                                <div
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-1 rounded-full cursor-pointer transition-all duration-300 ${index === currentSlide ? 'w-12 bg-white' : 'w-8 bg-white/30'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - Form Panel */}
            <div className="w-full lg:w-2/5 flex items-center justify-center p-8 lg:p-12 bg-white min-h-screen">
                <div className="w-full max-w-sm my-auto">
                    <div className="text-left mb-4">
                        <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-1.5">Create an account</h2>
                        <p className="text-sm text-gray-500">
                            Already have an account? <span onClick={() => navigate("/login")} className="text-[#6C5CE7] hover:underline cursor-pointer font-medium">Log in</span>
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-3" noValidate>
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
                            {errors.name && <p className="text-red-500 text-[11px] mt-1 ml-1 text-left font-medium">Full name is required</p>}
                        </div>

                        <div>
                            <input
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 ${errors.phone
                                    ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                    : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                    }`}
                                placeholder="Phone number"
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleInputChange}
                            />
                            {errors.phone && <p className="text-red-500 text-[11px] mt-1 ml-1 text-left font-medium">Phone number is required</p>}
                        </div>

                        <div>
                            <input
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 ${errors.email
                                    ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                    : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                    }`}
                                placeholder="Email"
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                            {errors.email && <p className="text-red-500 text-[11px] mt-1 ml-1 text-left font-medium">Email address is required</p>}
                        </div>

                        <div className="relative">
                            <input
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 pr-12 ${errors.password
                                    ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                    : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                    }`}
                                placeholder="Password"
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={handleInputChange}
                                onPaste={(e) => e.preventDefault()}
                                onCopy={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="focus:outline-none hover:outline-none absolute right-4 top-[14px] text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none outline-none"
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
                        {errors.password && <p className="text-red-500 text-[11px] mt-0.5 ml-1 text-left font-medium">Password must meet all requirements</p>}

                        {/* Password Requirements Text */}
                        <div className="px-1 text-xs text-gray-500 text-left">
                            Must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.
                        </div>

                        {/* Password Strength Progress Bar */}
                        {formData.password && (
                            <div className="space-y-1 px-1">
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-medium ${passwordStrength <= 2 ? "text-red-500" :
                                        passwordStrength <= 4 ? "text-yellow-600" : "text-green-600"
                                        }`}>
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
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400 pr-12 ${errors.confirmPassword
                                    ? "border-red-500 focus:ring-red-200 focus:border-red-500"
                                    : "border-gray-200 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7]"
                                    }`}
                                placeholder="Confirm password"
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                onPaste={(e) => e.preventDefault()}
                                onCopy={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="focus:outline-none hover:outline-none absolute right-4 top-[14px] text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none outline-none"
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
                        {errors.confirmPassword && !formData.confirmPassword && (
                            <p className="text-red-500 text-[11px] mt-0.5 ml-1 text-left font-medium">Please confirm your password</p>
                        )}
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-red-500 text-[11px] mt-0.5 ml-1 text-left font-medium">Passwords do not match</p>
                        )}

                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={handleTermsChange}
                                className={`w-4 h-4 rounded border-gray-300 text-[#6C5CE7] focus:ring-[#6C5CE7] cursor-pointer accent-[#6C5CE7] ${errors.terms ? 'outline outline-red-500' : ''}`}
                            />
                            <br />
                            <label htmlFor="terms" className="text-sm text-gray-500 cursor-pointer pl-3">
                                I agree to the <span className="underline decoration-1 underline-offset-2 text-gray-600">Terms & Conditions</span>
                            </label>
                        </div>
                        {errors.terms && <p className="text-red-500 text-[11px] mt-1 ml-1 text-left font-medium">You must agree to the terms</p>}

                        {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg">{error}</div>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#7E57C2] hover:bg-[#6C4AB8] text-white font-medium py-3.5 rounded-xl transition-all duration-300 mt-4 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isLoading ? "Creating account..." : "Create account"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
