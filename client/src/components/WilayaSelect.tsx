/**
 * WilayaSelect — قائمة منسدلة قابلة للبحث لـ 58 ولاية جزائرية
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, MapPin } from 'lucide-react';
import { WILAYAS } from '../lib/utils';
import { getRuleCarrier } from '../lib/carrierRules';

interface Props {
  value: string;
  onChange: (wilaya: string, carrier: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const WILAYA_REGIONS: Record<string, string[]> = {
  'Centre':  ['Alger','Blida','Bouira','Médéa','Tizi Ouzou','Boumerdès','Tipaza','Béjaïa','Aïn Defla'],
  'Est':     ['Constantine','Annaba','Skikda','Guelma','Sétif','Batna','Jijel','Mila','Souk Ahras','Tébessa','Oum El Bouaghi','Khenchela','El Tarf','Bordj Bou Arréridj'],
  'Ouest':   ['Oran','Sidi Bel Abbès','Tlemcen','Mostaganem','Mascara','Relizane','Aïn Témouchent','Chlef','Tiaret','Tissemsilt','Naâma','El Bayadh','Saïda'],
  'Sud':     ['Ouargla','Ghardaïa','El Oued','Laghouat','Biskra','Tamanrasset','Adrar','Tindouf','Illizi','Djelfa','El Bayadh','El M\'Ghair','El Meniaa','Ouled Djellal','Bordj Badji Mokhtar','Béni Abbès','Timimoun','Touggourt','Djanet','In Salah','In Guezzam'],
  'Other':   [],
};

export default function WilayaSelect({ value, onChange, placeholder = 'Select wilaya…', required, className }: Props) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = WILAYAS.filter(w => w.toLowerCase().includes(query.toLowerCase()));

  function select(w: string) {
    const carrier = getRuleCarrier(w);
    onChange(w, carrier);
    setOpen(false);
    setQuery('');
  }

  function getRegion(w: string) {
    for (const [region, list] of Object.entries(WILAYA_REGIONS)) {
      if (list.includes(w)) return region;
    }
    return 'Other';
  }

  // Group filtered wilayas by region
  const grouped: Record<string, string[]> = {};
  for (const w of filtered) {
    const r = getRegion(w);
    if (!grouped[r]) grouped[r] = [];
    grouped[r].push(w);
  }

  const baseInput = "w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500";

  return (
    <div ref={ref} style={{ position: 'relative' }} className={className}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={baseInput}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {value ? <><MapPin size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />{value}</> : <span style={{ color: 'rgba(156,163,175,.7)' }}>{placeholder}</span>}
        </span>
        <ChevronDown size={14} style={{ color: 'rgba(156,163,175,.7)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999, background: '#0d0d1f', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,.6)', overflow: 'hidden', maxHeight: 320, display: 'flex', flexDirection: 'column' }}>
          {/* Search input */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} style={{ color: 'rgba(232,228,255,.3)', flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search wilaya…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e8e4ff', fontSize: 13 }}
            />
            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,228,255,.3)', fontSize: 16, padding: 0 }}>×</button>}
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'rgba(232,228,255,.3)', fontSize: 13 }}>No wilaya found</div>
            )}
            {Object.entries(grouped).map(([region, list]) => list.length > 0 && (
              <div key={region}>
                <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(232,228,255,.25)', textTransform: 'uppercase', letterSpacing: '.1em', position: 'sticky', top: 0, background: '#0d0d1f' }}>
                  {region}
                </div>
                {list.map(w => (
                  <button key={w} type="button" onClick={() => select(w)}
                    style={{ width: '100%', padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: w === value ? 'rgba(124,58,237,.15)' : 'transparent', border: 'none', cursor: 'pointer', color: w === value ? '#a78bfa' : '#e8e4ff', fontSize: 13, textAlign: 'left', transition: 'background .1s' }}
                    onMouseEnter={e => { if (w !== value) (e.target as HTMLElement).style.background = 'rgba(255,255,255,.04)'; }}
                    onMouseLeave={e => { if (w !== value) (e.target as HTMLElement).style.background = 'transparent'; }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <MapPin size={12} style={{ color: w === value ? '#7c3aed' : 'rgba(232,228,255,.2)', flexShrink: 0 }} />
                      {w}
                    </span>
                    {w === value && <span style={{ fontSize: 14, color: '#7c3aed' }}>✓</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
