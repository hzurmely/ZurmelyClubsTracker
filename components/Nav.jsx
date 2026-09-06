'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageSwitch from '@/components/LanguageSwitch';
import { useDic } from '@/components/I18nProvider';
import { SITE, MY_CLUB } from '@/lib/config';

export default function Nav() {
  const path = usePathname();
  const dic = useDic();

  const links = [
    { href: '/', label: dic.nav.search },
    { href: '/comparar', label: dic.nav.compare },
    { href: '/sobre', label: dic.nav.about },
  ];

  if (MY_CLUB.id) {
    links.splice(1, 0, {
      href: `/clube/${MY_CLUB.platform}/${MY_CLUB.id}`,
      label: dic.nav.myClub,
    });
  }

  return (
    <header className="topbar">
      <div className="wrap inner">
        <Link href="/" className="brand" aria-label={SITE.name}>
          <span className="mark">Z</span>
          <span className="wordmark">
            <span className="z">Zurmely</span>
            <span className="c">Clubs</span>
            <span className="t">Tracker</span>
          </span>
        </Link>
        <nav className="navlinks">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? 'on' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
        {/* Outside the links so it never scrolls out of reach on a phone,
            where the link row itself scrolls sideways. */}
        <LanguageSwitch />
      </div>
    </header>
  );
}
