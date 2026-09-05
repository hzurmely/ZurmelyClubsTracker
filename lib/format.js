export const DIVISIONS = {
  1: 'Elite',
  2: 'Divisão 2',
  3: 'Divisão 3',
  4: 'Divisão 4',
  5: 'Divisão 5',
  6: 'Divisão 6',
  7: 'Divisão 7',
  8: 'Divisão 8',
  9: 'Divisão 9',
  10: 'Divisão 10',
};

export function divisionName(n) {
  if (!n) return 'Sem divisão';
  return DIVISIONS[n] || `Divisão ${n}`;
}

/** Normaliza a posição vinda da EA (string ou codigo) para uma sigla curta. */
const POS_MAP = {
  0: 'GK',
  1: 'GK',
  2: 'RB',
  3: 'RB',
  4: 'CB',
  5: 'CB',
  6: 'CB',
  7: 'LB',
  8: 'LB',
  9: 'CDM',
  10: 'CDM',
  11: 'CDM',
  12: 'RM',
  13: 'CM',
  14: 'CM',
  15: 'CM',
  16: 'LM',
  17: 'CAM',
  18: 'CAM',
  19: 'CAM',
  20: 'RW',
  21: 'ST',
  22: 'ST',
  23: 'ST',
  24: 'LW',
  25: 'ST',
  27: 'ST',
  goalkeeper: 'GK',
  defender: 'ZAG',
  midfielder: 'MEI',
  forward: 'ATA',
};

export function posLabel(pos) {
  if (pos === null || pos === undefined || pos === '') return '?';
  const key = String(pos).toLowerCase();
  if (POS_MAP[key]) return POS_MAP[key];
  if (POS_MAP[pos]) return POS_MAP[pos];
  return String(pos).toUpperCase().slice(0, 4);
}

const POS_GROUP = {
  GK: 'gk',
  RB: 'def',
  LB: 'def',
  CB: 'def',
  ZAG: 'def',
  CDM: 'mid',
  CM: 'mid',
  CAM: 'mid',
  LM: 'mid',
  RM: 'mid',
  MEI: 'mid',
  LW: 'att',
  RW: 'att',
  ST: 'att',
  ATA: 'att',
};

export function posGroup(pos) {
  return POS_GROUP[posLabel(pos)] || 'mid';
}

export function pct(v) {
  if (!Number.isFinite(v)) return '0%';
  return `${Math.round(v)}%`;
}

export function dec(v, places = 2) {
  if (!Number.isFinite(v)) return '0';
  return v.toFixed(places).replace('.', ',');
}

export function nf(v) {
  return new Intl.NumberFormat('pt-BR').format(v || 0);
}

export function winRate(w, total) {
  if (!total) return 0;
  return (w / total) * 100;
}

export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() / 1000 - timestamp;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `há ${Math.max(mins, 1)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

/** Cores de uniforme da EA vêm como índices, não como hex. Este e um mapa aproximado. */
const KIT_COLORS = [
  '#e2e8f0', '#0f172a', '#dc2626', '#2563eb', '#16a34a', '#eab308',
  '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#22d3ee', '#84cc16',
  '#f43f5e', '#8b5cf6', '#0ea5e9', '#facc15', '#78716c', '#065f46',
  '#7c2d12', '#1e1b4b',
];

export function kitColor(index, fallback = '#2bff88') {
  const n = parseInt(index, 10);
  if (!Number.isFinite(n)) return fallback;
  return KIT_COLORS[n % KIT_COLORS.length] || fallback;
}

export function initials(name) {
  return (name || '?')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}
