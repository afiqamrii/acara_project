import api from "../../lib/Api";

export type NotificationFilter = "all" | "unread";

export type UserNotification = {
  id: number;
  type:
    | "booking_request"
    | "booking_approved"
    | "booking_rejected"
    | "booking_cancelled"
    | "booking_completed"
    | string;
  title: string;
  message: string;
  action_url: string | null;
  data: {
    booking_id?: number;
    booking_reference?: string;
    service_name?: string;
    selected_date?: string;
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
