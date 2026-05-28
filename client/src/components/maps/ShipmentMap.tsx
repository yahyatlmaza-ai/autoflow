/**
 * ShipmentMap.tsx — Google Maps integration for order tracking
 * Lazy-loaded, with fallback placeholder if API key is unavailable
 */

import { useState, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { MapPin, Navigation, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

// Wilaya coordinates (center of each wilaya)
const WILAYA_COORDS: Record<string, { lat: number; lng: number }> = {
  'Alger':         { lat: 36.7372, lng:  3.0868 },
  'Oran':          { lat: 35.6976, lng: -0.6337 },
  'Constantine':   { lat: 36.3650, lng:  6.6147 },
  'Annaba':        { lat: 36.9000, lng:  7.7667 },
  'Blida':         { lat: 36.4700, lng:  2.8300 },
  'Batna':         { lat: 35.5559, lng:  6.1740 },
  'Sétif':         { lat: 36.1898, lng:  5.4097 },
  'Tlemcen':       { lat: 34.8828, lng: -1.3167 },
  'Mostaganem':    { lat: 35.9311, lng:  0.0892 },
  'Béjaïa':        { lat: 36.7500, lng:  5.0833 },
  'Tizi Ouzou':    { lat: 36.7167, lng:  4.0500 },
  'Jijel':         { lat: 36.8200, lng:  5.7660 },
  'Boumerdès':     { lat: 36.7628, lng:  3.4850 },
  'Tipaza':        { lat: 36.5895, lng:  2.4472 },
  'Médéa':         { lat: 36.2639, lng:  2.7519 },
  'Chlef':         { lat: 36.1669, lng:  1.3300 },
  'Tiaret':        { lat: 35.3717, lng:  1.3217 },
  'Mascara':       { lat: 35.3956, lng:  0.1408 },
  'Relizane':      { lat: 35.7372, lng:  0.5561 },
  'Saïda':         { lat: 34.8317, lng:  0.1533 },
  'Sidi Bel Abbès':{ lat: 35.1897, lng: -0.6306 },
  'Aïn Témouchent':{ lat: 35.3000, lng: -1.1333 },
  'Naâma':         { lat: 33.2667, lng: -0.3167 },
  'Biskra':        { lat: 34.8500, lng:  5.7333 },
  'Ouargla':       { lat: 31.9500, lng:  5.3250 },
  'El Oued':       { lat: 33.3683, lng:  6.8678 },
  'Ghardaïa':      { lat: 32.4900, lng:  3.6742 },
  'Tamanrasset':   { lat: 22.7850, lng:  5.5228 },
  'Adrar':         { lat: 27.8742, lng: -0.2939 },
  'Illizi':        { lat: 26.4833, lng:  8.4833 },
  'Skikda':        { lat: 36.8764, lng:  6.9061 },
  'Guelma':        { lat: 36.4631, lng:  7.4256 },
  'Souk Ahras':    { lat: 36.2806, lng:  7.9514 },
  'Mila':          { lat: 36.4508, lng:  6.2636 },
  'Khenchela':     { lat: 35.4361, lng:  7.1436 },
  'Oum El Bouaghi':{ lat: 35.8731, lng:  7.1131 },
  'Tébessa':       { lat: 35.4042, lng:  8.1233 },
};

// Warehouse location (Alger by default — configurable)
const WAREHOUSE_LOCATION = { lat: 36.7372, lng: 3.0868 };

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_address?: string;
  wilaya?: string;
  status: string;
  carrier?: string;
  tracking_number?: string;
  updated_at?: string;
}

interface ShipmentMapProps {
  order: Order;
  compact?: boolean;
}

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a78bfa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d4e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function MapPlaceholder({ order, message }: { order: Order; message: string }) {
  const coords = order.wilaya ? WILAYA_COORDS[order.wilaya] : null;
  return (
    <div style={{
      width: '100%', height: '100%', minHeight: 280,
      background: 'linear-gradient(135deg, rgba(124,58,237,.08) 0%, rgba(10,10,30,.95) 100%)',
      border: '1px solid rgba(124,58,237,.2)', borderRadius: 12,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 24,
    }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(124,58,237,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MapPin size={24} style={{ color: '#a78bfa' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#e8e4ff', fontWeight: 600, marginBottom: 4 }}>{order.wilaya || 'Location'}</p>
        <p style={{ color: 'rgba(232,228,255,.4)', fontSize: 13 }}>{message}</p>
      </div>
      {coords && (
        <a
          href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'rgba(124,58,237,.2)', border: '1px solid rgba(124,58,237,.4)',
            color: '#a78bfa', textDecoration: 'none', fontSize: 13, fontWeight: 500,
          }}
        >
          <ExternalLink size={14} /> Open in Google Maps
        </a>
      )}
    </div>
  );
}

function ShipmentMapInner({ order, compact }: ShipmentMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<'warehouse' | 'delivery' | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const deliveryCoords = order.wilaya ? WILAYA_COORDS[order.wilaya] : null;
  const mapHeight = compact ? 220 : 340;

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  if (!deliveryCoords) {
    return <MapPlaceholder order={order} message="Wilaya coordinates not available" />;
  }

  const center = {
    lat: (WAREHOUSE_LOCATION.lat + deliveryCoords.lat) / 2,
    lng: (WAREHOUSE_LOCATION.lng + deliveryCoords.lng) / 2,
  };

  const statusColors: Record<string, string> = {
    pending: '#f59e0b', confirmed: '#3b82f6', shipped: '#8b5cf6',
    delivered: '#22c55e', cancelled: '#ef4444', returned: '#f97316',
  };
  const statusColor = statusColors[order.status] || '#a78bfa';

  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${WAREHOUSE_LOCATION.lat},${WAREHOUSE_LOCATION.lng}&destination=${deliveryCoords.lat},${deliveryCoords.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(124,58,237,.2)' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: mapHeight }}
        center={center} zoom={6}
        onLoad={onLoad} onUnmount={onUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: compact,
          zoomControl: !compact,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: !compact,
        }}
      >
        {/* Warehouse marker */}
        <Marker
          position={WAREHOUSE_LOCATION}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#7c3aed', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }}
          title="Warehouse"
          onClick={() => setSelectedMarker('warehouse')}
        />
        {selectedMarker === 'warehouse' && (
          <InfoWindow position={WAREHOUSE_LOCATION} onCloseClick={() => setSelectedMarker(null)}>
            <div style={{ padding: 8, fontFamily: 'sans-serif', minWidth: 140 }}>
              <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>📦 Warehouse</div>
              <div style={{ fontSize: 12, color: '#666' }}>Alger, Algeria</div>
            </div>
          </InfoWindow>
        )}

        {/* Delivery marker */}
        <Marker
          position={deliveryCoords}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: statusColor, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }}
          title={`Delivery: ${order.wilaya}`}
          onClick={() => setSelectedMarker('delivery')}
        />
        {selectedMarker === 'delivery' && (
          <InfoWindow position={deliveryCoords} onCloseClick={() => setSelectedMarker(null)}>
            <div style={{ padding: 8, fontFamily: 'sans-serif', minWidth: 200 }}>
              <div style={{ fontWeight: 700, color: statusColor, marginBottom: 6 }}>🚚 {order.order_number}</div>
              <table style={{ fontSize: 12, color: '#444', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ paddingRight: 8, color: '#888', paddingBottom: 3 }}>Customer:</td><td style={{ fontWeight: 600 }}>{order.customer_name}</td></tr>
                  <tr><td style={{ paddingRight: 8, color: '#888', paddingBottom: 3 }}>Wilaya:</td><td>{order.wilaya}</td></tr>
                  <tr><td style={{ paddingRight: 8, color: '#888', paddingBottom: 3 }}>Status:</td><td style={{ color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>{order.status}</td></tr>
                  <tr><td style={{ paddingRight: 8, color: '#888', paddingBottom: 3 }}>Carrier:</td><td>{order.carrier || 'TBD'}</td></tr>
                  {order.tracking_number && <tr><td style={{ paddingRight: 8, color: '#888' }}>Tracking:</td><td style={{ fontFamily: 'monospace' }}>{order.tracking_number}</td></tr>}
                </tbody>
              </table>
            </div>
          </InfoWindow>
        )}

        {/* Route polyline */}
        <Polyline
          path={[WAREHOUSE_LOCATION, deliveryCoords]}
          options={{ strokeColor: statusColor, strokeOpacity: 0.6, strokeWeight: 2, geodesic: true, icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: '60%' }] }}
        />
      </GoogleMap>

      {!compact && (
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={openDirections}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(124,58,237,.9)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <Navigation size={13} /> Get Directions
          </button>
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(5,5,15,.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8e4ff', marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' }} /> Warehouse (Alger)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8e4ff' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} /> {order.wilaya} ({order.status})
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(function ShipmentMap({ order, compact = false }: ShipmentMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['geometry'],
  });

  if (!GOOGLE_MAPS_API_KEY) {
    return <MapPlaceholder order={order} message="Add VITE_GOOGLE_MAPS_API_KEY to enable live map" />;
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
        <AlertCircle size={16} /> Failed to load Google Maps. Check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: compact ? 220 : 340, background: 'rgba(124,58,237,.04)', border: '1px solid rgba(124,58,237,.15)', borderRadius: 12 }}>
        <Loader2 size={24} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return <ShipmentMapInner order={order} compact={compact} />;
});
