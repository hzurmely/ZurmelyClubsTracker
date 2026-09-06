# Empacotando o programa de desktop

O que está aqui é a casca do Electron: uma janela que sobe o próprio site num
servidor local e aponta para ele. O site em si entra na pasta `site/`, que é
gerada pelo build e por isso não fica versionada. Os ícones binários também não
ficam, e a receita abaixo gera os dois.

## Receita

```bash
# 1. build do Next no modo standalone
#    Confira antes que o .env.local NAO tem EA_DEMO=1, senao os dados ficticios
#    entram no executavel.
cd ..
rm -rf .next desktop/site
BUILD_DESKTOP=1 npm run build

# 2. copia a build para dentro da casca
cp -r .next/standalone desktop/site
mkdir -p desktop/site/.next
cp -r .next/static desktop/site/.next/static
cp -r public desktop/site/public 2>/dev/null || true

# 3. gera os icones a partir do app/icon.svg
pip install cairosvg pillow --break-system-packages
python3 - <<'FIM'
import cairosvg
from PIL import Image
cairosvg.svg2png(url='app/icon.svg', write_to='desktop/icone.png',
                 output_width=512, output_height=512)
cairosvg.svg2png(url='app/icon.svg', write_to='/tmp/i256.png',
                 output_width=256, output_height=256)
Image.open('/tmp/i256.png').convert('RGBA').save(
    'desktop/icone.ico', format='ICO',
    sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
FIM

# 4. empacota (roda em Linux, Mac ou Windows)
npm install -g @electron/packager
npx electron-packager desktop ZurmelyClubsTracker \
  --platform=win32 --arch=x64 --out=dist --overwrite \
  --electron-version=38.4.0 --icon=desktop/icone.ico \
  --prune=false --asar=false

# 5. corta os idiomas que ninguem usa (uns 40 MB a menos)
cd dist/ZurmelyClubsTracker-win32-x64/locales
ls | grep -vE '^(en-US|pt-BR|pt-PT)\.pak$' | xargs rm -f
```

O resultado fica em `dist/ZurmelyClubsTracker-win32-x64`, com o `.exe` na raiz.

Para trocar de sistema, mude `--platform` para `darwin` ou `linux`.

## Conferindo antes de mandar para alguém

Dá para subir o servidor empacotado sem abrir o Electron, e é assim que se
descobre um build quebrado sem estar no Windows:

```bash
EA_DEMO=1 PORT=4050 node desktop/site/server.js
```

Depois abra as rotas e veja se todas respondem 200:

```
/
/clube/common-gen5/1001
/clube/common-gen5/1001/jogador/Maestro10
/clube/common-gen5/1001/partida/demo-0
/comparar
/sobre
```

## Detalhes que importam

O `main.js` sobe o servidor com `process.execPath` e `ELECTRON_RUN_AS_NODE=1`,
ou seja, o próprio executável do Electron faz o papel do Node. Por isso o
programa não exige Node instalado na máquina de quem usa.

A porta é sorteada entre as livres a cada abertura, então não briga com outros
programas.

O `--asar=false` é obrigatório: com o asar ligado, o `server.js` fica dentro de
um arquivo empacotado e o processo filho não consegue lê-lo. O packager avisa
"asar parameter set to an invalid value (false), ignoring and disabling asar",
que é justamente o que se quer.

O `main.js` monta os caminhos com `__dirname`, e não com `process.resourcesPath`,
porque sem asar a pasta `site/` fica ao lado dele.

## Por que o programa é melhor que o site publicado

A EA bloqueia as faixas de IP de datacenter. Rodando na máquina de casa, o
pedido sai de um IP residencial e a EA responde direto, sem precisar do desvio
pelo leitor `r.jina.ai` que o `lib/ea.js` usa quando está na nuvem. Na prática
isso quer dizer páginas mais rápidas e sem depender de um serviço de terceiro.

## Entregando

O pacote passa de 300 MB e o zip fica perto de 130 MB, acima do limite de vários
canais de envio. O jeito que funcionou aqui foi fatiar o zip em partes de 19 MB e
mandar junto um `INSTALAR.bat` que junta tudo com `copy /b`, extrai com o
`Expand-Archive` do PowerShell e cria o atalho na área de trabalho.

O Windows Defender costuma avisar sobre executável desconhecido na primeira
abertura, porque o pacote não é assinado. É esperado.
