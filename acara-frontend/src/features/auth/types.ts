export interface RegisterData {
    name: string;
    phone_number: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    message?: string;
}
