/**
 * ZurmelyClubsTracker no desktop.
 *
 * O programa sobe o proprio site (a build standalone do Next, na pasta site/)
 * num servidor local e abre uma janela apontando para ele. Rodando aqui, os
 * pedidos para a EA saem do IP da sua casa, que a EA nao bloqueia, entao o
 * desvio pelo leitor publico quase nunca precisa entrar.
 */

const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const http = require('http');

// Empacotado sem asar, entao os arquivos ficam soltos em resources/app e o
// __dirname aponta para la, igual ao modo de desenvolvimento.
const raiz = __dirname;
const pastaSite = path.join(raiz, 'site');
const servidorJs = path.join(pastaSite, 'server.js');

let janela = null;
let servidor = null;
let endereco = null;

/** Pede ao sistema uma porta livre. Evita brigar com outros programas. */
function portaLivre() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** Bate na porta ate o Next responder, ou desiste depois de uns 30 segundos. */
function esperarSubir(url, tentativas = 150) {
  return new Promise((resolve, reject) => {
    let restantes = tentativas;
    const tentar = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        restantes -= 1;
        if (restantes <= 0) return reject(new Error('O servidor local nao subiu.'));
        setTimeout(tentar, 200);
      });
      req.setTimeout(2000, () => req.destroy());
    };
    tentar();
  });
}

async function subirServidor() {
  const porta = await portaLivre();
  endereco = `http://127.0.0.1:${porta}`;

  // ELECTRON_RUN_AS_NODE faz o proprio executavel virar um node comum,
  // entao nao precisa ter Node instalado na maquina.
  servidor = spawn(process.execPath, [servidorJs], {
    cwd: pastaSite,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(porta),
      HOSTNAME: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  servidor.stdout.on('data', (d) => process.stdout.write(`[site] ${d}`));
  servidor.stderr.on('data', (d) => process.stderr.write(`[site] ${d}`));
  servidor.on('exit', (code) => {
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox(
        'ZurmelyClubsTracker',
        `O servidor interno parou (codigo ${code}). Feche e abra o programa de novo.`,
      );
    }
  });

  await esperarSubir(endereco);
  return endereco;
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#07080b',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(raiz, 'icone.png'),
    title: 'ZurmelyClubsTracker',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  janela.loadFile(path.join(raiz, 'abrindo.html'));
  janela.once('ready-to-show', () => janela.show());

  // Link para fora do site abre no navegador, nao dentro do programa.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (evento, url) => {
    if (endereco && !url.startsWith(endereco) && !url.startsWith('file://')) {
      evento.preventDefault();
      shell.openExternal(url);
    }
  });

  janela.on('closed', () => {
    janela = null;
  });
}

function montarMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Recarregar',
          accelerator: 'CmdOrCtrl+R',
          click: () => janela && endereco && janela.loadURL(endereco),
        },
        {
          label: 'Abrir no navegador',
          click: () => endereco && shell.openExternal(endereco),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'zoomIn', label: 'Aumentar' },
        { role: 'zoomOut', label: 'Diminuir' },
        { role: 'resetZoom', label: 'Tamanho normal' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela cheia' },
        { role: 'toggleDevTools', label: 'Ferramentas de desenvolvedor' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const unico = app.requestSingleInstanceLock();
if (!unico) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (janela) {
      if (janela.isMinimized()) janela.restore();
      janela.focus();
    }
  });

  app.whenReady().then(async () => {
    montarMenu();
    criarJanela();
    try {
      const url = await subirServidor();
      if (janela) janela.loadURL(url);
    } catch (err) {
      dialog.showErrorBox('ZurmelyClubsTracker', String(err && err.message ? err.message : err));
      app.quit();
    }
  });

  app.on('window-all-closed', () => app.quit());

  app.on('before-quit', () => {
    app.isQuitting = true;
    if (servidor && !servidor.killed) servidor.kill();
  });
}
