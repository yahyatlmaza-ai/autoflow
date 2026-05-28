/**
 * carrierRules.ts — قواعد تعيين الناقل بناءً على الولاية
 * مستخدم في WilayaSelect و AI routing
 */
const MAP: Record<string, string> = {
  'Alger':'Yalidine','Blida':'Yalidine','Boumerdès':'Yalidine','Tipaza':'Yalidine',
  'Tizi Ouzou':'Yalidine','Béjaïa':'Yalidine','Bouira':'Yalidine','Médéa':'Yalidine',
  'Chlef':'Yalidine','Tiaret':'Yalidine','Tissemsilt':'Yalidine','Aïn Defla':'Yalidine',
  'Oran':'ZR Express','Sidi Bel Abbès':'ZR Express','Tlemcen':'ZR Express',
  'Mostaganem':'ZR Express','Mascara':'ZR Express','Relizane':'ZR Express',
  'Aïn Témouchent':'ZR Express','Naâma':'ZR Express','Saïda':'ZR Express',
  'Constantine':'Noest','Annaba':'Noest','Skikda':'Noest','Guelma':'Noest',
  'Sétif':'Noest','Batna':'Noest','Jijel':'Noest','Mila':'Noest',
  'Souk Ahras':'Noest','Tébessa':'Noest','Oum El Bouaghi':'Noest','Khenchela':'Noest',
  'Bordj Bou Arréridj':'Noest','El Tarf':'Noest','M\'Sila':'Noest',
  'Ouargla':'Amana','El Oued':'Amana','Ghardaïa':'Amana','Laghouat':'Amana',
  'Djelfa':'Amana','Tamanrasset':'Amana','Adrar':'Amana','Tindouf':'Amana',
  'Béchar':'Amana','Illizi':'Amana','Biskra':'Amana','El Bayadh':'Amana',
  'El M\'Ghair':'Amana','El Meniaa':'Amana','Ouled Djellal':'Amana',
  'Bordj Badji Mokhtar':'Amana','Béni Abbès':'Amana','Timimoun':'Amana',
  'Touggourt':'Amana','Djanet':'Amana','In Salah':'Amana','In Guezzam':'Amana',
};

export function getRuleCarrier(wilaya: string): string {
  if (!wilaya) return 'Yalidine';
  const exact = MAP[wilaya];
  if (exact) return exact;
  const lower = wilaya.toLowerCase();
  for (const [key, val] of Object.entries(MAP)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return val;
  }
  return 'Yalidine';
}

export const CARRIER_COLORS: Record<string, string> = {
  'Yalidine': '#f97316','ZR Express': '#3b82f6','Noest': '#8b5cf6',
  'Amana': '#22c55e','EMS Algeria': '#f59e0b','DHL': '#fbbf24','FedEx': '#7c3aed',
};
