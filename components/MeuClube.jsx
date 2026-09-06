'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Crest from '@/components/Crest';
import { FormStrip } from '@/components/StatCards';
import { useDic } from '@/components/I18nProvider';
import { lerMeusClubes, limparMeuClube, mesmoClube, LIMITE } from '@/lib/meuClube';
import { nf, pct, dec } from '@/lib/format';

/**
 * Favourite club cards on the home page. Up to three clubs live in the browser,
 * so whoever is using the site picks them, with no file to edit.
 *
 * Each card loads on its own: one club failing to come back from EA must not
 * take the other two down with it.
 */
function Cartao({ escolha, dic }) {
  const [dados, setDados] = useState(null);
  const [estado, setEstado] = useState('carregando');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    setEstado('carregando');
    fetch(`/api/ea/meu-clube?platform=${escolha.platform}&id=${escolha.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no data'))))
      .then((d) => {
        if (!vivo) return;
        setDados(d);
        setEstado('pronto');
      })
      .catch(() => vivo && setEstado('erro'));
    return () => {
      vivo = false;
    };
  }, [escolha.id, escolha.platform, tentativa]);

  const nome = escolha.name || dic.myClub.clubNumber(escolha.id);

  if (estado === 'carregando') {
    return (
      <div className="panel pad" style={{ color: 'var(--muted)' }}>
        {dic.myClub.loading(nome)}
      </div>
    );
  }

  if (estado === 'erro') {
    return (
      <div className="panel pad row row-wrap" style={{ gap: 12, color: 'var(--muted)' }}>
        <span className="grow">{dic.myClub.cantLoad(nome)}</span>
        <button type="button" className="btn ghost" onClick={() => setTentativa((t) => t + 1)}>
          {dic.common.tryAgain}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => limparMeuClube(escolha.id, escolha.platform)}
        >
          {dic.myClub.forget}
        </button>
      </div>
    );
  }

  return (
    <div className="meu-clube-card">
      <Link href={`/clube/${dados.platform}/${dados.id}`} className="panel pad" style={{ display: 'block' }}>
        <div className="row row-wrap" style={{ gap: 20 }}>
          <Crest club={dados} size={72} radius={18} />
          <div className="grow stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: 26 }}>{dados.name}</h2>
            <div className="row row-wrap" style={{ gap: 16, color: 'var(--muted)' }}>
              <span>
                <strong style={{ color: 'var(--text)' }}>{nf(dados.gamesPlayed, dic)}</strong>{' '}
                {dic.common.games}
              </span>
              <span>
                {dic.common.winRate}{' '}
                <strong style={{ color: 'var(--accent)' }}>{pct(dados.aproveitamento)}</strong>
              </span>
              <span>
                {dic.common.goalsAvg}{' '}
                <strong style={{ color: 'var(--text)' }}>{dec(dados.golsPorJogo, 2, dic)}</strong>
              </span>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: '.13em',
                color: 'var(--muted)',
                textTransform: 'uppercase',
              }}
            >
              {dic.common.form}
            </span>
            <FormStrip form={dados.form} dic={dic} />
          </div>
        </div>
      </Link>
      <button
        type="button"
        className="tirar"
        onClick={() => limparMeuClube(escolha.id, escolha.platform)}
        title={dic.myClub.unsetTitle}
        aria-label={dic.myClub.unsetTitle}
      >
        ✕
      </button>
    </div>
  );
}

export default function MeuClube() {
  const dic = useDic();
  const [clubes, setClubes] = useState(null);

  const reler = useCallback(() => setClubes(lerMeusClubes()), []);

  useEffect(() => {
    reler();
    window.addEventListener('zct:meu-clube', reler);
    window.addEventListener('storage', reler);
    return () => {
      window.removeEventListener('zct:meu-clube', reler);
      window.removeEventListener('storage', reler);
    };
  }, [reler]);

  // Still reading from the browser: render nothing rather than a wrong state.
  if (clubes === null) return null;

  if (!clubes.length) {
    return (
      <section className="block">
        <div className="wrap">
          {/* The banner follows the width of its text and stays centred, instead
              of stretching end to end and leaving a big gap on the right. */}
          <div
            className="banner"
            style={{ width: 'fit-content', maxWidth: '100%', margin: '0 auto', alignItems: 'center' }}
          >
            <span>⭐</span>
            <span>
              {dic.myClub.emptyA}
              <strong>{dic.myClub.emptyB}</strong>.
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="block">
      <div className="wrap stack">
        <div className="row spread row-wrap">
          <div className="panel-title" style={{ margin: 0 }}>
            {clubes.length === 1 ? dic.myClub.title : dic.myClub.titlePlural}
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 13 }}>
            {dic.myClub.counter(clubes.length, LIMITE)}
          </span>
        </div>

        <div className="stack" style={{ gap: 12 }}>
          {clubes.map((c) => (
            <Cartao key={`${c.platform}-${c.id}`} escolha={c} dic={dic} />
          ))}
        </div>
      </div>
    </section>
  );
}
