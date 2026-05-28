/**
 * ShippingLabel.tsx
 * Printable shipping label with QR code, order details, barcode-style visual.
 * Opens a dedicated print window — no page reload.
 */

import { Printer } from 'lucide-react';

interface Order {
  id?: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  wilaya?: string;
  product_name?: string;
  quantity?: number;
  total?: number;
  carrier?: string;
  tracking_number?: string;
  payment_method?: string;
  notes?: string;
}

interface Props {
  order: Order;
  compact?: boolean; // compact button mode
}

function generateLabelHTML(order: Order): string {
  const tracking = order.tracking_number || order.order_number || order.id?.slice(0, 10) || 'N/A';
  const qrUrl    = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(tracking)}&size=120x120&margin=4`;
  const now      = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Shipping Label — ${order.order_number || 'Order'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Arial', sans-serif;
    background: #f5f5f5;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }
  .label {
    width: 100mm; background: #fff;
    border: 2px solid #1a1a2e;
    border-radius: 8px; overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,.15);
    page-break-after: always;
  }
  /* Header */
  .label-header {
    background: linear-gradient(135deg, #4c1d95, #6d28d9);
    color: #fff; padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .label-logo { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
  .label-order { font-size: 11px; opacity: .75; }
  /* Carrier badge */
  .carrier-badge {
    background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3);
    border-radius: 6px; padding: 4px 10px;
    font-size: 12px; font-weight: 700; letter-spacing: .05em;
  }
  /* Body */
  .label-body { padding: 14px 16px; }
  /* To/From */
  .label-section { margin-bottom: 12px; }
  .section-label {
    font-size: 9px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: #9ca3af; margin-bottom: 5px;
  }
  .recipient-name { font-size: 16px; font-weight: 900; color: #111; margin-bottom: 2px; }
  .recipient-phone { font-size: 12px; color: #4b5563; margin-bottom: 3px; }
  .recipient-address { font-size: 11.5px; color: #374151; line-height: 1.4; }
  .wilaya-pill {
    display: inline-block; margin-top: 5px;
    background: #ede9fe; color: #4c1d95;
    border-radius: 4px; padding: 2px 8px;
    font-size: 11px; font-weight: 700;
  }
  /* Divider */
  .divider { border: none; border-top: 1.5px dashed #e5e7eb; margin: 10px 0; }
  /* Product */
  .product-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .product-name { font-size: 12.5px; font-weight: 700; color: #111; flex: 1; }
  .product-qty { font-size: 11px; color: #6b7280; margin: 0 10px; }
  .product-price {
    font-size: 14px; font-weight: 900; color: #4c1d95;
    background: #ede9fe; border-radius: 6px; padding: 3px 9px;
  }
  /* Payment method */
  .payment-badge {
    display: inline-block; padding: 3px 10px; border-radius: 100px;
    font-size: 10px; font-weight: 700; letter-spacing: .04em;
    background: ${order.payment_method === 'COD' ? '#fef3c7' : '#d1fae5'};
    color: ${order.payment_method === 'COD' ? '#92400e' : '#065f46'};
    border: 1px solid ${order.payment_method === 'COD' ? '#fcd34d' : '#6ee7b7'};
  }
  /* QR + tracking */
  .qr-row {
    display: flex; align-items: center; gap: 12px;
    background: #f9fafb; border: 1px solid #e5e7eb;
    border-radius: 8px; padding: 10px;
  }
  .qr-img { width: 72px; height: 72px; border-radius: 6px; border: 1px solid #e5e7eb; }
  .tracking-info { flex: 1; }
  .tracking-label { font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #9ca3af; margin-bottom: 3px; }
  .tracking-number { font-size: 13px; font-weight: 900; color: #111; font-family: monospace; word-break: break-all; }
  /* Barcode visual */
  .barcode { margin-top: 8px; display: flex; align-items: flex-end; gap: 1px; height: 24px; }
  .barcode-bar { background: #111; border-radius: 1px; }
  /* Notes */
  .notes-box {
    background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px;
    padding: 7px 10px; margin-top: 10px;
    font-size: 11px; color: #92400e; line-height: 1.5;
  }
  /* Footer */
  .label-footer {
    background: #f3f4f6; border-top: 1px solid #e5e7eb;
    padding: 8px 16px; display: flex; align-items: center; justify-content: space-between;
  }
  .footer-platform { font-size: 10px; font-weight: 800; color: #4c1d95; }
  .footer-date { font-size: 9.5px; color: #9ca3af; }
  /* Print */
  @media print {
    body { background: none; padding: 0; }
    .label { box-shadow: none; border-radius: 0; width: 100%; border-color: #000; }
    .no-print { display: none; }
  }
  .print-btn {
    display: block; width: calc(100% - 32px); margin: 16px auto;
    padding: 10px; border: none; border-radius: 8px; cursor: pointer;
    background: linear-gradient(135deg, #4c1d95, #6d28d9);
    color: #fff; font-size: 14px; font-weight: 700; letter-spacing: .02em;
  }
</style>
</head>
<body>

<div>
  <!-- Print button (hidden when printing) -->
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Label</button>

  <!-- LABEL -->
  <div class="label">
    <!-- Header -->
    <div class="label-header">
      <div>
        <div class="label-logo">✦ autoflow</div>
        <div class="label-order">${order.order_number || 'Order'} · ${now}</div>
      </div>
      ${order.carrier ? `<div class="carrier-badge">${order.carrier}</div>` : ''}
    </div>

    <!-- Body -->
    <div class="label-body">

      <!-- Recipient -->
      <div class="label-section">
        <div class="section-label">📦 Deliver to</div>
        <div class="recipient-name">${order.customer_name || 'Customer'}</div>
        ${order.customer_phone ? `<div class="recipient-phone">📞 ${order.customer_phone}</div>` : ''}
        ${order.customer_address ? `<div class="recipient-address">📍 ${order.customer_address}</div>` : ''}
        ${order.wilaya ? `<div><span class="wilaya-pill">🗺️ ${order.wilaya}</span></div>` : ''}
      </div>

      <hr class="divider"/>

      <!-- Product -->
      ${order.product_name ? `
      <div class="product-row">
        <div class="product-name">${order.product_name}</div>
        ${order.quantity ? `<div class="product-qty">×${order.quantity}</div>` : ''}
        ${order.total ? `<div class="product-price">${order.total.toLocaleString()} DZD</div>` : ''}
      </div>
      <div style="margin-bottom:8px">
        <span class="payment-badge">${order.payment_method || 'COD'}</span>
      </div>
      ` : ''}

      <hr class="divider"/>

      <!-- QR + Tracking -->
      <div class="qr-row">
        <img class="qr-img" src="${qrUrl}" alt="QR Code" loading="eager"/>
        <div class="tracking-info">
          <div class="tracking-label">Tracking number</div>
          <div class="tracking-number">${tracking}</div>
          <!-- Barcode visual -->
          <div class="barcode">
            ${Array.from({ length: 28 }, (_,i) => `<div class="barcode-bar" style="height:${[16,20,12,20,16,20,14,18,12,20,16,20,12,16,20,14,18,12,20,16,14,18,20,12,16,20,14,18][i % 28]}px;width:${i%4===0?3:i%3===0?2:1}px"></div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Notes -->
      ${order.notes ? `<div class="notes-box">📝 Note: ${order.notes}</div>` : ''}
    </div>

    <!-- Footer -->
    <div class="label-footer">
      <div class="footer-platform">autoflow logistics</div>
      <div class="footer-date">Printed: ${now}</div>
    </div>
  </div>
