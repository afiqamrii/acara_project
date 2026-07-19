import api from "../../lib/Api";
import type { BookingTimelineEvent } from "./components/BookingTimeline";

export type BookingStatus = "pending" | "confirmed" | "completion_pending" | "completion_disputed" | "completed" | "rejected" | "cancelled" | "expired" | string;

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

export type BookingCompletion = {
  id: number;
  status: "pending" | "confirmed" | "disputed" | "auto_confirmed" | "resolved_completed" | "resolved_reopened" | string;
  completion_note: string;
  proof_url?: string | null;
  proof_name?: string | null;
  response_due_at: string;
  reminder_sent_at?: string | null;
  submitted_at: string;
  confirmed_at?: string | null;
  disputed_at?: string | null;
  dispute_reason?: string | null;
  resolution?: "complete" | "reopen" | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
};

export type BookingMessage = {
  id: number;
  booking_id: number;
  message: string;
  sender: {
    id: number;
    name: string;
    role: string;
  };
  is_mine: boolean;
  read_at?: string | null;
  created_at: string;
};

export type BookingConversationResponse = {
  booking: {
    id: number;
    reference: string;
    status: BookingStatus;
  };
  messages: BookingMessage[];
  participant_role: "organizer" | "vendor" | "admin";
  can_send: boolean;
  read_only_reason?: string | null;
  unread_count: number;
};

export type VendorConversationSummary = {
  booking_id: number;
  booking_reference: string;
  service_name: string;
  selected_date: string;
  status: BookingStatus;
  customer: {
    id: number;
    name: string;
  };
  message_count: number;
  unread_message_count: number;
  last_message: {
    message: string;
    sender_name: string;
    is_mine: boolean;
    created_at: string;
  } | null;
};

export type VendorConversationSummariesResponse = {
  conversations: VendorConversationSummary[];
  unread_count: number;
};

export type TrackingStage = "vendor_preparing" | "ready_for_event" | "on_the_way" | "arrived";

export type TrackingUpdate = {
  id: number;
  stage: TrackingStage;
  label: string;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  photo_url?: string | null;
  photo_name?: string | null;
  actor: {
    id: number;
    name: string;
    role: string;
  } | null;
  created_at: string;
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
  completion?: BookingCompletion | null;
  completion_history?: BookingCompletion[];
  message_count?: number;
  unread_message_count?: number;
  booked_at?: string | null;
  reschedule_request?: BookingRescheduleRequest | null;
  reschedule_history?: BookingRescheduleRequest[];
  timeline?: BookingTimelineEvent[];
  tracking_updates?: TrackingUpdate[];
  portfolio_url?: string | null;
};

export type BookingStats = {
  total: number;
  pending: number;
  confirmed: number;
  completion_pending: number;
  completion_disputed: number;
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

export type AdminBookingDetailResponse = {
  booking: BookingItem;
};

export type CustomerBookingDetailResponse = {
  booking: BookingItem;
};

export const fetchCustomerBookings = async (): Promise<BookingResponse> => {
  const res = await api.get<BookingResponse>("/bookings");
  return res.data;
};

export const fetchCustomerBooking = async (bookingId: number): Promise<CustomerBookingDetailResponse> => {
  const res = await api.get<CustomerBookingDetailResponse>(`/bookings/${bookingId}`);
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

export const fetchQuotationPdf = async (bookingId: number, quotationId: number): Promise<Blob> => {
  const res = await api.get<Blob>(`/bookings/${bookingId}/quotations/${quotationId}/pdf`, {
    responseType: "blob",
  });
  return res.data;
};

export const submitVendorCompletion = async ({
  bookingId,
  note,
  proof,
}: {
  bookingId: number;
  note: string;
  proof?: File | null;
}) => {
  const formData = new FormData();
  formData.append("note", note);
  if (proof) formData.append("proof", proof);

  const res = await api.post(`/vendor/bookings/${bookingId}/completion`, formData);
  return res.data;
};

export const confirmBookingCompletion = async (bookingId: number) => {
  const res = await api.patch(`/bookings/${bookingId}/completion/confirm`);
  return res.data;
};

export const disputeBookingCompletion = async ({ bookingId, reason }: { bookingId: number; reason: string }) => {
  const res = await api.patch(`/bookings/${bookingId}/completion/dispute`, { reason });
  return res.data;
};

export const resolveBookingCompletion = async ({
  bookingId,
  decision,
  reason,
}: {
  bookingId: number;
  decision: "complete" | "reopen";
  reason: string;
}) => {
  const res = await api.patch(`/admin/bookings/${bookingId}/completion/resolve`, { decision, reason });
  return res.data;
};

export const fetchAdminBookings = async (): Promise<BookingResponse> => {
  const res = await api.get<BookingResponse>("/admin/bookings");
  return res.data;
};

export const fetchAdminBooking = async (bookingId: number): Promise<AdminBookingDetailResponse> => {
  const res = await api.get<AdminBookingDetailResponse>(`/admin/bookings/${bookingId}`);
  return res.data;
};

export const fetchBookingConversation = async (bookingId: number): Promise<BookingConversationResponse> => {
  const res = await api.get<BookingConversationResponse>(`/bookings/${bookingId}/messages`);
  return res.data;
};

export const sendBookingMessage = async ({ bookingId, message }: { bookingId: number; message: string }) => {
  const res = await api.post(`/bookings/${bookingId}/messages`, { message });
  return res.data;
};

export const markBookingConversationRead = async (bookingId: number) => {
  const res = await api.patch(`/bookings/${bookingId}/messages/read`);
  return res.data;
};

export const fetchVendorConversationSummaries = async (): Promise<VendorConversationSummariesResponse> => {
  const res = await api.get<VendorConversationSummariesResponse>("/vendor/booking-conversations");
  return res.data;
};

export const updateBookingTrackingStage = async ({
  bookingId,
  stage,
  note,
  latitude,
  longitude,
  accuracy,
  photo,
}: {
  bookingId: number;
  stage: TrackingStage;
  note?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  photo?: File | null;
}) => {
  const formData = new FormData();
  formData.append("stage", stage);
  if (note) formData.append("note", note);
  if (latitude !== undefined) formData.append("latitude", String(latitude));
  if (longitude !== undefined) formData.append("longitude", String(longitude));
  if (accuracy !== undefined) formData.append("accuracy", String(accuracy));
  if (photo) formData.append("photo", photo);

  const res = await api.post(`/vendor/bookings/${bookingId}/tracking-stage`, formData);
  return res.data;
};
