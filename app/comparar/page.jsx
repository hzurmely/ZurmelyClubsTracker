import { Suspense } from 'react';
import Compare from '@/components/Compare';
import { currentDictionary } from '@/lib/i18n/server';

export async function generateMetadata() {
  const dic = await currentDictionary();
  return { title: dic.compare.title };
}

export default function CompararPage() {
  return (
    <Suspense
      fallback={
        <section className="block">
          <div className="wrap">
            <div className="skeleton" style={{ height: 240 }} />
          </div>
        </section>
      }
    >
      <Compare />
    </Suspense>
  );
}
