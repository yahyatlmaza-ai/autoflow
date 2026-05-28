/**
 * server/carriers.ts — Real Carrier API integrations
 * Yalidine, ZR Express, Noest, Amana + retry logic
 */

import { adminDb } from './db.js';
import crypto from 'crypto';

// ── فك تشفير credentials ─────────────────────────────────────────────────────
function decryptCreds(encrypted: string): Record<string, string> {
  try {
    const key = (process.env.JWT_SECRET || '').slice(0, 32);
    const [ivHex, enc] = encrypted.split(':');
    if (!ivHex || !enc) return JSON.parse(encrypted); // plaintext fallback
    const k = crypto.scryptSync(key, 'carrier-salt', 32);
    const d = crypto.createDecipheriv('aes-256-cbc', k, Buffer.from(ivHex, 'hex'));
    return JSON.parse(d.update(enc, 'hex', 'utf8') + d.final('utf8'));
  } catch { return {}; }
}

export function encryptCreds(obj: Record<string, string>): string {
  const key = (process.env.JWT_SECRET || '').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const k  = crypto.scryptSync(key, 'carrier-salt', 32);
  const c  = crypto.createCipheriv('aes-256-cbc', k, iv);
  return iv.toString('hex') + ':' + c.update(JSON.stringify(obj), 'utf8', 'hex') + c.final('hex');
}

// ── Logger API ────────────────────────────────────────────────────────────────
async function logCarrierApi(tenantId: string, orderId: string | null, carrier: string,
  action: string, req: any, resp: any, statusCode: number, success: boolean,
  errorMsg: string | null, durationMs: number) {
  try {
    await adminDb.from('carrier_api_logs').insert({
      tenant_id: tenantId, order_id: orderId, carrier, action,
      request: req, response: resp, status_code: statusCode,
      success, error_msg: errorMsg, duration_ms: durationMs,
    });
  } catch (_) {}
}

// ── Retry with exponential backoff ────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelay = 1000): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err: any) {
      lastErr = err;
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

