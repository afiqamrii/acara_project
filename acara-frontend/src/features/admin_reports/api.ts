import api from "../../lib/Api";

export type ReportFilters = {
  date_from: string;
  date_to: string;
};

export type AdminOperationsReport = {
  period: {
    date_from: string;
    date_to: string;
    days: number;
  };
  summary: {
    booking_requests: number;
    conversion_rate: number;
    new_accounts: number;
    completion_issues: number;
  };
  booking_funnel: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    rejected: number;
    cancelled: number;
    expired: number;
  };
  accounts: {
    new_total: number;
    organizers: number;
    vendors: number;
    verified: number;
    suspended_current: number;
  };
  verifications: {
    new_submissions: number;
    approved: number;
    rejected: number;
    pending_current: number;
    services_pending: number;
    vendors_pending: number;
  };
  completion_issues: {
    reported: number;
    resolved: number;
    open_current: number;
  };
  daily_activity: Array<{
    date: string;
    bookings: number;
    accounts: number;
  }>;
  generated_at: string;
};

export const fetchAdminOperationsReport = async (filters: ReportFilters): Promise<AdminOperationsReport> => {
  const response = await api.get<AdminOperationsReport>("/admin/reports/operations", { params: filters });
  return response.data;
};

export const downloadAdminOperationsReport = async (filters: ReportFilters): Promise<void> => {
  const response = await api.get<Blob>("/admin/reports/operations/export", {
    params: filters,
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const matchedName = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  const filename = matchedName ?? `acara-operations-${filters.date_from}-${filters.date_to}.csv`;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
