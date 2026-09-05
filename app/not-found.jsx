import Link from 'next/link';
import SearchBar from '@/components/SearchBar';

export default function NotFound() {
  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 22, maxWidth: 640 }}>
        <h1 style={{ fontSize: 44 }}>Bola pra fora</h1>
        <p style={{ color: 'var(--muted)' }}>
          Essa página não existe. Que tal buscar um clube?
        </p>
        <SearchBar />
        <Link href="/" className="btn ghost" style={{ alignSelf: 'flex-start' }}>
          Voltar para a home
        </Link>
      </div>
    </section>
  );
}
