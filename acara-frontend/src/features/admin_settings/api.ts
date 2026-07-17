import api from "../../lib/Api";

export type AdminSettingKey =
  | "booking_response_hours"
  | "booking_reminder_hours"
  | "completion_response_hours"
  | "completion_reminder_hours"
  | "booking_email_enabled";

export type AdminSettingValues = {
  booking_response_hours: number;
  booking_reminder_hours: number;
  completion_response_hours: number;
  completion_reminder_hours: number;
  booking_email_enabled: boolean;
};

export type SettingMetadata = {
  source: "admin_override" | "environment_default";
  updated_at: string | null;
  updated_by: {
    id: number;
    name: string;
    email: string;
  } | null;
};

export type AdminSettingsResponse = {
  settings: AdminSettingValues;
  defaults: AdminSettingValues;
  metadata: Record<AdminSettingKey, SettingMetadata>;
  constraints: Record<string, { min: number; max?: number; must_be_less_than?: string }>;
  security_notice: string;
  generated_at: string;
  message?: string;
  changed_keys?: AdminSettingKey[];
};

export type UpdateAdminSettingsPayload = AdminSettingValues & {
  change_reason: string;
};

export const fetchAdminSettings = async (): Promise<AdminSettingsResponse> => {
  const response = await api.get<AdminSettingsResponse>("/admin/settings");
  return response.data;
};

export const updateAdminSettings = async (
  payload: UpdateAdminSettingsPayload,
): Promise<AdminSettingsResponse> => {
  const response = await api.put<AdminSettingsResponse>("/admin/settings", payload);
  return response.data;
};
