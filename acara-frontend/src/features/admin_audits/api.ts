import api from "../../lib/Api";

export type AuditScope = "platform" | "own";

export type AuditActor = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "super_admin";
};

export type AdminAuditLog = {
  id: number;
  reference: string;
  module: "users" | "vendors" | "services" | "bookings" | "administration" | string;
  action: string;
  description: string;
  reason: string | null;
  subject_label: string;
  subject_reference: string | null;
  subject_type: string | null;
  subject_id: number | null;
  actor: AuditActor | null;
  created_at: string;
};

export type AdminAuditLogDetail = AdminAuditLog & {
  before_values: Record<string, unknown> | null;
  after_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
};

export type AuditFilters = {
  search: string;
  module: string;
  action: string;
  actor_id: string;
  date_from: string;
  date_to: string;
  page: number;
};

export type AdminAuditLogsResponse = {
  logs: AdminAuditLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  stats: {
    total: number;
    today: number;
    this_week: number;
    high_impact: number;
  };
  filters: {
    actions: string[];
    actors: AuditActor[];
  };
  scope: AuditScope;
};

export const fetchAdminAuditLogs = async (filters: AuditFilters): Promise<AdminAuditLogsResponse> => {
  const response = await api.get<AdminAuditLogsResponse>("/admin/audit-logs", {
    params: {
      ...filters,
      search: filters.search || undefined,
      actor_id: filters.actor_id || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      per_page: 25,
    },
  });
  return response.data;
};

export const fetchAdminAuditLog = async (id: number): Promise<{ log: AdminAuditLogDetail; scope: AuditScope }> => {
  const response = await api.get<{ log: AdminAuditLogDetail; scope: AuditScope }>(`/admin/audit-logs/${id}`);
  return response.data;
};
