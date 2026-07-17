import api from "../../lib/Api";

export type NotificationFilter = "all" | "unread";

export type UserNotification = {
  id: number;
  type:
    | "booking_request"
    | "booking_message"
    | "booking_approved"
    | "booking_rejected"
    | "booking_cancelled"
    | "booking_completed"
    | "booking_expiry_reminder"
    | "booking_expired"
    | "quotation_sent"
    | "quotation_accepted"
    | "quotation_declined"
    | "quotation_revision_requested"
    | "quotation_expiry_reminder"
    | "quotation_expired"
    | "review_received"
    | "service_approved"
    | "service_rejected"
    | "account_suspended"
    | "account_reactivated"
    | string;
  title: string;
  message: string;
  action_url: string | null;
  data: {
    booking_id?: number;
    booking_reference?: string;
    service_name?: string;
    selected_date?: string;
    review_id?: number;
    rating?: number;
    service_id?: number;
    service_status?: string;
    rejection_reason?: string | null;
    expires_at?: string | null;
    expired_at?: string | null;
    quotation_id?: number;
    quotation_reference?: string;
    quotation_version?: number;
    quotation_status?: string;
    quotation_total?: number;
    quotation_valid_until?: string | null;
    quotation_response_note?: string | null;
    booking_message_id?: number;
    message_sender_id?: number;
    message_sender_name?: string;
  } | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationsResponse = {
  notifications: UserNotification[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
  unread_count: number;
};

export type NotificationPreferences = {
  email_enabled: boolean;
  email_booking_updates: boolean;
  email_quotation_updates: boolean;
  email_booking_messages: boolean;
  email_completion_updates: boolean;
  email_review_updates: boolean;
  email_service_updates: boolean;
};

type NotificationPreferencesResponse = {
  message?: string;
  preferences: NotificationPreferences;
};

export const fetchNotifications = async (
  filter: NotificationFilter,
): Promise<NotificationsResponse> => {
  const response = await api.get<NotificationsResponse>("/notifications", {
    params: { filter, per_page: 50 },
  });
  return response.data;
};

export const fetchUnreadNotificationCount = async (): Promise<{ unread_count: number }> => {
  const response = await api.get<{ unread_count: number }>("/notifications/unread-count");
  return response.data;
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.patch("/notifications/read-all");
};

export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await api.get<NotificationPreferencesResponse>("/notification-preferences");
  return response.data.preferences;
};

export const updateNotificationPreferences = async (
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> => {
  const response = await api.put<NotificationPreferencesResponse>(
    "/notification-preferences",
    preferences,
  );
  return response.data.preferences;
};
