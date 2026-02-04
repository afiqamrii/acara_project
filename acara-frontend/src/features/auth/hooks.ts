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

            // Log full error details for debugging
            if (err.response) {
                console.log("Server Error Status:", err.response.status);
                console.log("Server Error Data:", err.response.data);
            } else if (err.request) {
                console.log("No response received:", err.request);
            } else {
                console.log("Error details:", err.message);
            }

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
