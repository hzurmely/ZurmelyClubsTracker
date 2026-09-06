import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import { currentDictionary } from '@/lib/i18n/server';

export default async function NotFound() {
  const dic = await currentDictionary();

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 22, maxWidth: 640 }}>
        <h1 style={{ fontSize: 44 }}>{dic.notFound.title}</h1>
        <p style={{ color: 'var(--muted)' }}>{dic.notFound.text}</p>
        <SearchBar />
        <Link href="/" className="btn ghost" style={{ alignSelf: 'flex-start' }}>
          {dic.common.backHome}
        </Link>
      </div>
    </section>
  );
}
