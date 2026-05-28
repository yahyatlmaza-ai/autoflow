/**
 * server/automation.ts — Automation engine v2.1
 */
import { adminDb } from './db.js';

const WILAYA_CARRIER_MAP: Record<string, string> = {
  'Alger':'Yalidine','Blida':'Yalidine','Boumerdès':'Yalidine','Tipaza':'Yalidine',
  'Tizi Ouzou':'Yalidine','Béjaïa':'Yalidine','Bouira':'Yalidine','Médéa':'Yalidine',
  'Chlef':'Yalidine','Tiaret':'Yalidine','Tissemsilt':'Yalidine','Aïn Defla':'Yalidine',
  'M\'Sila':'Yalidine','Biskra':'Yalidine','Boumerdes':'Yalidine',
  'Oran':'ZR Express','Sidi Bel Abbès':'ZR Express','Tlemcen':'ZR Express',
  'Mostaganem':'ZR Express','Mascara':'ZR Express','Relizane':'ZR Express',
  'Aïn Témouchent':'ZR Express','Naâma':'ZR Express','Saïda':'ZR Express',
  'Constantine':'Noest','Annaba':'Noest','Skikda':'Noest','Guelma':'Noest',
  'Sétif':'Noest','Batna':'Noest','Jijel':'Noest','Mila':'Noest',
  'Souk Ahras':'Noest','Tébessa':'Noest','Oum El Bouaghi':'Noest',
  'Khenchela':'Noest','Bordj Bou Arréridj':'Noest',
  'Ouargla':'Amana','El Oued':'Amana','Ghardaïa':'Amana','Laghouat':'Amana',
  'Djelfa':'Amana','Béchar':'Amana','El Bayadh':'Amana','Adrar':'Amana',
  'Tamanrasset':'Amana','Illizi':'Amana','Tindouf':'Amana',
  'Ouled Djellal':'Amana','El M\'Ghair':'Amana','El Meniaa':'Amana',
  'Touggourt':'Amana','In Salah':'Amana','In Guezzam':'Amana',
  'Timimoun':'Amana','Béni Abbès':'Amana','Bordj Badji Mokhtar':'Amana','Djanet':'Amana',
};

export function assignCarrierForWilaya(wilaya: string): string {
  if (!wilaya) return 'Yalidine';
  const exact = WILAYA_CARRIER_MAP[wilaya];
  if (exact) return exact;
  const norm = wilaya.toLowerCase();
  for (const [k, v] of Object.entries(WILAYA_CARRIER_MAP)) {
    if (k.toLowerCase().includes(norm) || norm.includes(k.toLowerCase())) return v;
  }
  return 'Yalidine';
}

export async function sendNotification(
  userId: string, title: string, message: string, type = 'system', orderId?: string
): Promise<void> {
  if (!userId || userId === 'demo') return;
  try {
    await adminDb.from('notifications').insert({
      user_id: userId, title, message, type, read: false, order_id: orderId ?? null,
    });
  } catch (err: unknown) { console.error('[notify]', err); }
}

export async function logActivity(
  userId: string, tenantId: string, action: string,
  entity: string, entityId: string, metadata?: Record<string, unknown>
): Promise<void> {
  if (!userId || userId === 'demo') return;
  try {
    await adminDb.from('activity_logs').insert({
      user_id: userId, tenant_id: tenantId || null,
      action, entity, entity_id: entityId, metadata: metadata ?? null,
    });
  } catch (err: unknown) { console.error('[log]', err); }
}

export async function recordStatusChange(
  orderId: string, status: string, notes?: string
): Promise<void> {
  try {
    await adminDb.from('order_status_history').insert({
      order_id: orderId, status, notes: notes ?? null,
    });
  } catch (err: unknown) { console.error('[history]', err); }
}

