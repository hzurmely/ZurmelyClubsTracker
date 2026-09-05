# Empacotando o programa de desktop

O que está aqui é a casca do Electron: uma janela que sobe o próprio site num
servidor local e aponta para ele. O site em si entra na pasta `site/`, que é
gerada pelo build e por isso não fica versionada.

## Receita

```bash
# 1. build do Next no modo standalone
cd ..
BUILD_DESKTOP=1 npm run build

# 2. copia a build para dentro da casca
rm -rf desktop/site
cp -r .next/standalone desktop/site
mkdir -p desktop/site/.next
cp -r .next/static desktop/site/.next/static

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
```

O resultado fica em `dist/ZurmelyClubsTracker-win32-x64`, com o `.exe` na raiz.

Para trocar de sistema, mude `--platform` para `darwin` ou `linux`.

## Detalhes que importam

O `main.js` sobe o servidor com `process.execPath` e `ELECTRON_RUN_AS_NODE=1`,
ou seja, o próprio executável do Electron faz o papel do Node. Por isso o
programa não exige Node instalado na máquina de quem usa.

A porta é sorteada entre as livres a cada abertura, então não briga com outros
programas.

O `--asar=false` é obrigatório: com o asar ligado, o `server.js` fica dentro de
um arquivo empacotado e o processo filho não consegue lê-lo.

Para deixar o pacote menor, dá para apagar os arquivos de `locales/` que você
não usa. Só `en-US.pak` e o do seu idioma bastam, e isso corta uns 40 MB.

## Por que o programa é melhor que o site publicado

A EA bloqueia as faixas de IP de datacenter. Rodando na máquina de casa, o
pedido sai de um IP residencial e a EA responde direto, sem precisar do desvio
pelo leitor que o `lib/ea.js` usa quando está na nuvem.
