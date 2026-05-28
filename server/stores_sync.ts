/**
 * server/stores_sync.ts — Real store order import (Shopify, WooCommerce)
 */
import { adminDb } from './db.js';

// ── Shopify ───────────────────────────────────────────────────────────────────
async function fetchShopifyOrders(store: any, since?: string) {
  const { url, access_token } = store.platform_config || {};
  if (!url || !access_token) throw new Error('Missing Shopify credentials');
  const params = new URLSearchParams({ limit: '250', status: 'any', ...(since ? { created_at_min: since } : {}) });
  const res = await fetch(`https://${url}/admin/api/2024-01/orders.json?${params}`, {
    headers: { 'X-Shopify-Access-Token': access_token, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const data = await res.json();
  return (data.orders || []).map((o: any) => ({
    external_order_id: String(o.id),
    order_number: '#' + o.order_number,
    customer_name: `${o.shipping_address?.first_name || ''} ${o.shipping_address?.last_name || ''}`.trim() || o.email,
    customer_phone: o.shipping_address?.phone || o.phone || '',
    customer_address: o.shipping_address?.address1 || '',
    wilaya: o.shipping_address?.city || '',
    product_name: o.line_items?.[0]?.name || 'Product',
    quantity: o.line_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 1,
    total: parseFloat(o.total_price || '0'),
    payment_method: o.payment_gateway || 'COD',
    notes: o.note || '',
    status: 'pending',
  }));
}

// ── WooCommerce ───────────────────────────────────────────────────────────────
async function fetchWooOrders(store: any, since?: string) {
  const { consumer_key, consumer_secret, store_url } = store.platform_config || {};
  if (!consumer_key || !consumer_secret || !store_url) throw new Error('Missing WooCommerce credentials');
  const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');
  const params = new URLSearchParams({ per_page: '100', ...(since ? { after: since } : {}) });
  const res = await fetch(`${store_url}/wp-json/wc/v3/orders?${params}`, {
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
  const orders = await res.json();
  return orders.map((o: any) => ({
    external_order_id: String(o.id),
    order_number: '#' + o.number,
    customer_name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
    customer_phone: o.billing?.phone || '',
    customer_address: o.billing?.address_1 || '',
    wilaya: o.billing?.city || '',
    product_name: o.line_items?.[0]?.name || 'Product',
    quantity: o.line_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 1,
    total: parseFloat(o.total || '0'),
    payment_method: o.payment_method_title || 'COD',
    status: 'pending',
  }));
}

// ── Main sync function ────────────────────────────────────────────────────────
export async function syncStoreOrders(storeId: string, tenantId: string): Promise<{
  imported: number; skipped: number; errors: number; message: string;
}> {
  const { data: store } = await adminDb.from('stores').select('*').eq('id', storeId).single();
  if (!store) return { imported: 0, skipped: 0, errors: 0, message: 'Store not found' };

  const { data: syncConf } = await adminDb.from('store_sync_configs')
    .select('*').eq('store_id', storeId).maybeSingle();
  const since = syncConf?.last_sync_at;

  let rawOrders: any[] = [];
  try {
    const platform = (store.platform || '').toLowerCase();
    if (platform === 'shopify') rawOrders = await fetchShopifyOrders(store, since);
    else if (platform === 'woocommerce') rawOrders = await fetchWooOrders(store, since);
    else return { imported: 0, skipped: 0, errors: 0, message: `Platform ${store.platform} sync not implemented yet` };
  } catch (err: any) {
    await adminDb.from('store_sync_configs').upsert({
      store_id: storeId, tenant_id: tenantId,
      last_sync_status: 'error', last_sync_at: new Date().toISOString(),
    }, { onConflict: 'store_id' });
    return { imported: 0, skipped: 0, errors: 1, message: err.message };
  }

  let imported = 0, skipped = 0, errors = 0;
  const { data: carrier_cfg } = await adminDb.from('carrier_configs')
    .select('carrier_name').eq('tenant_id', tenantId).eq('is_default', true).maybeSingle();
  const defaultCarrier = carrier_cfg?.carrier_name || 'Yalidine';

  for (const order of rawOrders) {
    try {
      const { error } = await adminDb.from('orders').insert({
        ...order, tenant_id: tenantId, source_store_id: storeId,
        carrier: defaultCarrier,
      });
      if (error) {
        if (error.code === '23505') skipped++; // duplicate
        else errors++;
      } else imported++;
    } catch { errors++; }
  }

  await adminDb.from('store_sync_configs').upsert({
    store_id: storeId, tenant_id: tenantId,
    last_sync_at: new Date().toISOString(),
    last_sync_status: errors > 0 ? 'partial' : 'success',
    total_synced: (syncConf?.total_synced || 0) + imported,
    last_order_synced: rawOrders[rawOrders.length - 1]?.external_order_id || null,
  }, { onConflict: 'store_id' });

  await adminDb.from('stores').update({
    last_sync: new Date().toISOString(),
    orders_count: (store.orders_count || 0) + imported,
  }).eq('id', storeId);

  return { imported, skipped, errors, message: `Synced: ${imported} new, ${skipped} skipped, ${errors} errors` };
}

// ── Test store connection ──────────────────────────────────────────────────────
export async function testStoreConnection(platform: string, config: Record<string, string>): Promise<{ success: boolean; message: string; info?: any }> {
  try {
    const p = platform.toLowerCase();
    if (p === 'shopify') {
      const res = await fetch(`https://${config.url}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': config.access_token || '' },
      });
      if (!res.ok) return { success: false, message: `Shopify: ${res.status} ${res.statusText}` };
      const data = await res.json();
      return { success: true, message: 'Connected to Shopify', info: { name: data.shop?.name, domain: data.shop?.domain } };
    }
    if (p === 'woocommerce') {
      const auth = Buffer.from(`${config.consumer_key}:${config.consumer_secret}`).toString('base64');
      const res = await fetch(`${config.store_url}/wp-json/wc/v3/system_status`, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      return { success: res.ok, message: res.ok ? 'Connected to WooCommerce' : `WooCommerce: ${res.status}` };
    }
    return { success: false, message: `Platform ${platform} test not implemented` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
