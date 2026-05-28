/**
 * AutomationRules.tsx — Visual automation rule builder
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Zap, ChevronDown, ToggleLeft, ToggleRight, Save, AlertCircle } from 'lucide-react';

interface Rule {
  id?: string;
  name: string;
  trigger: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  enabled: boolean;
}

const TRIGGERS = [
  { value: 'order_created', label: '📦 Order Created' },
  { value: 'status_change', label: '🔄 Status Changed' },
];

const CONDITION_FIELDS = [
  { value: 'wilaya',         label: 'Wilaya' },
  { value: 'status',         label: 'Status' },
  { value: 'carrier',        label: 'Carrier' },
  { value: 'payment_method', label: 'Payment Method' },
  { value: 'total',          label: 'Total Amount' },
];

const OPERATORS = [
  { value: 'equals',      label: '= equals' },
  { value: 'not_equals',  label: '≠ not equals' },
  { value: 'contains',    label: '⊃ contains' },
  { value: 'greater_than',label: '> greater than' },
  { value: 'less_than',   label: '< less than' },
];

const ACTION_TYPES = [
  { value: 'set_carrier',  label: '🚚 Set Carrier' },
  { value: 'set_status',   label: '🔄 Set Status' },
  { value: 'notify',       label: '🔔 Send Notification' },
  { value: 'tag',          label: '🏷️ Add Tag' },
];

const CARRIERS = ['Yalidine', 'ZR Express', 'Noest', 'Amana', 'EMS Algeria', 'DHL', 'FedEx'];
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];

const ALGERIAS_WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','Msila','Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued',
  'Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane','El M\'Ghair','El Meniaa','Ouled Djellal','Bordj Badji Mokhtar',
  'Béni Abbès','Timimoun','Touggourt','Djanet','In Salah','In Guezzam'
];

interface Props {
  token: string;
  onClose?: () => void;
}

export default function AutomationRules({ token, onClose }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token || localStorage.getItem('af_session_token') || ''}` };

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const r = await fetch('/api/automation-rules', { headers: h });
      if (r.ok) setRules(await r.json());
      else if (r.status === 403) setRules([]); // demo mode
    } catch (e) { console.error('[AutomationRules] fetchRules:', e); }
    finally { setLoading(false); }
  }

  async function saveRule(rule: Rule) {
    setSaving(true);
    try {
      const method = rule.id ? 'PUT' : 'POST';
      const url = rule.id ? `/api/automation-rules/${rule.id}` : '/api/automation-rules';
      const r = await fetch(url, { method, headers: h, body: JSON.stringify(rule) });
      if (r.ok) {
        await fetchRules();
        setShowForm(false); setEditingRule(null);
        setToast('Rule saved successfully!');
        setTimeout(() => setToast(null), 3000);
      } else {
        const err = await r.json().catch(() => ({}));
        setToast('Error: ' + (err.error || 'Failed to save rule'));
        setTimeout(() => setToast(null), 4000);
      }
    } catch (e) { console.error('[AutomationRules] saveRule:', e); }
    finally { setSaving(false); }
  }

  async function toggleRule(rule: Rule) {
    const r = await fetch(`/api/automation-rules/${rule.id}`, {
      method: 'PUT', headers: h, body: JSON.stringify({ ...rule, enabled: !rule.enabled })
    });
    if (r.ok) await fetchRules();
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;
    await fetch(`/api/automation-rules/${id}`, { method: 'DELETE', headers: h });
    await fetchRules();
  }

  const emptyRule: Rule = {
    name: '', trigger: 'order_created', condition_field: 'wilaya',
    condition_operator: 'equals', condition_value: '', action_type: 'set_carrier',
    action_value: 'Yalidine', enabled: true,
  };

  const s = {
    container: { fontFamily: "'DM Sans', sans-serif", color: '#e8e4ff' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: 700 },
    btn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none' },
    primaryBtn: { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' },
    dangerBtn: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
    card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 },
    label: { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 6 },
    input: { width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#e8e4ff', fontSize: 13, outline: 'none' },
    select: { width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#e8e4ff', fontSize: 13, outline: 'none', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  };

  const RuleForm = ({ rule, onSave }: { rule: Rule; onSave: (r: Rule) => void }) => {
    const [form, setForm] = useState(rule);
    const set = (k: keyof Rule, v: any) => setForm(f => ({ ...f, [k]: v }));

    const getValueOptions = () => {
      if (form.action_type === 'set_carrier') return CARRIERS;
      if (form.action_type === 'set_status') return STATUSES;
      return [];
    };

    const getConditionValueOptions = () => {
      if (form.condition_field === 'wilaya') return ALGERIAS_WILAYAS;
      if (form.condition_field === 'status') return STATUSES;
      if (form.condition_field === 'carrier') return CARRIERS;
      if (form.condition_field === 'payment_method') return ['COD', 'Card', 'Transfer'];
      return [];
    };

    return (
      <div style={{ ...s.card, border: '1px solid rgba(124,58,237,.3)', background: 'rgba(124,58,237,.04)', marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Rule Name</label>
          <input style={s.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Auto-assign Yalidine for Alger" />
        </div>
        <div style={s.grid}>
          <div>
            <label style={s.label}>Trigger</label>
            <select style={s.select} value={form.trigger} onChange={e => set('trigger', e.target.value)}>
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Condition Field</label>
            <select style={s.select} value={form.condition_field} onChange={e => set('condition_field', e.target.value)}>
              {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Operator</label>
            <select style={s.select} value={form.condition_operator} onChange={e => set('condition_operator', e.target.value)}>
              {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Condition Value</label>
            {getConditionValueOptions().length > 0 ? (
              <select style={s.select} value={form.condition_value} onChange={e => set('condition_value', e.target.value)}>
                <option value="">Select...</option>
                {getConditionValueOptions().map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <input style={s.input} value={form.condition_value} onChange={e => set('condition_value', e.target.value)} placeholder="Value..." />
            )}
          </div>
          <div>
            <label style={s.label}>Action</label>
            <select style={s.select} value={form.action_type} onChange={e => set('action_type', e.target.value)}>
              {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Action Value</label>
            {getValueOptions().length > 0 ? (
              <select style={s.select} value={form.action_value} onChange={e => set('action_value', e.target.value)}>
                {getValueOptions().map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <input style={s.input} value={form.action_value} onChange={e => set('action_value', e.target.value)} placeholder="Value..." />
            )}
          </div>
        </div>
        {/* Preview */}
        <div style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'rgba(232,228,255,.7)' }}>
          <strong style={{ color: '#a78bfa' }}>Preview: </strong>
          When <strong>{TRIGGERS.find(t=>t.value===form.trigger)?.label}</strong>, if <strong>{form.condition_field}</strong> {form.condition_operator} "<strong>{form.condition_value}</strong>", then {ACTION_TYPES.find(a=>a.value===form.action_type)?.label} → "<strong>{form.action_value}</strong>"
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...s.btn, ...s.primaryBtn }} onClick={() => onSave(form)} disabled={saving}>
            {saving ? '...' : <><Save size={14} /> Save Rule</>}
          </button>
          <button style={{ ...s.btn, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#e8e4ff' }} onClick={() => { setShowForm(false); setEditingRule(null); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={s.container}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(34,197,94,.9)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>
          ✅ {toast}
        </div>
      )}

      <div style={s.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Zap size={20} style={{ color: '#a78bfa' }} />
            <h2 style={{ ...s.title, margin: 0 }}>Automation Rules</h2>
          </div>
          <p style={{ color: 'rgba(232,228,255,.4)', fontSize: 13, margin: 0 }}>
            {rules.length} rules · {rules.filter(r => r.enabled).length} active
          </p>
        </div>
        <button style={{ ...s.btn, ...s.primaryBtn }} onClick={() => { setShowForm(true); setEditingRule(emptyRule); }}>
          <Plus size={15} /> New Rule
        </button>
      </div>

      {showForm && editingRule && (
        <RuleForm rule={editingRule} onSave={saveRule} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(232,228,255,.3)' }}>Loading rules...</div>
      ) : rules.length === 0 && !showForm ? (
        <div style={{ ...s.card, textAlign: 'center', padding: 40 }}>
          <Zap size={32} style={{ color: 'rgba(232,228,255,.2)', marginBottom: 12 }} />
          <p style={{ color: 'rgba(232,228,255,.4)', margin: 0, fontSize: 14 }}>No automation rules yet. Create your first rule to automate order processing.</p>
        </div>
      ) : (
        rules.map(rule => (
          <div key={rule.id} style={{ ...s.card, opacity: rule.enabled ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{rule.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: rule.enabled ? 'rgba(34,197,94,.1)' : 'rgba(107,114,128,.1)', color: rule.enabled ? '#4ade80' : '#9ca3af', textTransform: 'uppercase' }}>
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(232,228,255,.4)' }}>
                  {TRIGGERS.find(t=>t.value===rule.trigger)?.label} → if {rule.condition_field} {rule.condition_operator} "{rule.condition_value}" → {ACTION_TYPES.find(a=>a.value===rule.action_type)?.label}: {rule.action_value}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleRule(rule)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: rule.enabled ? '#4ade80' : 'rgba(232,228,255,.3)', padding: 4 }}>
                  {rule.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button style={s.dangerBtn} onClick={() => rule.id && deleteRule(rule.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
