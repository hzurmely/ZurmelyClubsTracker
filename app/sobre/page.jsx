import { SITE } from '@/lib/config';
import { currentDictionary } from '@/lib/i18n/server';

export async function generateMetadata() {
  const dic = await currentDictionary();
  return { title: dic.nav.about };
}

export default async function SobrePage() {
  const dic = await currentDictionary();

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 26, maxWidth: 780 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>{dic.about.title(SITE.name)}</h1>
          <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 17 }}>{dic.about.lead}</p>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          {dic.about.faq.map((f) => (
            <div className="panel pad" key={f.q}>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{f.q}</h3>
              <p style={{ color: 'var(--muted)' }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
