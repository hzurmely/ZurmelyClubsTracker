'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE, MY_CLUB } from '@/lib/config';

const LINKS = [
  { href: '/', label: 'Buscar' },
  { href: '/comparar', label: 'Comparar' },
  { href: '/sobre', label: 'Sobre' },
];

export default function Nav() {
  const path = usePathname();

  const links = [...LINKS];
  if (MY_CLUB.id) {
    links.splice(1, 0, {
      href: `/clube/${MY_CLUB.platform}/${MY_CLUB.id}`,
      label: 'Meu clube',
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
      </div>
    </header>
  );
}
