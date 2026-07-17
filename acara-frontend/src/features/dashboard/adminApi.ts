import api from "../../lib/Api";

export type AdminVerificationQueueItem = {
  key: string;
  type: "vendor" | "service";
  id: number;
  title: string;
  subtitle: string;
  status: "pending_verification" | "pending_completion";
  submitted_at: string;
  path: string;
};

export type AdminBookingQueueItem = {
  id: number;
  reference: string;
  service_name: string;
  organizer_name: string;
  vendor_name: string;
  event_date: string;
  status: "needs_resolution" | "awaiting_vendor";
  detail: string;
  deadline: string | null;
  path: string;
};

export type AdminActivityItem = {
  id: number;
  reference: string;
  module: string;
  action: string;
  description: string;
  subject_label: string;
  actor_name: string;
  created_at: string;
  path: string;
};

export type AdminDashboardData = {
  accounts: {
    total: number;
    active: number;
    suspended: number;
    organizers: number;
    vendors: number;
  };
  verifications: {
    total: number;
    vendors: number;
    services: number;
  };
  bookings: {
    active: number;
    pending_vendor: number;
    confirmed: number;
    awaiting_organizer: number;
    needs_resolution: number;
    completed_this_month: number;
  };
  queues: {
    verifications: AdminVerificationQueueItem[];
    bookings: AdminBookingQueueItem[];
  };
  recent_activity: AdminActivityItem[];
  activity_scope: "platform" | "own";
  generated_at: string;
};

export const fetchAdminDashboard = async (): Promise<AdminDashboardData> => {
  const response = await api.get<AdminDashboardData>("/admin/dashboard");
  return response.data;
};
