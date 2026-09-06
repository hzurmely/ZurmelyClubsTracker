/**
 * Comparativo lado a lado da partida.
 *
 * Uma linha por número: a barra da esquerda cresce para dentro a partir do meu
 * clube, a da direita a partir do adversário. Cada lado leva o valor escrito ao
 * lado, e o lado que ganhou aquele item fica com o número em destaque, então dá
 * para ler tudo sem depender da cor.
 */
export default function ComparativoPartida({ linhas, nomeMeu, nomeDele }) {
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
        Os números de time são somados linha a linha dos jogadores, porque é assim que
        a EA publica. Contagens dividem a barra entre os dois lados; percentuais
        preenchem a metade de cada um com o próprio valor; a nota usa a faixa de 5 a 10.
        A EA não publica posse de bola, e por isso ela não aparece aqui: o mais perto
        disso é o volume de passes tentados.
      </p>
    </div>
  );
}
