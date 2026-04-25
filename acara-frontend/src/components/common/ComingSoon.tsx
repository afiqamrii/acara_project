import { useNavigate } from "react-router-dom";

import { motion } from "framer-motion";
import Navbar from "../../features/header/pages/navbar";

interface ComingSoonProps {
    title?: string;
    description?: string;
    isPublic?: boolean;
}

const ComingSoon: React.FC<ComingSoonProps> = ({
    title = "Coming Soon",
    description = "This feature is currently under development. We're working hard to bring it to you.",
    isPublic = false,
}) => {
    const navigate = useNavigate();
    const role = localStorage.getItem("role") || "user";
    const isAdmin = role === "admin" || role === "super_admin";
    const dashboardPath = isAdmin ? "/admin/dashboard" : "/dashboard";

    const content = (
        <div className={`flex-1 overflow-y-auto flex items-center justify-center p-8 ${isPublic ? "pt-24" : "h-full bg-gray-50"}`}>
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-lg w-full text-center"
                >
                    {/* Illustration */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-16 h-16 text-indigo-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                                    />
                                </svg>
                            </div>
                            {/* Animated pulse ring */}
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                                className="absolute inset-0 rounded-full border-2 border-indigo-300"
                            />
                        </div>
                    </div>

                    {/* Badge */}
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 rounded-full border border-indigo-100">
                        Under Development
                    </span>

                    <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>

                    <p className="text-gray-500 leading-relaxed mb-8">{description}</p>

                    {/* Progress bar decoration */}
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-8">
                        <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: "65%" }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mb-8">65% complete · Estimated: next release</p>

                    <button
                        onClick={() => navigate(isPublic ? "/" : dashboardPath)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-indigo-200 hover:-translate-y-0.5 active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {isPublic ? "Back to Home" : "Back to Dashboard"}
                    </button>
                </motion.div>
        </div>
    );

    if (isPublic) {
        return (
            <div className="flex h-screen w-full overflow-hidden bg-gray-50">
                <Navbar />
                {content}
            </div>
        );
    }

    return content;
};

export default ComingSoon;