// ── YALIDINE API ──────────────────────────────────────────────────────────────
async function yalidineSubmit(creds: Record<string, string>, order: any) {
  const start = Date.now();
  const payload = {
    reference:          order.order_number,
    name:               order.customer_name,
    family_name:        '',
    contact_phone:      order.customer_phone,
    address:            order.customer_address || order.wilaya,
    to_wilaya_name:     order.wilaya,
    product_list:       order.product_name || 'Product',
    price:              order.total || 0,
    do_insurance:       0,
    declared_value:     order.total || 0,
    height:             1, width: 1, length: 1, weight: 1,
    freeshipping:       0,
    is_stopdesk:        0,
    has_exchange:       0,
    exchange_number:    0,
    stop_desk_id:       '',
    warehouse_id:       creds.warehouse_id || '1',
  };
  const res = await fetch('https://api.yalidine.app/v1/parcels/', {
    method: 'POST',
    headers: {
      'X-API-ID': creds.api_key || '',
      'X-API-TOKEN': creds.api_secret || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  const ms = Date.now() - start;
  return { success: res.ok, data, statusCode: res.status, ms, tracking: data.tracking || data.barcode };
}

async function yalidineTest(creds: Record<string, string>) {
  const res = await fetch('https://api.yalidine.app/v1/warehouses/', {
    headers: { 'X-API-ID': creds.api_key || '', 'X-API-TOKEN': creds.api_secret || '' },
  });
  return { success: res.ok, message: res.ok ? 'Connected to Yalidine' : `Failed: ${res.status}` };
}

// ── ZR EXPRESS API ────────────────────────────────────────────────────────────
async function zrExpressSubmit(creds: Record<string, string>, order: any) {
  const start = Date.now();
  const payload = {
    Vos_Envois: [{
      Code_Wilaya_Destination: order.wilaya,
      Type_Envoi: 'Livraison',
      Nom_Cl: order.customer_name,
      Adresse_Cl: order.customer_address || order.wilaya,
      Tel_Cl: order.customer_phone,
      Nature_Envoi: 'Marchandise',
      Poids: '1.0',
      Nombre_Pcs: '1',
      Montant_Recouvrement: order.total || 0,
    }],
  };
  const res = await fetch('https://zrexpress.net/api/parcel', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  const ms = Date.now() - start;
  return { success: res.ok, data, statusCode: res.status, ms, tracking: data?.[0]?.Tracking };
}

async function zrExpressTest(creds: Record<string, string>) {
  const res = await fetch('https://zrexpress.net/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  return { success: res.ok, message: res.ok ? 'Connected to ZR Express' : `Failed: ${res.status}` };
}

// ── NOEST API ─────────────────────────────────────────────────────────────────
async function noestSubmit(creds: Record<string, string>, order: any) {
  const start = Date.now();
  const res = await fetch('https://api.noest.dz/v1/orders', {
    method: 'POST',
    headers: {
      'client_id': creds.client_id || '',
      'client_secret': creds.client_secret || '',
      'integration_token': creds.integration_token || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference: order.order_number,
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      recipient_address: order.customer_address || order.wilaya,
      destination_wilaya: order.wilaya,
      product_description: order.product_name,
      cod_amount: order.total || 0,
      weight: 1,
    }),
  });
  const data = await res.json().catch(() => ({}));
  const ms = Date.now() - start;
  return { success: res.ok, data, statusCode: res.status, ms, tracking: data.tracking_number };
}

async function noestTest(creds: Record<string, string>) {
  const res = await fetch('https://api.noest.dz/v1/auth/verify', {
    headers: { 'client_id': creds.client_id || '', 'client_secret': creds.client_secret || '' },
  });
  return { success: res.ok, message: res.ok ? 'Connected to Noest' : `Failed: ${res.status}` };
}

// ── AMANA API ─────────────────────────────────────────────────────────────────
async function amanaSubmit(creds: Record<string, string>, order: any) {
  const start = Date.now();
  const timestamp = Date.now();
  const sig = crypto.createHmac('sha256', creds.api_signature || '')
    .update(`${creds.merchant_id}${order.order_number}${timestamp}`).digest('hex');
  const res = await fetch('https://api.amana-dz.com/v1/shipments', {
    method: 'POST',
    headers: {
      'X-Merchant-ID': creds.merchant_id || '',
      'X-Store-Code': creds.store_code || '',
      'X-Signature': sig,
      'X-Timestamp': String(timestamp),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference: order.order_number,
      customer: { name: order.customer_name, phone: order.customer_phone, address: order.customer_address, wilaya: order.wilaya },
      cod: order.total || 0,
      product: order.product_name,
      weight: 1,
    }),
  });
  const data = await res.json().catch(() => ({}));
  const ms = Date.now() - start;
  return { success: res.ok, data, statusCode: res.status, ms, tracking: data.tracking };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
export async function submitOrderToCarrier(
  order: any, tenantId: string
): Promise<{ success: boolean; tracking?: string; error?: string }> {
  // جلب إعدادات الناقل
  const { data: config } = await adminDb.from('carrier_configs')
    .select('*').eq('tenant_id', tenantId)
    .eq('carrier_name', order.carrier).eq('is_active', true).maybeSingle();

  if (!config) return { success: false, error: `No active config for carrier: ${order.carrier}` };

  const creds = decryptCreds(config.credentials);

  const submitFn = async () => {
    const carrier = order.carrier?.toLowerCase() || '';
    if (carrier.includes('yalidine')) return yalidineSubmit(creds, order);
    if (carrier.includes('zr'))       return zrExpressSubmit(creds, order);
    if (carrier.includes('noest'))    return noestSubmit(creds, order);
    if (carrier.includes('amana'))    return amanaSubmit(creds, order);
    throw new Error(`Unsupported carrier: ${order.carrier}`);
  };

  const start = Date.now();
  try {
    const result = await withRetry(submitFn, 3, 2000);
    await logCarrierApi(tenantId, order.id, order.carrier, 'submit',
      { order_number: order.order_number }, result.data, result.statusCode,
      result.success, result.success ? null : 'API error', result.ms);
    if (result.success) {
      await adminDb.from('orders').update({
        tracking_number: result.tracking, external_carrier_id: result.tracking,
        submitted_to_carrier_at: new Date().toISOString(),
        carrier_response: result.data, status: 'confirmed',
      }).eq('id', order.id);
    }
    return { success: result.success, tracking: result.tracking, error: result.success ? undefined : 'Carrier API error' };
  } catch (err: any) {
    const ms = Date.now() - start;
    await logCarrierApi(tenantId, order.id, order.carrier, 'submit', null, null, 0, false, err.message, ms);
    // أضف للـ retry queue
    try {
      await adminDb.from('carrier_submit_queue').upsert({
        tenant_id: tenantId, order_id: order.id, carrier: order.carrier,
        last_error: err.message, status: 'failed',
        next_attempt_at: new Date(Date.now() + 60000).toISOString(),
      }, { onConflict: 'order_id' });
    } catch (_) {}
    return { success: false, error: err.message };
  }
}

// ── Test carrier connection ───────────────────────────────────────────────────
export async function testCarrierConnection(
  carrierName: string, credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  try {
    const c = carrierName.toLowerCase();
    if (c.includes('yalidine'))  return await yalidineTest(credentials);
    if (c.includes('zr'))        return await zrExpressTest(credentials);
    if (c.includes('noest'))     return await noestTest(credentials);
    if (c.includes('amana'))     return { success: false, message: 'Amana API test not available in sandbox' };
    if (c.includes('dhl'))       return { success: false, message: 'DHL requires production credentials' };
    if (c.includes('fedex'))     return { success: false, message: 'FedEx requires production credentials' };
    return { success: false, message: `Unknown carrier: ${carrierName}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
