import api from "../../lib/Api";
import type { RegisterData, AuthResponse } from "./types";

export const register = async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/register", data);
    return response.data;
};

export const resendVerificationEmail = async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>("/email/resend");
    return response.data;
};
