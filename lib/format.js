/**
 * Division names depend on the language, so the caller hands over the
 * dictionary. Without one it falls back to the raw number, which is still
 * readable and never wrong.
 */
export function divisionName(n, dic) {
  if (!n) return dic ? dic.divisions.none : 'No division';
  if (n === 1) return dic ? dic.divisions.elite : 'Elite';
  return dic ? dic.divisions.division(n) : `Division ${n}`;
}

/** Normalizes the position coming from EA (string or code) into a short abbreviation. */
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

/**
 * Decimal and grouping separators swap with the language: Portuguese writes
 * 8,30 and 1.995, English writes 8.30 and 1,995. Without the dictionary both
 * fall back to the Portuguese shape, which is what the site started as.
 */
export function dec(v, places = 2, dic) {
  if (!Number.isFinite(v)) return '0';
  return v.toFixed(places).replace('.', dic?.decimal || ',');
}

export function nf(v, dic) {
  return new Intl.NumberFormat(dic?.htmlLang || 'pt-BR').format(v || 0);
}

/** Same as dec, for the places that already hold a number as a string. */
export function decimalSep(dic) {
  return dic?.decimal || ',';
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

/**
 * EA kit colors arrive as the RGB value in decimal integer form.
 * E.g. 15921906 = 0xF2F2F2. The value -1 means "no color defined".
 */
export function kitColor(value, fallback = '#2b7fff') {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0 || n > 0xffffff) return fallback;
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** Relative luminance, to decide between light and dark text on top of the color. */
export function readableOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0b0d12' : '#ffffff';
}

/**
 * The EA API returns UTF-8 text labelled as Latin-1, so accented names arrive as
 * "JosÃ©" instead of "José". This undoes the mess whenever it detects the
 * pattern, and hands back the original untouched when there is nothing to fix.
 * It also collapses the decorative spaces the game leaves in club names.
 */
export function fixText(value) {
  if (typeof value !== 'string' || !value) return value;
  let s = value;
  if (/[ÃÂ][\x80-\xbf]/.test(s)) {
    try {
      const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
      s = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      /* it was not mojibake, keep the original */
    }
  }
  return s.replace(/\s+/g, ' ').trim();
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
