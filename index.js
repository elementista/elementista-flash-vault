// <!-- inicio do bloco 1: Importações, Constantes e Diretivas Pepper Flash -->
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isPackaged = app.isPackaged;
const baseDir = isPackaged ? path.join(process.resourcesPath, 'flashver') : path.join(__dirname, 'flashver');
const isWindows = process.platform === 'win32';
const pluginName = isWindows ? 'pepflashplayer.dll' : 'libpepflashplayer.so';
const pluginPath = path.join(baseDir, pluginName);

// Diretivas estáveis do motor Pepper Flash no núcleo do Chromium
app.commandLine.appendSwitch('ppapi-flash-path', pluginPath);
app.commandLine.appendSwitch('register-pepper-plugins', `${pluginPath};application/x-shockwave-flash`);
app.commandLine.appendSwitch('enable-plugins');
app.commandLine.appendSwitch('always-authorize-plugins', 'true');
app.commandLine.appendSwitch('allow-outdated-plugins', 'true');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform');

app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-zygote');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('audio-buffer-size', '512');

// Evita que o app acumule lixo ou reduza a velocidade do processamento em background
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

if (!isWindows) {
    app.commandLine.appendSwitch('disable-audio-output-resampler');
    app.commandLine.appendSwitch('try-supported-channel-layouts');
}
// <!-- fim do bloco 1 -->

