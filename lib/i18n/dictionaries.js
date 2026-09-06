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

export const DEFAULT_LANGUAGE = 'pt';

/** Cookie name. No colons: those are not valid in a cookie name. */
export const LANGUAGE_COOKIE = 'zct_lang';

export function dictionaryFor(code) {
  return DICTIONARIES[code] || DICTIONARIES[DEFAULT_LANGUAGE];
}

/**
 * Picks a language from the browser Accept-Language header.
 *
 * The header looks like "pt-BR,pt;q=0.9,en-US;q=0.8". We walk the tags in the
 * order the browser sent them and take the first primary subtag we support, so
 * a Portuguese browser gets Portuguese and everyone else gets English.
 */
export function languageFromHeader(header) {
  if (!header) return 'en';
  const tags = header
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase())
    .filter(Boolean);

  for (const tag of tags) {
    const primary = tag.split('-')[0];
    if (DICTIONARIES[primary]) return primary;
  }
  return 'en';
}