</div>

<script>
  // Auto-load QR code image
  const img = document.querySelector('.qr-img');
  img.onerror = () => { img.style.display='none'; };
  // Auto focus for print
  window.focus();
</script>
</body>
</html>`;
}

export function printShippingLabel(order: Order) {
  const html   = generateLabelHTML(order);
  const win    = window.open('', '_blank', 'width=420,height=700,scrollbars=yes');
  if (!win) { alert('Please allow popups to print shipping labels.'); return; }
  win.document.write(html);
  win.document.close();
  // Auto-print after a brief delay for images to load
  win.onload = () => setTimeout(() => { win.focus(); /* win.print(); */ }, 800);
}

// ── Button component ───────────────────────────────────────────────────────────
export default function ShippingLabelButton({ order, compact }: Props) {
  return (
    <button
      onClick={() => printShippingLabel(order)}
      title="Print shipping label"
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            compact ? 0 : 7,
        padding:        compact ? '7px' : '7px 14px',
        borderRadius:   9,
        background:     'rgba(109,40,217,.1)',
        border:         '1px solid rgba(109,40,217,.25)',
        color:          '#a78bfa',
        fontSize:       12.5,
        fontWeight:     600,
        cursor:         'pointer',
        transition:     'all .2s',
        fontFamily:     'inherit',
        whiteSpace:     'nowrap',
      }}
      onMouseOver={e => { e.currentTarget.style.background = 'rgba(109,40,217,.2)'; e.currentTarget.style.borderColor = 'rgba(109,40,217,.5)'; }}
      onMouseOut={e  => { e.currentTarget.style.background = 'rgba(109,40,217,.1)'; e.currentTarget.style.borderColor = 'rgba(109,40,217,.25)'; }}
    >
      <Printer size={14} />
      {!compact && ' Print Label'}
    </button>
  );
}
