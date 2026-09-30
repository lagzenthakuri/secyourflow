export interface RawNotification {
  createdAt: string;
  id: string;
  isRead?: boolean | null;
  link?: string | null;
  message: string;
  read?: boolean | null;
  title: string;
}

export interface NotificationItem {
  createdAt: string;
  id: string;
  isRead: boolean;
  link?: string | null;
  message: string;
  title: string;
}

export interface NotificationsResponse {
  notifications?: RawNotification[];
  unreadCount?: number;
}

export interface NormalizedNotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface MarkNotificationReadResult {
  notifications: NotificationItem[];
  unreadDelta: number;
}

export function normalizeNotification(
  notification: RawNotification
): NotificationItem {
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
  response: NotificationsResponse
): NormalizedNotificationsResponse {
  const notifications = (response.notifications ?? []).map(
    normalizeNotification
  );
  const derivedUnread = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return {
    notifications,
    unreadCount:
      typeof response.unreadCount === "number"
        ? response.unreadCount
        : derivedUnread,
  };
}

export function markAllNotificationsRead(
  notifications: NotificationItem[]
): NotificationItem[] {
  return notifications.map((notification) =>
    notification.isRead ? notification : { ...notification, isRead: true }
  );
}

export function markNotificationRead(
  notifications: NotificationItem[],
  notificationId: string
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