export async function updateCustomerStats(order: Record<string, unknown>, tenantId: string): Promise<void> {
  if (!order.customer_phone) return;
  try {
    const { data: existing } = await adminDb.from('customers')
      .select('id,total_orders,total_spent').eq('tenant_id', tenantId)
      .eq('customer_phone', order.customer_phone).maybeSingle();
    if (existing) {
      await adminDb.from('customers').update({
        total_orders: ((existing.total_orders as number) ?? 0) + 1,
        total_spent:  ((existing.total_spent  as number) ?? 0) + ((order.total as number) ?? 0),
        last_order_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await adminDb.from('customers').insert({
        tenant_id: tenantId, name: order.customer_name,
        customer_phone: order.customer_phone, wilaya: order.wilaya,
        total_orders: 1, total_spent: (order.total as number) ?? 0,
        last_order_at: new Date().toISOString(),
      });
    }
  } catch (err: unknown) { console.error('[customer-stats]', err); }
}

export async function runOrderCreatedRules(order: Record<string, unknown>, userId: string, tenantId: string): Promise<void> {
  try {
    const { data: profile } = await adminDb.from('profiles')
      .select('auto_forward').eq('id', userId).maybeSingle();
    if (profile?.auto_forward) {
      await adminDb.from('orders').update({ status: 'confirmed' }).eq('id', order.id);
      await recordStatusChange(order.id as string, 'confirmed', 'Auto-confirmed via auto_forward');
      await sendNotification(userId, '✅ Order Auto-Confirmed',
        `Order ${order.order_number} confirmed automatically.`, 'order', order.id as string);
    }
    const { data: rules } = await adminDb.from('automation_rules')
      .select('*').eq('tenant_id', tenantId).eq('enabled', true).eq('trigger', 'order_created');
    for (const rule of (rules ?? [])) {
      if (!evaluateCondition(order, rule)) continue;
      await applyAction(order, rule, userId, tenantId);
    }
  } catch (err: unknown) { console.error('[automation]', err); }
}

export async function runStatusChangeRules(order: Record<string, unknown>, userId: string, tenantId: string): Promise<void> {
  try {
    const STATUS_MESSAGES: Record<string, string> = {
      delivered:'📦 Order Delivered', shipped:'🚚 Order Shipped',
      cancelled:'❌ Order Cancelled', returned:'↩️ Order Returned',
      confirmed:'✅ Order Confirmed',
    };
    const title = STATUS_MESSAGES[order.status as string];
    if (title) await sendNotification(userId, title,
      `Order ${order.order_number} is now ${order.status}.`, 'order', order.id as string);

    // Fetch automation settings
    const { data: settings } = await adminDb.from('platform_settings')
      .select('auto_send_sms,sms_provider,sms_api_key,sms_sender_id,auto_retry_failed')
      .eq('id', 'global').maybeSingle();

    // Auto-send SMS on shipped
    if (settings?.auto_send_sms && (order.status === 'shipped' || order.status === 'out_for_delivery')) {
      const { sendSMS, buildShippingMessage } = await import('./sms.js');
      const msg = buildShippingMessage(
        order.order_number as string, order.carrier as string,
        order.tracking_number as string | undefined
      );
      await sendSMS(order.customer_phone as string, msg,
        settings.sms_provider, settings.sms_api_key, settings.sms_sender_id);
    }

    // Auto-retry failed deliveries (re-schedule after 24h)
    if (settings?.auto_retry_failed && order.status === 'failed') {
      const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await adminDb.from('orders').update({
        status: 'pending', notes: `Auto-retry scheduled for ${retryAt}`, updated_at: new Date().toISOString()
      }).eq('id', order.id as string);
      await recordStatusChange(order.id as string, 'pending', 'Auto-retry: scheduled after 24h');
      await sendNotification(userId, '🔄 Auto-Retry Scheduled',
        `Failed order ${order.order_number} will be retried in 24 hours.`, 'automation', order.id as string);
    }

    // Push notification
    const { sendPushToUser } = await import('./push.js');
    await sendPushToUser(userId, {
      title, body: `Order ${order.order_number} is now ${order.status}.`,
      url: '/dashboard?tab=orders', tag: `order-${order.id}`,
    }).catch(() => {});

    // Custom automation rules
    const { data: rules } = await adminDb.from('automation_rules')
      .select('*').eq('tenant_id', tenantId).eq('enabled', true).eq('trigger', 'status_change');
    for (const rule of (rules ?? [])) {
      if (!evaluateCondition(order, rule)) continue;
      await applyAction(order, rule, userId, tenantId);
    }
  } catch (err: unknown) { console.error('[automation]', err); }
}

function evaluateCondition(order: Record<string, unknown>, rule: Record<string, unknown>): boolean {
  const actual   = String(order[rule.condition_field as string] ?? '').toLowerCase();
  const expected = String(rule.condition_value ?? '').toLowerCase();
  switch (rule.condition_operator) {
    case 'equals':       return actual === expected;
    case 'not_equals':   return actual !== expected;
    case 'contains':     return actual.includes(expected);
    case 'greater_than': return parseFloat(actual) > parseFloat(expected);
    case 'less_than':    return parseFloat(actual) < parseFloat(expected);
    default:             return false;
  }
}

async function applyAction(order: Record<string, unknown>, rule: Record<string, unknown>, userId: string, _tenantId: string): Promise<void> {
  try {
    switch (rule.action_type) {
      case 'set_carrier':
        await adminDb.from('orders').update({ carrier: rule.action_value }).eq('id', order.id);
        break;
      case 'set_status':
        await adminDb.from('orders').update({ status: rule.action_value }).eq('id', order.id);
        await recordStatusChange(order.id as string, rule.action_value as string, `Auto rule: ${rule.name}`);
        break;
      case 'notify':
        await sendNotification(userId, `🤖 Rule: ${rule.name}`, rule.action_value as string, 'automation', order.id as string);
        break;
    }
  } catch (err: unknown) { console.error('[automation:action]', err); }
}
