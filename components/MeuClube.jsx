'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Crest from '@/components/Crest';
import { FormStrip } from '@/components/StatCards';
import { lerMeuClube, limparMeuClube } from '@/lib/meuClube';
import { nf, pct, dec } from '@/lib/format';

/**
 * Cartão do clube favorito na home. O clube fica guardado no navegador, então
 * quem escolhe é quem está usando, sem mexer em arquivo nenhum.
 */
export default function MeuClube() {
  const [escolha, setEscolha] = useState(null);
  const [dados, setDados] = useState(null);
  const [estado, setEstado] = useState('lendo'); // lendo | vazio | carregando | pronto | erro

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
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('nao veio'))))
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
          {/* A faixa acompanha o tamanho do texto e fica centrada, em vez de
              esticar de ponta a ponta e deixar um vazio grande à direita. */}
          <div
            className="banner"
            style={{ width: 'fit-content', maxWidth: '100%', margin: '0 auto', alignItems: 'center' }}
          >
            <span>⭐</span>
            <span>
              Quer o seu clube fixo aqui na home? Busque ele acima, abra a página dele
              e clique em <strong>Definir como meu clube</strong>.
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
          <div className="panel-title">Meu clube</div>
          <div className="panel pad" style={{ color: 'var(--muted)' }}>
            Carregando {escolha?.name || `o clube #${escolha?.id}`}...
          </div>
        </div>
      </section>
    );
  }

  if (estado === 'erro') {
    return (
      <section className="block">
        <div className="wrap stack">
          <div className="panel-title">Meu clube</div>
          <div className="panel pad row row-wrap" style={{ gap: 12, color: 'var(--muted)' }}>
            <span className="grow">
              Não consegui carregar {escolha?.name || `o clube #${escolha?.id}`} agora.
            </span>
            <button type="button" className="btn ghost" onClick={() => setEscolha({ ...escolha })}>
              Tentar de novo
            </button>
            <button type="button" className="btn ghost" onClick={limparMeuClube}>
              Esquecer este clube
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
          <div className="panel-title">Meu clube</div>
          <button type="button" className="btn ghost" onClick={limparMeuClube}>
            Trocar
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
                  <strong style={{ color: 'var(--text)' }}>{nf(dados.gamesPlayed)}</strong> jogos
                </span>
                <span>
                  Aproveitamento{' '}
                  <strong style={{ color: 'var(--accent)' }}>{pct(dados.aproveitamento)}</strong>
                </span>
                <span>
                  Média de gols{' '}
                  <strong style={{ color: 'var(--text)' }}>{dec(dados.golsPorJogo, 2)}</strong>
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
                Forma
              </span>
              <FormStrip form={dados.form} />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