// <!-- inicio do bloco 2: Menus de Sistema e Gerenciamento de Janelas -->
function configurarMenuSistemaPTBR(win) {
    const templateMenu = [
        { label: 'Arquivo', submenu: [ { label: 'Sair', role: 'quit' } ] },
        {
            label: 'Exibir',
            submenu: [
                { label: 'Recarregar Jogo', accelerator: 'F5', click(item, focusedWindow) { if (focusedWindow) focusedWindow.webContents.reload(); } },
                { type: 'separator' },
                { label: 'Alternar Tela Cheia', accelerator: 'F11', click(item, focusedWindow) { if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen()); } }
            ]
        },
        {
            label: 'Ferramentas',
            submenu: [
                {
                    label: 'Buscar Jogo',
                    accelerator: 'CmdOrCtrl+F',
                    click(item, focusedWindow) {
                        if (focusedWindow) {
                            focusedWindow.webContents.send('focar-pesquisa');
                        }
                    }
                }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre o Elementista Flash Vault',
                    click(item, focusedWindow) {
                        const infoVersao = isPackaged ? app.getVersion() : '1.0.0';
                        const sistemaOperacional = process.platform === 'win32' ? 'Windows' : 'Linux';

                        dialog.showMessageBox(focusedWindow, {
                            type: 'info',
                            title: 'Sobre o Aplicativo',
                            buttons: ['Fechar'],
                            message: 'Elementista Flash Vault',
                            detail: `Versão: v${infoVersao}\n` +
                                    `Ambiente de Execução: ${sistemaOperacional}\n` +
                                    `Projeto: Código Aberto\n\n` +
                                    `Desenvolvido por: elementista / pacjay`
                        });
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(templateMenu);
    Menu.setApplicationMenu(menu);
}

function criarJanela() {
    // ⚡ CONFIGURAÇÃO PERSISTENTE: Tranca o armazenamento local em disco
    const idSessaoFixa = "persist:vault_main";

    let win = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "Elementista Flash Vault v1.0.0",
        icon: path.join(__dirname, 'logo-escudo.png'),
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true,
            plugins: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
            partition: idSessaoFixa
        }
    });
    win.loadURL(path.join('file://', __dirname, 'inicio.html'));
    configurarMenuSistemaPTBR(win);
}
// <!-- fim do bloco 2 -->
// <!-- inicio do bloco 3: Extração Multiplataforma e Inicialização do Ambiente -->
function inicializarAmbienteExecucao() {
    if (!isPackaged) return;

    const subPasta = isWindows ? 'win' : 'linux';

    if (isWindows) {
        const pastaUnpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'binarios', 'win');
        if (fs.existsSync(pastaUnpacked)) return;
    }

    const pastaTempBase = path.join('/tmp', 'elementista-vault');
    const pastaTempFisica = path.join(pastaTempBase, 'binarios', subPasta);

    try {
        if (!fs.existsSync(pastaTempFisica)) {
            fs.mkdirSync(pastaTempFisica, { recursive: true });
        }

        const executaveisSistemas = ['mednafen_snes', 'mednafen_mega', 'stella'];

        executaveisSistemas.forEach(nomeBinario => {
            const nomeComExt = isWindows ? `${nomeBinario}.exe` : nomeBinario;
            const origemFisica = path.join(process.resourcesPath, 'app.asar.unpacked', 'binarios', subPasta, nomeComExt);
            const destinoFisico = path.join(pastaTempFisica, nomeComExt);

            if (fs.existsSync(origemFisica)) {
                fs.copyFileSync(origemFisica, destinoFisico);
                if (!isWindows) {
                    fs.chmodSync(destinoFisico, '755');
                }
            }
        });

        // ⚡ REPARO CIRÚRGICO: Injeta o mednafen.cfg no ambiente temporário de produção apenas no build final
        const origemCfg = path.join(process.resourcesPath, 'app.asar.unpacked', 'binarios', subPasta, 'mednafen.cfg');
        const destinoCfg = path.join(pastaTempFisica, 'mednafen.cfg');
        if (fs.existsSync(origemCfg)) {
            fs.copyFileSync(origemCfg, destinoCfg);
        }

    } catch (erro) {
        console.error('Falha ao estruturar os binários externos no sistema:', erro.message);
    }
}
// <!-- fim do bloco 3 -->
// <!-- inicio do bloco 4: Motor de Execução dos Emuladores por CLI (Totalmente Intacto) -->
ipcMain.on('executar-emulador-portatil', (event, caminhoDaRom) => {
    const sistemaAtivo = process.platform;
    const ext = path.extname(caminhoDaRom).toLowerCase();

    const ehAtari = ['.a26', '.rom', '.lnx', '.zip', '.gz', '.tar', '.txt', '.text'].includes(ext);
    const ehMegaDrive = ['.md', '.smd'].includes(ext) || (ext === '.bin' && caminhoDaRom.toLowerCase().includes('mega'));

    let motorNome = 'mednafen_snes';
    if (ehAtari) {
        motorNome = isWindows ? 'stella.exe' : 'stella';
    } else if (ehMegaDrive) {
        motorNome = isWindows ? 'mednafen_mega.exe' : 'mednafen_mega';
    } else {
        motorNome = isWindows ? 'mednafen_snes.exe' : 'mednafen_snes';
    }

    const subPasta = isWindows ? 'win' : 'linux';

    let executavelEmulador = isPackaged
        ? (isWindows
            ? path.join(process.resourcesPath, 'app.asar.unpacked', 'binarios', 'win', motorNome)
            : path.join('/tmp', 'elementista-vault', 'binarios', 'linux', motorNome))
        : path.join(__dirname, 'binarios', subPasta, motorNome);

    let rotaRomFinal = caminhoDaRom;
    if (isWindows) {
        executavelEmulador = path.normalize(executavelEmulador);
        rotaRomFinal = path.normalize(caminhoDaRom.replace(/^file:[\\/]+/i, ''));
    }

    const diretorioPaiEmulador = path.dirname(executavelEmulador);
    const envCustom = { ...process.env };
    if (ehAtari && !isWindows) {
        envCustom.SDL_AUDIODRIVER = 'pulse';
    }

    let parametrosExecucao = [];
    
    if (ehMegaDrive) {
        parametrosExecucao.push(
            '-md.correct_aspect', '0',
            '-md.stretch', 'full'
        );
        if (isWindows) {
            parametrosExecucao.push(
                '-md.xres', '0',
                '-md.yres', '0'
            );
        }
        parametrosExecucao.push(rotaRomFinal);
    } else if (!ehAtari) {
        parametrosExecucao.push(
            '-snes.correct_aspect', '0',
            '-snes.stretch', 'full'
        );
        if (isWindows) {
            parametrosExecucao.push(
                '-snes.xres', '0',
                '-snes.yres', '0'
            );
        }
        parametrosExecucao.push(rotaRomFinal);
    } else {
        parametrosExecucao.push(rotaRomFinal);
    }

    const opcoesExecucao = {
        cwd: diretorioPaiEmulador,
        detached: true,
        stdio: 'ignore',
        env: envCustom
    };

    if (fs.existsSync(executavelEmulador)) {
        const processoConsole = spawn(executavelEmulador, parametrosExecucao, opcoesExecucao);
        processoConsole.unref();
    } else {
        console.error(`Emulador local nao encontrado no caminho físico: ${executavelEmulador}`);
    }
});
// <!-- fim do bloco 4 -->

// <!-- inicio do bloco 5: Extensão de Favoritos Físicos e Encerramento Ciclo de Vida -->
ipcMain.on('buscar-caminho-documentos', (event) => {
      event.returnValue = app.getPath('documents');
});

