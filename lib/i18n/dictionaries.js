/**
 * Language registry.
 *
 * This module is safe to import from both server and client components: it has
 * no dependency on next/headers. The dictionaries hold functions (the sentences
 * that interpolate numbers), and functions cannot cross the server to client
 * boundary as props, so client components import the dictionary themselves and
 * only receive the language code through context.
 */

import pt from './pt';
import en from './en';

export const DICTIONARIES = { pt, en };

export const LANGUAGES = Object.values(DICTIONARIES).map((d) => ({
  code: d.code,
  name: d.name,
}));

export const DEFAULT_LANGUAGE = 'en';

/** Cookie name. No colons: those are not valid in a cookie name. */
export const LANGUAGE_COOKIE = 'zct_lang';

export function dictionaryFor(code) {
  return DICTIONARIES[code] || DICTIONARIES[DEFAULT_LANGUAGE];
}

/**
 * Picks a language from the browser Accept-Language header.
 *
 * English is the default. Portuguese only wins when the browser itself is set
 * to Portuguese, which means its top preference, not merely Portuguese sitting
 * somewhere down the list. A header like "es-ES,es;q=0.9,pt;q=0.5" belongs to
 * someone reading Spanish who happens to accept Portuguese, and that person is
 * better served in English than in a language they ranked fifth.
 */
export function languageFromHeader(header) {
  if (!header) return DEFAULT_LANGUAGE;

  const tags = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.slice(2)) : 1 };
    })
    .filter((t) => t.tag);

  if (!tags.length) return DEFAULT_LANGUAGE;

  // Highest quality value wins; ties keep the order the browser sent.
  const top = tags.reduce((a, b) => (b.q > a.q ? b : a));
  return top.tag.split('-')[0] === 'pt' ? 'pt' : DEFAULT_LANGUAGE;
}
