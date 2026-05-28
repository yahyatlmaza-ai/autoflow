import { useState, useEffect } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!supported) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch { return false; }
  };

  const sendLocal = (title: string, body: string, icon = '/logo-icon.png') => {
    if (permission !== 'granted') return;
    try {
      new Notification(title, { body, icon, badge: icon, tag: 'autoflow' });
    } catch {}
  };

  return { permission, supported, requestPermission, sendLocal };
}
