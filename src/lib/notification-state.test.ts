import { describe, expect, it } from "vitest";
import {
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotificationsResponse,
  type NotificationItem,
  type NotificationsResponse,
} from "./notification-state";

describe("notification-state", () => {
  it("normalizes notifications and derives unread count when the API does not return one", () => {
    const response: NotificationsResponse = {
      notifications: [
        {
          id: "notif-1",
          title: "Vulnerability detected",
          message: "CVE-2026-0001 found",
          createdAt: "2026-02-09T10:00:00.000Z",
          isRead: false,
        },
        {
          id: "notif-2",
          title: "Scan complete",
          message: "Weekly scan finished",
          createdAt: "2026-02-09T11:00:00.000Z",
          read: true,
        },
        {
          id: "notif-3",
          title: "Policy updated",
          message: "SOC policy changed",
          createdAt: "2026-02-09T12:00:00.000Z",
        },
      ],
    };

    const normalized = normalizeNotificationsResponse(response);

    expect(normalized.unreadCount).toBe(2);
    expect(normalized.notifications).toEqual([
      {
        id: "notif-1",
        title: "Vulnerability detected",
        message: "CVE-2026-0001 found",
        createdAt: "2026-02-09T10:00:00.000Z",
        isRead: false,
        link: null,
      },
      {
        id: "notif-2",
        title: "Scan complete",
        message: "Weekly scan finished",
        createdAt: "2026-02-09T11:00:00.000Z",
        isRead: true,
        link: null,
      },
      {
        id: "notif-3",
        title: "Policy updated",
        message: "SOC policy changed",
        createdAt: "2026-02-09T12:00:00.000Z",
        isRead: false,
        link: null,
      },
    ]);
  });

  it("respects unreadCount from API when provided", () => {
    const response: NotificationsResponse = {
      unreadCount: 17,
      notifications: [
        {
          id: "notif-1",
          title: "Test",
          message: "Test",
          createdAt: "2026-02-09T10:00:00.000Z",
          isRead: true,
        },
      ],
    };

    const normalized = normalizeNotificationsResponse(response);
    expect(normalized.unreadCount).toBe(17);
  });

  it("marks one unread notification as read and returns unreadDelta", () => {
    const notifications: NotificationItem[] = [
      {
        id: "notif-1",
        title: "Unread",
        message: "Unread message",
        createdAt: "2026-02-09T10:00:00.000Z",
        isRead: false,
        link: null,
      },
      {
        id: "notif-2",
        title: "Read",
        message: "Read message",
        createdAt: "2026-02-09T11:00:00.000Z",
        isRead: true,
        link: null,
      },
    ];

    const result = markNotificationRead(notifications, "notif-1");

    expect(result.unreadDelta).toBe(1);
    expect(result.notifications[0]?.isRead).toBe(true);
    expect(result.notifications[1]?.isRead).toBe(true);
  });

  it("does not decrement unread count when marking an already-read notification", () => {
    const notifications: NotificationItem[] = [
      {
        id: "notif-1",
        title: "Read",
        message: "Read message",
        createdAt: "2026-02-09T10:00:00.000Z",
        isRead: true,
        link: null,
      },
    ];

    const result = markNotificationRead(notifications, "notif-1");

    expect(result.unreadDelta).toBe(0);
    expect(result.notifications[0]?.isRead).toBe(true);
  });

  it("marks all notifications as read", () => {
    const notifications: NotificationItem[] = [
      {
        id: "notif-1",
        title: "Unread",
        message: "Unread message",
        createdAt: "2026-02-09T10:00:00.000Z",
        isRead: false,
        link: null,
      },
      {
        id: "notif-2",
        title: "Read",
        message: "Read message",
        createdAt: "2026-02-09T11:00:00.000Z",
        isRead: true,
        link: null,
      },
    ];

    const nextNotifications = markAllNotificationsRead(notifications);

    expect(nextNotifications.every((notification) => notification.isRead)).toBe(true);
  });
});
