import { Suspense } from 'react';
import Compare from '@/components/Compare';

export const metadata = { title: 'Comparar clubes' };

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
