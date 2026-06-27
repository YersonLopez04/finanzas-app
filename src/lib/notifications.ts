export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationsEnabled() {
  return notificationsSupported() && Notification.permission === 'granted';
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notifyOncePerDay(key: string, title: string, body: string) {
  if (!notificationsEnabled()) return;
  const today = new Date().toISOString().split('T')[0];
  const flagKey = `notified_${key}_${today}`;
  if (localStorage.getItem(flagKey)) return;
  new Notification(title, { body });
  localStorage.setItem(flagKey, '1');
}
