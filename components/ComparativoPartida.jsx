/**
 * Side by side match comparison.
 *
 * One row per number: the left bar grows inward from my club, the right one
 * from the opponent. Each side carries its value written next to it, and the
 * side that won that item gets the number highlighted, so it all reads without
 * depending on colour.
 */
export default function ComparativoPartida({ linhas, nomeMeu, nomeDele, dic }) {
  if (!linhas?.length) return null;

  return (
    <div className="panel pad comparativo">
      <div className="cmp-legenda">
        <span>
          <i className="marca meu" /> {nomeMeu}
        </span>
        <span>
          <i className="marca dele" /> {nomeDele}
        </span>
      </div>

      <ul className="cmp-lista">
        {linhas.map((l) => (
          <li key={l.chave}>
            <span className={`cmp-valor esq ${l.vencedor === 'meu' ? 'forte' : ''}`}>
              {l.textoMeu}
            </span>
            <span className="cmp-trilho esq">
              <i className="meu" style={{ width: `${l.escalaMeu}%` }} />
            </span>
            <span className="cmp-rotulo">{l.rotulo}</span>
            <span className="cmp-trilho dir">
              <i className="dele" style={{ width: `${l.escalaDele}%` }} />
            </span>
            <span className={`cmp-valor dir ${l.vencedor === 'dele' ? 'forte' : ''}`}>
              {l.textoDele}
            </span>
          </li>
        ))}
      </ul>

      <p className="nota-rodape" style={{ marginTop: 14 }}>
        {dic.match.comparisonNote}
      </p>
    </div>
  );
}
