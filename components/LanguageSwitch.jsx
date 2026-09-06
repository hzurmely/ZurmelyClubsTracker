'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LANGUAGES, LANGUAGE_COOKIE } from '@/lib/i18n/dictionaries';
import { useLang, useDic } from '@/components/I18nProvider';

/**
 * Language selector.
 *
 * Writing the cookie from the browser and calling refresh() is enough: the
 * server components read the cookie again and re-render in the new language,
 * without a full page load and without changing the URL.
 */
export default function LanguageSwitch() {
  const router = useRouter();
  const lang = useLang();
  const dic = useDic();
  const [pending, startTransition] = useTransition();

  function choose(code) {
    if (code === lang) return;
    document.cookie = `${LANGUAGE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="langswitch" role="group" aria-label={dic.nav.language}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === lang ? 'on' : ''}
          onClick={() => choose(l.code)}
          aria-pressed={l.code === lang}
          title={l.name}
          disabled={pending}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
