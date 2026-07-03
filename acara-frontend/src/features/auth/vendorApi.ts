import api from "../../lib/Api";

export type VendorProfileStatus = {
    profile_exists: boolean;
    status: "pending_completion" | "pending_verification" | "approved" | "rejected" | null;
    business_name?: string | null;
    can_register_services: boolean;
};

export type CompanyProfile = {
    id: number;
    business_name: string;
    ssm_number: string | null;
    business_link: string;
    business_started_at: string;
    service_area_state: string;
    service_area_town: string;
    bank_name: string;
    bank_account_number: string;
    bank_holder_name: string;
    status: "pending_completion" | "pending_verification" | "approved" | "rejected";
    ssm_document_url: string | null;
    updated_at: string | null;
};

export const fetchCompanyProfile = async (): Promise<CompanyProfile | null> => {
    const response = await api.get<{ profile: CompanyProfile | null }>("/vendor/profile");
    return response.data.profile;
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
