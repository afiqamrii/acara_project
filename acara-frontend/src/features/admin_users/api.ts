import api from "../../lib/Api";

export type AccountRole = "user" | "vendor" | "crew" | "admin" | "super_admin";
export type AccountStatus = "active" | "suspended" | string;

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  role: AccountRole;
  status: AccountStatus;
  avatar_url: string | null;
  email_verified_at: string | null;
  profile_completed: boolean;
  last_login_at: string | null;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  bookings_made_count: number;
  bookings_received_count: number;
  services_count: number;
  business_name: string | null;
  vendor_status: string | null;
  suspended_by?: {
    id: number;
    name: string;
    role: AccountRole;
  } | null;
};

export type AdminUsersResponse = {
  users: AdminUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  stats: {
    total: number;
    active: number;
    suspended: number;
    unverified: number;
  };
};

export type UserDirectoryFilters = {
  search: string;
  role: string;
  status: string;
  verification: string;
  page: number;
};

export type AdminUserDetail = {
  user: AdminUser;
  vendor_profile: {
    business_name: string;
    status: string;
    ssm_number: string | null;
    business_started_at: string | null;
    service_area_state: string | null;
    service_area_town: string | null;
  } | null;
  services: Array<{
    id: number;
    name: string;
    category: string;
    status: string;
    is_active: boolean;
    starting_price: number;
    created_at: string;
  }>;
  booking_summary: {
    made: BookingSummary;
    received: BookingSummary;
  };
  recent_bookings: Array<{
    id: number;
    reference: string;
    relationship: "organizer" | "vendor";
    service_name: string | null;
    counterparty: string | null;
    selected_date: string;
    status: string;
    value: number | null;
    created_at: string;
  }>;
  moderation_history: Array<{
    id: number;
    action: "suspended" | "reactivated";
    previous_status: string;
    new_status: string;
    reason: string;
    created_at: string;
    admin: {
      id: number;
      name: string;
      role: AccountRole;
    } | null;
  }>;
  permissions: {
    can_suspend: boolean;
    can_reactivate: boolean;
    blocked_reason: string | null;
  };
};

type BookingSummary = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  closed: number;
};

export const fetchAdminUsers = async (filters: UserDirectoryFilters): Promise<AdminUsersResponse> => {
  const response = await api.get<AdminUsersResponse>("/admin/users", {
    params: {
      ...filters,
      search: filters.search || undefined,
      per_page: 20,
    },
  });
  return response.data;
};

export const fetchAdminUser = async (id: number): Promise<AdminUserDetail> => {
  const response = await api.get<AdminUserDetail>(`/admin/users/${id}`);
  return response.data;
};

export const suspendAdminUser = async ({ id, reason }: { id: number; reason: string }) => {
  const response = await api.patch(`/admin/users/${id}/suspend`, { reason });
  return response.data;
};

export const reactivateAdminUser = async ({ id, reason }: { id: number; reason: string }) => {
  const response = await api.patch(`/admin/users/${id}/reactivate`, { reason });
  return response.data;
};
