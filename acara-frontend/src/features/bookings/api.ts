import api from "../../lib/Api";

export type BookingStatus = "pending" | "confirmed" | "completed" | "rejected" | "cancelled" | "expired" | string;

export type BookingItem = {
  id: number;
  booking_reference: string;
  service_id: number;
  service_name: string;
  event_name?: string;
  category: string;
  vendor?: string;
  vendor_name?: string;
  customer_name?: string;
  customer_email?: string;
  location?: string;
  price: string;
  price_value: number;
  total_amount?: number;
  pricing_unit?: string;
  selected_date: string;
  event_date?: string;
  status: BookingStatus;
  payment_status?: string;
  notes?: string | null;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: "vendor" | "customer" | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  reminder_sent_at?: string | null;
  expired_at?: string | null;
  booked_at?: string | null;
};

export type BookingStats = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  rejected: number;
  cancelled: number;
  expired: number;
  estimate: number;
};

export type BookingResponse = {
  bookings: BookingItem[];
  stats?: BookingStats;
};

export const fetchCustomerBookings = async (): Promise<BookingResponse> => {
  const res = await api.get<BookingResponse>("/bookings");
  return res.data;
};

export const cancelCustomerBooking = async (id: number) => {
  const res = await api.patch(`/bookings/${id}/cancel`);
  return res.data;
};

export const fetchAdminBookings = async (): Promise<BookingResponse> => {
  const res = await api.get<BookingResponse>("/admin/bookings");
  return res.data;
};
