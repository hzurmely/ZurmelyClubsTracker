import { nf, dec, pct } from '@/lib/format';

/**
 * These render on the server for the club page and on the client for the home
 * card, so the dictionary arrives as a prop instead of through context.
 */
export function FormStrip({ form, dic }) {
  if (!form?.length) {
    return <span style={{ color: 'var(--dim)' }}>{dic?.stats.noMatches}</span>;
  }
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

export default function StatCards({ overall, summary, dic }) {
  const o = overall || {};
  const total = o.gamesPlayed || 1;
  const wPct = (o.wins / total) * 100;
  const dPct = (o.ties / total) * 100;
  const lPct = (o.losses / total) * 100;
  const saldo = summary?.saldo ?? 0;
  const t = dic.stats;

  return (
    <div className="grid-stats">
      <div className="stat">
        <div className="k">{t.winRate}</div>
        <div className="v">{pct(summary?.aproveitamento)}</div>
        <div className="sub">
          {nf(o.wins, dic)}V · {nf(o.ties, dic)}E · {nf(o.losses, dic)}D
        </div>
        <div className="bar">
          <i className="w" style={{ width: `${wPct}%` }} />
          <i className="d" style={{ width: `${dPct}%` }} />
          <i className="l" style={{ width: `${lPct}%` }} />
        </div>
      </div>

      <div className="stat">
        <div className="k">{t.goalDiff}</div>
        <div className={`v ${saldo >= 0 ? 'good' : 'bad'}`}>
          {saldo > 0 ? '+' : ''}
          {nf(saldo, dic)}
        </div>
        <div className="sub">
          {nf(o.goals, dic)} {t.scored} · {nf(o.goalsAgainst, dic)} {t.conceded}
        </div>
      </div>

      <div className="stat">
        <div className="k">{t.goalsPerGame}</div>
        <div className="v">{dec(summary?.golsPorJogo, 2, dic)}</div>
        <div className="sub">{t.concedes(dec(summary?.sofridosPorJogo, 2, dic))}</div>
      </div>

      <div className="stat">
        <div className="k">{t.streaks}</div>
        <div className="v">{nf(o.unbeatenstreak, dic)}</div>
        <div className="sub">
          {t.unbeaten} · {t.winsInRow(nf(o.wstreak, dic))}
        </div>
      </div>

      <div className="stat">
        <div className="k">{t.promotions}</div>
        <div className="v good">{nf(o.promotions, dic)}</div>
        <div className="sub">{t.relegations(nf(o.relegations, dic))}</div>
      </div>
    </div>
  );
}

export function Leaders({ summary, dic }) {
  const items = [
    { lbl: dic.club.topScorer, d: summary?.topScorer, unit: dic.common.goals, fmt: (v) => nf(v, dic) },
    { lbl: dic.club.playmaker, d: summary?.topAssist, unit: dic.common.assists, fmt: (v) => nf(v, dic) },
    { lbl: dic.club.bestRating, d: summary?.topRating, unit: dic.club.average, fmt: (v) => dec(v, 2, dic) },
  ].filter((i) => i.d);

  if (!items.length) return null;

  return (
    <div className="grid-3">
      {items.map((i) => (
        <div className="leader" key={i.lbl}>
          <div className="grow">
            <div className="lbl">{i.lbl}</div>
            <div className="who">{i.d.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="n">{i.fmt(i.d.value)}</div>
            <div className="lbl">{i.unit}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
