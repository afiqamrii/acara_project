import api from "../../lib/Api";
import type { BookingTimelineEvent } from "./components/BookingTimeline";

export type BookingStatus = "pending" | "confirmed" | "completed" | "rejected" | "cancelled" | "expired" | string;

export type BookingRescheduleRequest = {
  id: number;
  original_date: string;
  requested_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "withdrawn" | string;
  decision_reason?: string | null;
  requested_at?: string | null;
  decided_at?: string | null;
  withdrawn_at?: string | null;
};

export type BookingBrief = {
  event_title: string;
  event_type: string;
  venue_name: string;
  venue_address: string;
  start_time: string;
  end_time?: string | null;
  guest_count?: number | null;
  contact_name: string;
  contact_phone: string;
  setup_time?: string | null;
  requirements?: string | null;
  locked_at?: string | null;
  is_locked: boolean;
};

export type QuotationItem = {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

export type QuotationStatus = "sent" | "accepted" | "declined" | "revision_requested" | "expired" | "withdrawn" | string;

export type Quotation = {
  id: number;
  reference: string;
  version: number;
  status: QuotationStatus;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  terms?: string | null;
  vendor_notes?: string | null;
  valid_until: string;
  sent_at: string;
  responded_at?: string | null;
  expired_at?: string | null;
  response_note?: string | null;
  items: QuotationItem[];
};

export type QuotationPayload = {
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  discount_amount: number;
  tax_rate: number;
  terms: string | null;
  vendor_notes: string | null;
  valid_until: string;
};

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
  brief?: BookingBrief | null;
  quotation?: Quotation | null;
  quotation_history?: Quotation[];
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: "vendor" | "customer" | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  reminder_sent_at?: string | null;
  expired_at?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  booked_at?: string | null;
  reschedule_request?: BookingRescheduleRequest | null;
  reschedule_history?: BookingRescheduleRequest[];
  timeline?: BookingTimelineEvent[];
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

export const fetchRescheduleAvailability = async (id: number): Promise<{ current_date: string; dates: string[] }> => {
  const res = await api.get(`/bookings/${id}/reschedule/availability`);
  return res.data;
};

export const requestBookingReschedule = async ({
  id,
  requestedDate,
  reason,
}: {
  id: number;
  requestedDate: string;
  reason: string;
}) => {
  const res = await api.post(`/bookings/${id}/reschedule`, {
    requested_date: requestedDate,
    reason,
  });
  return res.data;
};

export const withdrawBookingReschedule = async (id: number) => {
  const res = await api.patch(`/bookings/${id}/reschedule/withdraw`);
  return res.data;
};

export const sendVendorQuotation = async ({
  bookingId,
  payload,
}: {
  bookingId: number;
  payload: QuotationPayload;
}) => {
  const res = await api.post(`/vendor/bookings/${bookingId}/quotations`, payload);
  return res.data;
};

export const acceptQuotation = async ({ bookingId, quotationId }: { bookingId: number; quotationId: number }) => {
  const res = await api.patch(`/bookings/${bookingId}/quotations/${quotationId}/accept`);
  return res.data;
};

export const declineQuotation = async ({
  bookingId,
  quotationId,
  reason,
}: {
  bookingId: number;
  quotationId: number;
  reason: string;
}) => {
  const res = await api.patch(`/bookings/${bookingId}/quotations/${quotationId}/decline`, { reason });
  return res.data;
};

export const requestQuotationRevision = async ({
  bookingId,
  quotationId,
  reason,
}: {
  bookingId: number;
  quotationId: number;
  reason: string;
}) => {
  const res = await api.patch(`/bookings/${bookingId}/quotations/${quotationId}/revision`, { reason });
  return res.data;
};

export const fetchAdminBookings = async (): Promise<BookingResponse> => {
  const res = await api.get<BookingResponse>("/admin/bookings");
  return res.data;
};
