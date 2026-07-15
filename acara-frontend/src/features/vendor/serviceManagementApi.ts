import api from "../../lib/Api";

export type ServiceDisplayStatus = "approved" | "paused" | "pending_verification" | "rejected";

export type ManagedService = {
  id: number;
  service_name: string;
  service_category: string;
  service_details: string;
  pricing_starting_from: number;
  pricing_unit: string;
  pricing_description: string | null;
  portfolio_path: string | null;
  portfolio_url: string | null;
  status: "approved" | "pending_verification" | "rejected";
  is_active: boolean;
  display_status: ServiceDisplayStatus;
  rejection_reason: string | null;
  rejected_at: string | null;
  resubmitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  booking_count: number;
  review_count: number;
  rating_average: number | null;
  available_dates_count: number;
};

export type ServiceManagementResponse = {
  services: ManagedService[];
  summary: {
    total: number;
    active: number;
    paused: number;
    pending: number;
    rejected: number;
  };
};

export type UpdateServiceInput = {
  service: ManagedService;
  service_name: string;
  service_category: string;
  service_details: string;
  pricing_starting_from: string;
  pricing_unit: string;
  pricing_description: string;
  portfolio: File | null;
};

export const fetchManagedServices = async (): Promise<ServiceManagementResponse> => {
  const response = await api.get<ServiceManagementResponse>("/vendor/services");
  return response.data;
};

export const updateManagedService = async (input: UpdateServiceInput): Promise<ManagedService> => {
  const formData = new FormData();
  formData.append("_method", "PATCH");
  formData.append("service_name", input.service_name);
  formData.append("service_category", input.service_category);
  formData.append("service_details", input.service_details);
  formData.append("pricing_starting_from", input.pricing_starting_from);
  formData.append("pricing_unit", input.pricing_unit);
  formData.append("pricing_description", input.pricing_description);
  if (input.portfolio) formData.append("portfolio", input.portfolio);

  const response = await api.post<{ service: ManagedService }>(
    `/vendor/services/${input.service.id}`,
    formData,
  );
  return response.data.service;
};

export const updateServiceVisibility = async ({
  id,
  isActive,
}: {
  id: number;
  isActive: boolean;
}): Promise<ManagedService> => {
  const response = await api.patch<{ service: ManagedService }>(`/vendor/services/${id}/visibility`, {
    is_active: isActive,
  });
  return response.data.service;
};

export const resubmitManagedService = async (id: number): Promise<ManagedService> => {
  const response = await api.post<{ service: ManagedService }>(`/vendor/services/${id}/resubmit`);
  return response.data.service;
};
