import { nf, dec, pct } from '@/lib/format';

export function FormStrip({ form }) {
  if (!form?.length) return <span style={{ color: 'var(--dim)' }}>sem partidas recentes</span>;
  return (
    <div className="form-strip">
      {form.map((r, i) => (
        <span key={i} className={`pill ${r}`}>
          {r}
        </span>
      ))}
    </div>
  );
}

export default function StatCards({ overall, summary }) {
  const o = overall || {};
  const total = o.gamesPlayed || 1;
  const wPct = (o.wins / total) * 100;
  const dPct = (o.ties / total) * 100;
  const lPct = (o.losses / total) * 100;
  const saldo = summary?.saldo ?? 0;

  return (
    <div className="grid-stats">
      <div className="stat">
        <div className="k">Aproveitamento</div>
        <div className="v">{pct(summary?.aproveitamento)}</div>
        <div className="sub">
          {nf(o.wins)}V · {nf(o.ties)}E · {nf(o.losses)}D
        </div>
        <div className="bar">
          <i className="w" style={{ width: `${wPct}%` }} />
          <i className="d" style={{ width: `${dPct}%` }} />
          <i className="l" style={{ width: `${lPct}%` }} />
        </div>
      </div>

      <div className="stat">
        <div className="k">Saldo de gols</div>
        <div className={`v ${saldo >= 0 ? 'good' : 'bad'}`}>
          {saldo > 0 ? '+' : ''}
          {nf(saldo)}
        </div>
        <div className="sub">
          {nf(o.goals)} marcados · {nf(o.goalsAgainst)} sofridos
        </div>
      </div>

      <div className="stat">
        <div className="k">Gols por jogo</div>
        <div className="v">{dec(summary?.golsPorJogo, 2)}</div>
        <div className="sub">sofre {dec(summary?.sofridosPorJogo, 2)} por jogo</div>
      </div>

      <div className="stat">
        <div className="k">Sequências</div>
        <div className="v">{nf(o.unbeatenstreak)}</div>
        <div className="sub">
          jogos invicto · {nf(o.wstreak)} vitórias seguidas
        </div>
      </div>

      <div className="stat">
        <div className="k">Acessos</div>
        <div className="v good">{nf(o.promotions)}</div>
        <div className="sub">{nf(o.relegations)} rebaixamentos</div>
      </div>
    </div>
  );
}

export function Leaders({ summary }) {
  const items = [
    { lbl: 'Artilheiro', p: summary?.topScorer, val: (p) => p.goals, unit: 'gols' },
    { lbl: 'Garçom', p: summary?.topAssist, val: (p) => p.assists, unit: 'assist.' },
    {
      lbl: 'Melhor nota',
      p: summary?.topRating,
      val: (p) => dec(p.ratingAve, 2),
      unit: 'média',
    },
  ].filter((i) => i.p);

  if (!items.length) return null;

  return (
    <div className="grid-3">
      {items.map((i) => (
        <div className="leader" key={i.lbl}>
          <div className="grow">
            <div className="lbl">{i.lbl}</div>
            <div className="who">{i.p.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="n">{i.val(i.p)}</div>
            <div className="lbl">{i.unit}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
