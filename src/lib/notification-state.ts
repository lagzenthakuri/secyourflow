export interface RawNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead?: boolean | null;
  read?: boolean | null;
  link?: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string | null;
}

export interface NotificationsResponse {
  unreadCount?: number;
  notifications?: RawNotification[];
}

export interface NormalizedNotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export interface MarkNotificationReadResult {
  notifications: NotificationItem[];
  unreadDelta: number;
}

export function normalizeNotification(notification: RawNotification): NotificationItem {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
    isRead: notification.isRead ?? notification.read ?? false,
    link: notification.link ?? null,
  };
}

export function normalizeNotificationsResponse(
  response: NotificationsResponse,
): NormalizedNotificationsResponse {
  const notifications = (response.notifications ?? []).map(normalizeNotification);
  const derivedUnread = notifications.filter((notification) => !notification.isRead).length;

  return {
    notifications,
    unreadCount: typeof response.unreadCount === "number" ? response.unreadCount : derivedUnread,
  };
}

export function markAllNotificationsRead(
  notifications: NotificationItem[],
): NotificationItem[] {
  return notifications.map((notification) =>
    notification.isRead ? notification : { ...notification, isRead: true },
  );
}

export function markNotificationRead(
  notifications: NotificationItem[],
  notificationId: string,
): MarkNotificationReadResult {
  let unreadDelta = 0;

  const nextNotifications = notifications.map((notification) => {
    if (notification.id !== notificationId || notification.isRead) {
      return notification;
    }

    unreadDelta = 1;
    return { ...notification, isRead: true };
  });

  return {
    notifications: nextNotifications,
    unreadDelta,
  };
}
