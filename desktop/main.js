/**
 * ZurmelyClubsTracker on the desktop.
 *
 * The program brings up the site itself (Next's standalone build, in the site/
 * folder) on a local server and opens a window pointing at it. Running here, the
 * requests to EA go out from your home IP, which EA does not block, so the
 * detour through the public reader almost never has to kick in.
 */

const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const http = require('http');

// Packaged without asar, so the files sit loose in resources/app and __dirname
// points there, just like in development mode.
const raiz = __dirname;
const pastaSite = path.join(raiz, 'site');
const servidorJs = path.join(pastaSite, 'server.js');

let janela = null;
let servidor = null;
let endereco = null;

/** Asks the system for a free port. Avoids fighting with other programs. */
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

/** Knocks on the port until Next answers, or gives up after about 30 seconds. */
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

  // ELECTRON_RUN_AS_NODE turns the executable itself into a plain node, so
  // there is no need to have Node installed on the machine.
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

  // A link leading outside the site opens in the browser, not inside the program.
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

/**
 * Menu labels follow the system language, the same way the site follows the
 * browser. Only two languages exist, so anything that is not Portuguese gets
 * English.
 */
const MENU = {
  pt: {
    file: 'Arquivo',
    reload: 'Recarregar',
    openInBrowser: 'Abrir no navegador',
    quit: 'Sair',
    view: 'Exibir',
    zoomIn: 'Aumentar',
    zoomOut: 'Diminuir',
    resetZoom: 'Tamanho normal',
    fullscreen: 'Tela cheia',
    devTools: 'Ferramentas de desenvolvedor',
  },
  en: {
    file: 'File',
    reload: 'Reload',
    openInBrowser: 'Open in browser',
    quit: 'Quit',
    view: 'View',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetZoom: 'Actual size',
    fullscreen: 'Full screen',
    devTools: 'Developer tools',
  },
};

function montarMenu() {
  const t = String(app.getLocale() || '').toLowerCase().startsWith('pt') ? MENU.pt : MENU.en;
  const template = [
    {
      label: t.file,
      submenu: [
        {
          label: t.reload,
          accelerator: 'CmdOrCtrl+R',
          click: () => janela && endereco && janela.loadURL(endereco),
        },
        {
          label: t.openInBrowser,
          click: () => endereco && shell.openExternal(endereco),
        },
        { type: 'separator' },
        { role: 'quit', label: t.quit },
      ],
    },
    {
      label: t.view,
      submenu: [
        { role: 'zoomIn', label: t.zoomIn },
        { role: 'zoomOut', label: t.zoomOut },
        { role: 'resetZoom', label: t.resetZoom },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t.fullscreen },
        { role: 'toggleDevTools', label: t.devTools },
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
