import Crest from '@/components/Crest';
import DefinirMeuClube from '@/components/DefinirMeuClube';
import { divisionName, kitColor, nf, pct } from '@/lib/format';
import { PLATFORM_LABEL } from '@/lib/config';

export default function ClubHeader({ info, overall, summary, platform, dic }) {
  const color = kitColor(info?.customKit?.kitColor1);

  return (
    <div className="clubhead" style={{ '--club': color }}>
      <div className="content">
        <Crest club={info} size={92} radius={20} />

        <div className="grow stack" style={{ gap: 10 }}>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <span className="tag">{PLATFORM_LABEL[platform] || platform}</span>
            <span className="tag">
              {dic.club.id} {info?.clubId}
            </span>
            {info?.stadium ? <span className="tag">🏟 {info.stadium}</span> : null}
            {overall?.bestDivision ? (
              <span className="tag hot">{dic.club.bestDivision(divisionName(overall.bestDivision, dic))}</span>
            ) : null}
            {overall?.wstreak > 2 ? (
              <span className="tag hot">{dic.club.winStreak(overall.wstreak)}</span>
            ) : null}
          </div>

          <div className="row row-wrap" style={{ gap: 14, alignItems: 'center' }}>
            <h1 className="grow">{info?.name}</h1>
            <DefinirMeuClube id={info?.clubId} platform={platform} name={info?.name} />
          </div>

          <div className="row row-wrap" style={{ gap: 18, color: 'var(--muted)' }}>
            <span>
              <strong style={{ color: 'var(--text)' }}>{nf(overall?.gamesPlayed, dic)}</strong>{' '}
              {dic.common.games}
            </span>
            <span>
              <strong style={{ color: 'var(--win)' }}>{nf(overall?.wins, dic)}</strong> V ·{' '}
              <strong style={{ color: 'var(--draw)' }}>{nf(overall?.ties, dic)}</strong> E ·{' '}
              <strong style={{ color: 'var(--loss)' }}>{nf(overall?.losses, dic)}</strong> D
            </span>
            <span>
              {dic.common.winRate}{' '}
              <strong style={{ color: 'var(--text)' }}>
                {pct(summary?.aproveitamento)}
              </strong>
            </span>
            {overall?.skillRating ? (
              <span>
                {dic.club.skillRating}{' '}
                <strong style={{ color: 'var(--text)' }}>{nf(overall.skillRating, dic)}</strong>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
