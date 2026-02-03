import { useState } from "react";
import { register } from "./api";
import type { RegisterData } from "./types";

export const useRegister = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleRegister = async (data: RegisterData) => {
        setLoading(true);
        setError(null);
        try {
            await register(data);
            // On success, set success flag
            setIsSuccess(true);
        } catch (err: any) {
            console.error("Registration failed:", err);
            // Extract error message if available from backend response
            const message = err.response?.data?.message || "Registration failed. Please try again.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return {
        register: handleRegister,
        isLoading: loading,
        error,
        isSuccess
    };
};
