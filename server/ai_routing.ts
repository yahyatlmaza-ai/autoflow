/**
 * server/ai_routing.ts — AI-powered carrier assignment
 * Analyzes historical data to assign optimal carrier per wilaya
 */
import { adminDb } from './db.js';

interface CarrierStats {
  carrier: string;
  deliveries:   number;
  delivered:    number;
  avgDays:      number;
  successRate:  number;
  score:        number;
}

// Fallback rule-based map (always available)
const RULE_MAP: Record<string, string> = {
  'Alger':'Yalidine','Blida':'Yalidine','Boumerdès':'Yalidine','Tipaza':'Yalidine',
  'Tizi Ouzou':'Yalidine','Béjaïa':'Yalidine','Bouira':'Yalidine','Médéa':'Yalidine',
  'Oran':'ZR Express','Sidi Bel Abbès':'ZR Express','Tlemcen':'ZR Express',
  'Mostaganem':'ZR Express','Mascara':'ZR Express','Relizane':'ZR Express',
  'Aïn Témouchent':'ZR Express','Saïda':'ZR Express','Naâma':'ZR Express',
  'Constantine':'Noest','Annaba':'Noest','Skikda':'Noest','Guelma':'Noest',
  'Sétif':'Noest','Batna':'Noest','Jijel':'Noest','Mila':'Noest',
  'Souk Ahras':'Noest','Tébessa':'Noest','Oum El Bouaghi':'Noest','Khenchela':'Noest',
  'Ouargla':'Amana','El Oued':'Amana','Ghardaïa':'Amana','Laghouat':'Amana',
  'Djelfa':'Amana','Tamanrasset':'Amana','Adrar':'Amana','Tindouf':'Amana',
  'Béchar':'Amana','Illizi':'Amana','In Salah':'Amana','Touggourt':'Amana',
};

export async function assignCarrierAI(
  tenantId: string,
  wilaya: string,
  aiEnabled: boolean
): Promise<{ carrier: string; method: string; confidence: number; reason: string }> {
  const ruleCarrier = RULE_MAP[wilaya] || 'Yalidine';

  if (!aiEnabled) {
    return { carrier: ruleCarrier, method: 'rule', confidence: 0.7, reason: `Rule-based: ${wilaya} → ${ruleCarrier}` };
  }

  try {
    // Fetch last 90 days of delivered orders for this tenant & wilaya
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: orders } = await adminDb
      .from('orders')
      .select('carrier, status, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('wilaya', wilaya)
      .in('status', ['delivered', 'cancelled', 'returned', 'failed'])
      .gte('created_at', since)
      .is('deleted_at', null);

    if (!orders || orders.length < 5) {
      // Not enough data — fall back to rules
      return { carrier: ruleCarrier, method: 'rule', confidence: 0.65, reason: 'Insufficient data (< 5 orders), using rule-based assignment' };
    }

    // Aggregate stats per carrier
    const statsMap: Record<string, { total: number; delivered: number; daysSum: number }> = {};
    for (const o of orders) {
      if (!statsMap[o.carrier]) statsMap[o.carrier] = { total: 0, delivered: 0, daysSum: 0 };
      statsMap[o.carrier].total++;
      if (o.status === 'delivered') {
        statsMap[o.carrier].delivered++;
        if (o.created_at && o.updated_at) {
          const days = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 86400000;
          statsMap[o.carrier].daysSum += days;
        }
      }
    }

    // Score each carrier: 60% success rate + 40% speed
    const carrierStats: CarrierStats[] = Object.entries(statsMap).map(([carrier, s]) => {
      const successRate = s.total > 0 ? s.delivered / s.total : 0;
      const avgDays     = s.delivered > 0 ? s.daysSum / s.delivered : 10;
      const speedScore  = Math.max(0, 1 - avgDays / 7); // 0-1, faster = higher
      const score       = 0.6 * successRate + 0.4 * speedScore;
      return { carrier, deliveries: s.total, delivered: s.delivered, avgDays, successRate, score };
    });

    carrierStats.sort((a, b) => b.score - a.score);
    const best = carrierStats[0];

    if (!best || best.deliveries < 3) {
      return { carrier: ruleCarrier, method: 'rule', confidence: 0.65, reason: 'Fallback: not enough per-carrier data' };
    }

    const confidence = Math.min(0.98, 0.5 + best.score * 0.48);
    const reason = `AI: ${best.carrier} has ${(best.successRate * 100).toFixed(0)}% success rate, ${best.avgDays.toFixed(1)} avg days in ${wilaya} (${best.deliveries} orders analyzed)`;

    // Log AI decision
    try {
      await adminDb.from('ai_routing_log').insert({
        tenant_id: tenantId, wilaya,
        assigned_carrier: best.carrier,
        confidence, reason, method: 'ai',
        data: { carriers: carrierStats.slice(0, 5), total_orders: orders.length },
      });
    } catch (_) {}

    return { carrier: best.carrier, method: 'ai', confidence, reason };
  } catch (err) {
    console.error('[ai_routing] error:', err);
    return { carrier: ruleCarrier, method: 'rule', confidence: 0.65, reason: 'AI error, using rule-based fallback' };
  }
}

export function getRuleCarrier(wilaya: string): string {
  return RULE_MAP[wilaya] || 'Yalidine';
}
