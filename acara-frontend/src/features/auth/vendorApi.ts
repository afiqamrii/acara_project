import api from "../../lib/Api";

export type VendorProfileStatus = {
    profile_exists: boolean;
    status: "pending_completion" | "pending_verification" | "approved" | "rejected" | null;
    business_name?: string | null;
    can_register_services: boolean;
};

export const fetchVendorProfileStatus = async (): Promise<VendorProfileStatus> => {
    const response = await api.get<VendorProfileStatus>("/vendor/profile/status");
    return response.data;
};

export const registerService = async (data: FormData) => {
    const response = await api.post("/service/register", data, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const registerVendor = async (data: FormData) => {
    const response = await api.post("/vendor/register", data, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};
