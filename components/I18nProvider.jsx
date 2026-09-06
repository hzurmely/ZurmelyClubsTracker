'use client';

import { createContext, useContext } from 'react';
import { dictionaryFor, DEFAULT_LANGUAGE } from '@/lib/i18n/dictionaries';

/**
 * Carries the language code down to client components.
 *
 * Only the code travels through the boundary. Each client component resolves
 * the dictionary itself, because the dictionaries contain functions and React
 * refuses to serialize those as props.
 */
const LanguageContext = createContext(DEFAULT_LANGUAGE);

export default function I18nProvider({ lang, children }) {
  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}

export function useDic() {
  return dictionaryFor(useContext(LanguageContext));
}
