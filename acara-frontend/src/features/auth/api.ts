import api from "../../lib/Api";
import type { RegisterData, AuthResponse } from "./types";

export const register = async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/register", data);
    return response.data;
};
