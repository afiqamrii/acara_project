import api from "../../lib/Api";

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
