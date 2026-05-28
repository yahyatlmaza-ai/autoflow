import { lazy, Suspense, useState } from 'react';
import { X, MapPin, Package, User, Phone, Map, Printer, Clock } from 'lucide-react';

const ShipmentMap = lazy(() => import('./maps/ShipmentMap'));

interface Order {
  id: string; order_number: string; customer_name: string;
  customer_phone: string; customer_address?: string; wilaya?: string;
  product_name: string; quantity: number; total: number;
  status: string; carrier?: string; tracking_number?: string;
  payment_method: string; notes?: string; created_at: string; updated_at?: string;
}
interface Props { order: Order; onClose: () => void; }

const STATUS_COLORS: Record<string,string> = {
  pending:'#f59e0b', confirmed:'#3b82f6', shipped:'#8b5cf6',
  delivered:'#22c55e', cancelled:'#ef4444', returned:'#f97316',
};

export default function OrderDetailModal({ order, onClose }: Props) {
  const [showMap, setShowMap] = useState(false);
  const sc = STATUS_COLORS[order.status] || '#888';

  const row = (label: string, value: any, mono = false) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
      <span style={{ fontSize:12, color:'rgba(232,228,255,.4)' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:500, color: mono ? '#a78bfa' : '#e8e4ff', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#0a0a1e', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', boxShadow:'0 32px 80px rgba(0,0,0,.6)' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#0a0a1e', zIndex:1 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#e8e4ff' }}>{order.order_number}</div>
            <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:100, background:`${sc}20`, color:sc, textTransform:'uppercase' }}>
              {order.status}
            </span>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:7, cursor:'pointer', color:'rgba(232,228,255,.4)', display:'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding:24 }}>
          {/* Order info */}
          <div style={{ marginBottom:20 }}>
            <h4 style={{ fontSize:11, fontWeight:700, color:'rgba(232,228,255,.3)', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 8px' }}>Order Details</h4>
            {row('Product', order.product_name)}
            {row('Quantity', order.quantity)}
            {row('Total', `${order.total?.toLocaleString()} DZD`)}
            {row('Payment', order.payment_method)}
            {row('Carrier', order.carrier)}
            {order.tracking_number && row('Tracking', order.tracking_number, true)}
            {row('Created', order.created_at ? new Date(order.created_at).toLocaleString('ar-DZ') : '—')}
          </div>

          {/* Customer info */}
          <div style={{ marginBottom:20 }}>
            <h4 style={{ fontSize:11, fontWeight:700, color:'rgba(232,228,255,.3)', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 8px' }}>Customer</h4>
            {row('Name', order.customer_name)}
            {row('Phone', order.customer_phone, true)}
            {row('Wilaya', order.wilaya)}
            {order.customer_address && row('Address', order.customer_address)}
          </div>

          {order.notes && (
            <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'rgba(232,228,255,.3)', marginBottom:4 }}>Notes</div>
              <div style={{ fontSize:13, color:'rgba(232,228,255,.7)', lineHeight:1.6 }}>{order.notes}</div>
            </div>
          )}

          {/* Map section */}
          <div style={{ marginBottom:16 }}>
            <button onClick={()=>setShowMap(s=>!s)} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'10px 14px', borderRadius:10, background:'rgba(124,58,237,.08)',
              border:'1px solid rgba(124,58,237,.2)', color:'#a78bfa', cursor:'pointer', fontSize:13, fontWeight:600,
            }}>
              <Map size={15} /> {showMap ? 'Hide Map' : 'Show Shipment Map'}
              {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && <span style={{ fontSize:10, color:'rgba(232,228,255,.3)', marginRight:'auto' }}>API key needed</span>}
            </button>
            {showMap && (
              <div style={{ marginTop:12 }}>
                <Suspense fallback={<div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(124,58,237,.04)', borderRadius:12, color:'rgba(232,228,255,.3)', fontSize:13 }}>Loading map…</div>}>
                  <ShipmentMap order={order} />
                </Suspense>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>window.print()} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#e8e4ff', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              <Printer size={14} /> Print Label
            </button>
            {order.customer_phone && (
              <a href={`https://wa.me/213${order.customer_phone.replace(/^0/,'')}`} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', color:'#4ade80', textDecoration:'none', fontSize:12, fontWeight:600 }}>
                <Phone size={14} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
