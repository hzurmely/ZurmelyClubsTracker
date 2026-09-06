/**
 * Server side language resolution.
 *
 * The chosen language lives in a cookie, so server components can read it
 * before rendering and there is no flash of the wrong language on load. When
 * the cookie is missing, which is every first visit, the browser
 * Accept-Language header decides.
 *
 * Only import this from server components: it pulls in next/headers.
 */

import { cookies, headers } from 'next/headers';
import {
  DICTIONARIES,
  LANGUAGE_COOKIE,
  dictionaryFor,
  languageFromHeader,
} from './dictionaries';

export async function currentLanguage() {
  const jar = await cookies();
  const chosen = jar.get(LANGUAGE_COOKIE)?.value;
  if (chosen && DICTIONARIES[chosen]) return chosen;

  const head = await headers();
  return languageFromHeader(head.get('accept-language'));
}

export async function currentDictionary() {
  return dictionaryFor(await currentLanguage());
}
