/** System notifications — used so reminders still surface when the tab is hidden. */

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Shows a notification through the service worker when one is registered
 * (so it survives the tab being backgrounded) and falls back to a page
 * notification otherwise.
 */
export async function pushNotify(
  title: string,
  options: NotificationOptions & { tag?: string } = {},
) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const payload: NotificationOptions = {
    icon: "/favicon.png",
    badge: "/favicon.png",
    requireInteraction: true,
    ...options,
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, payload);
        return true;
      }
    }
    new Notification(title, payload);
    return true;
  } catch {
    return false;
  }
}
