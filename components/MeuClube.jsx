'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Crest from '@/components/Crest';
import { FormStrip } from '@/components/StatCards';
import { useDic } from '@/components/I18nProvider';
import { lerMeuClube, limparMeuClube } from '@/lib/meuClube';
import { nf, pct, dec } from '@/lib/format';

/**
 * Favourite club card on the home page. The club is kept in the browser, so
 * whoever is using the site picks it, with no file to edit.
 */
export default function MeuClube() {
  const dic = useDic();
  const [escolha, setEscolha] = useState(null);
  const [dados, setDados] = useState(null);
  const [estado, setEstado] = useState('lendo'); // reading | empty | loading | ready | error

  const reler = useCallback(() => {
    const salvo = lerMeuClube();
    setEscolha(salvo);
    if (!salvo) {
      setDados(null);
      setEstado('vazio');
    }
  }, []);

  useEffect(() => {
    reler();
    window.addEventListener('zct:meu-clube', reler);
    window.addEventListener('storage', reler);
    return () => {
      window.removeEventListener('zct:meu-clube', reler);
      window.removeEventListener('storage', reler);
    };
  }, [reler]);

  useEffect(() => {
    if (!escolha) return;
    let vivo = true;
    setEstado('carregando');
    fetch(`/api/ea/meu-clube?platform=${escolha.platform}&id=${escolha.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no data'))))
      .then((d) => {
        if (!vivo) return;
        setDados(d);
        setEstado('pronto');
      })
      .catch(() => {
        if (!vivo) return;
        setEstado('erro');
      });
    return () => {
      vivo = false;
    };
  }, [escolha]);

  if (estado === 'lendo') return null;

  if (estado === 'vazio') {
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

  if (estado === 'carregando') {
    return (
      <section className="block">
        <div className="wrap stack">
          <div className="panel-title">{dic.myClub.title}</div>
          <div className="panel pad" style={{ color: 'var(--muted)' }}>
            {dic.myClub.loading(escolha?.name || dic.myClub.clubNumber(escolha?.id))}
          </div>
        </div>
      </section>
    );
  }

  if (estado === 'erro') {
    return (
      <section className="block">
        <div className="wrap stack">
          <div className="panel-title">{dic.myClub.title}</div>
          <div className="panel pad row row-wrap" style={{ gap: 12, color: 'var(--muted)' }}>
            <span className="grow">
              {dic.myClub.cantLoad(escolha?.name || dic.myClub.clubNumber(escolha?.id))}
            </span>
            <button type="button" className="btn ghost" onClick={() => setEscolha({ ...escolha })}>
              {dic.common.tryAgain}
            </button>
            <button type="button" className="btn ghost" onClick={limparMeuClube}>
              {dic.myClub.forget}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="block">
      <div className="wrap stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="panel-title">{dic.myClub.title}</div>
          <button type="button" className="btn ghost" onClick={limparMeuClube}>
            {dic.myClub.change}
          </button>
        </div>

        <Link
          href={`/clube/${dados.platform}/${dados.id}`}
          className="panel pad"
          style={{ display: 'block' }}
        >
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
      </div>
    </section>
  );
}
