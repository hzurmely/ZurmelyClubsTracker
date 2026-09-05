import Crest from '@/components/Crest';
import { divisionName, kitColor, nf, pct } from '@/lib/format';
import { PLATFORM_LABEL } from '@/lib/config';

export default function ClubHeader({ info, overall, summary, platform }) {
  const color = kitColor(info?.customKit?.kitColor1);

  return (
    <div className="clubhead" style={{ '--club': color }}>
      <div className="content">
        <Crest club={info} size={92} radius={20} />

        <div className="grow stack" style={{ gap: 10 }}>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <span className="tag">{PLATFORM_LABEL[platform] || platform}</span>
            <span className="tag">ID {info?.clubId}</span>
            {info?.stadium ? <span className="tag">🏟 {info.stadium}</span> : null}
            {overall?.bestDivision ? (
              <span className="tag hot">
                Melhor divisão: {divisionName(overall.bestDivision)}
              </span>
            ) : null}
            {overall?.wstreak > 2 ? (
              <span className="tag hot">🔥 {overall.wstreak} vitórias seguidas</span>
            ) : null}
          </div>

          <h1>{info?.name}</h1>

          <div className="row row-wrap" style={{ gap: 18, color: 'var(--muted)' }}>
            <span>
              <strong style={{ color: 'var(--text)' }}>{nf(overall?.gamesPlayed)}</strong>{' '}
              jogos
            </span>
            <span>
              <strong style={{ color: 'var(--win)' }}>{nf(overall?.wins)}</strong> V ·{' '}
              <strong style={{ color: 'var(--draw)' }}>{nf(overall?.ties)}</strong> E ·{' '}
              <strong style={{ color: 'var(--loss)' }}>{nf(overall?.losses)}</strong> D
            </span>
            <span>
              Aproveitamento{' '}
              <strong style={{ color: 'var(--text)' }}>
                {pct(summary?.aproveitamento)}
              </strong>
            </span>
            {overall?.skillRating ? (
              <span>
                Skill rating{' '}
                <strong style={{ color: 'var(--text)' }}>{nf(overall.skillRating)}</strong>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