ipcMain.on('gerenciar-favorito-acervo', (event, dadosJogo) => {
      const ext = path.extname(dadosJogo.arquivo).toLowerCase();
      const caminhoDocumentos = app.getPath('documents');
      const pastaPrincipal = path.join(caminhoDocumentos, 'elementista-vault-favoritos');

      let subPasta = 'super-nintendo';
      if (['.a26', '.rom', '.lnx', '.zip', '.gz', '.tar'].includes(ext)) subPasta = 'atari';
      else if (['.md', '.smd'].includes(ext) || (ext === '.bin' && dadosJogo.caminho.toLowerCase().includes('mega'))) subPasta = 'mega-drive';
      else if (ext === '.swf') subPasta = 'flash';

      const caminhoFinalConsole = path.join(pastaPrincipal, subPasta);
      const destinoCompleto = path.join(caminhoFinalConsole, dadosJogo.arquivo);

      let caminhoFisicoLimpo = dadosJogo.caminho;
      if (caminhoFisicoLimpo) {
           caminhoFisicoLimpo = caminhoFisicoLimpo.replace(/^file:[\\/]+/i, '');
           if (process.platform === 'win32') {
                 caminhoFisicoLimpo = path.normalize(caminhoFisicoLimpo);
           } else {
                 if (!caminhoFisicoLimpo.startsWith('/')) {
                     caminhoFisicoLimpo = '/' + caminhoFisicoLimpo;
                 }
           }
      }

      if (fs.existsSync(destinoCompleto)) {
           const janelaFocada = BrowserWindow.getFocusedWindow();
           dialog.showMessageBox(janelaFocada, {
                 type: 'warning',
                 title: 'Remover do Acervo Core',
                 message: `Deseja realmente remover o jogo "${dadosJogo.nome}" do cofre?`,
                 detail: `O arquivo físico correspondente será excluído permanentemente da sua pasta Documentos:\n[ /${subPasta}/${dadosJogo.arquivo} ]`,
                 buttons: ['Sim, Excluir do HD', 'Cancelar'],
                 defaultId: 1, 
                 cancelId: 1
           }).then((resposta) => {
                 if (resposta.response === 0) {
                      try {
                            fs.unlinkSync(destinoCompleto);
                            console.log(`[Cofre] Removido fisicamente por confirmation: ${destinoCompleto}`);
                            event.reply('favorito-removido-sucesso', dadosJogo.nome);
                      } catch (erro) {
                            console.error('Erro ao deletar arquivo físico:', erro.message);
                      }
                 }
           });
           return;
      }

      const realizarCopiaFisica = () => {
           try {
                 fs.mkdirSync(caminhoFinalConsole, { recursive: true });

                 if (fs.existsSync(caminhoFisicoLimpo)) {
                     fs.copyFileSync(caminhoFisicoLimpo, destinoCompleto);
                     console.log(`[Cofre] Arquivo copiado fisicamente para: ${destinoCompleto}`);
                     event.reply('favorito-salvo-sucesso', dadosJogo.nome);
                 } else {
                     console.error(`[Cofre] Erro: Origem não encontrada no HD: ${caminhoFisicoLimpo}`);
                 }
           } catch (erro) {
                 console.error('Erro físico ao copiar arquivo para o acervo:', erro.message);
           }
      };

      if (!fs.existsSync(caminhoFinalConsole)) {
           const janelaFocada = BrowserWindow.getFocusedWindow();
           dialog.showMessageBox(janelaFocada, {
                 type: 'question',
                 title: 'Configuração de Acervo Core',
                 message: 'Deseja criar a pasta visível "elementista-vault-favoritos" em seus Documentos?',
                 detail: `O Vault criará apenas a subpasta [ /${subPasta} ] para organizar os seus favoritos com total transparência.`,
                 buttons: ['Sim, Criar', 'Agora Não'],
                 defaultId: 0, cancelId: 1
           }).then((resposta) => {
                 if (resposta.response === 0) realizarCopiaFisica();
           });
      } else {
           realizarCopiaFisica();
      }
});

app.on('ready', () => {
    inicializarAmbienteExecucao();
    criarJanela();
});

app.on('window-all-closed', () => {
    if (isPackaged && !isWindows) {
        try {
            const pastaTempBase = path.join('/tmp', 'elementista-vault');
            if (fs.existsSync(pastaTempBase)) {
                fs.rmSync(pastaTempBase, { recursive: true, force: true });
            }
        } catch (e) {}
    }
    app.quit();
});
// <!-- fim do bloco 5 -->

