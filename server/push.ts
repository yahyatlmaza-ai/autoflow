/**
 * server/push.ts — Web Push Notifications (VAPID)
 * Real push notifications that work even when browser is closed
 */
import webPush from 'web-push';
import { adminDb } from './db.js';

// Configure VAPID
const vapidPublic  = process.env.VAPID_PUBLIC_KEY  || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublic && vapidPrivate) {
  webPush.setVapidDetails(
    'mailto:' + (process.env.RESEND_FROM_EMAIL || 'noreply@autoflow.dz'),
    vapidPublic,
    vapidPrivate
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Send push to a single user
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!vapidPublic || !vapidPrivate) {
    console.warn('[push] VAPID keys not set — skipping push notification');
    return 0;
  }
  const { data: subs } = await adminDb
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth_key')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return 0;

  const message = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  payload.icon  || '/logo-icon.png',
    badge: payload.badge || '/logo-icon.png',
    url:   payload.url   || '/',
    tag:   payload.tag   || 'autoflow',
    data:  payload.data  || {},
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        message
      );
      sent++;
    } catch (err: unknown) {
      const e = err as { statusCode?: number };
      if (e.statusCode === 410 || e.statusCode === 404) {
        // Subscription expired — remove it
        await adminDb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
      console.error('[push] send error:', e.statusCode, sub.endpoint.slice(0, 40));
    }
  }
  return sent;
}

// Send to all users of a tenant
export async function sendPushToTenant(tenantId: string, payload: PushPayload): Promise<void> {
  const { data: profiles } = await adminDb
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId);
  if (!profiles) return;
  await Promise.allSettled(profiles.map(p => sendPushToUser(p.id, payload)));
}

// Broadcast to all users (admin use)
export async function broadcastPush(payload: PushPayload): Promise<void> {
  const { data: subs } = await adminDb.from('push_subscriptions').select('user_id').limit(1000);
  if (!subs) return;
  const userIds = Array.from(new Set(subs.map(s => s.user_id)));
  await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, payload)));
}

export const VAPID_PUBLIC_KEY = vapidPublic;
