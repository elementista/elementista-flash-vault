// <!-- inicio bloco 1: Inicialização e Escopes de Memória no Boot -->
const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// ⚡ ANCHOR DE MEMÓRIA: Estrutura original mantida com espelhos isolados para caminhos físicos de Flash
let jogosBinArmazenados = {};
let jogosCaminhosReaisSwf = {}; // Armazena a rota real do HD para os arquivos .swf não irem como Blob para o IPC
let jogosDoCofreFavoritos = {}; // Dicionário isolado exclusivo para o scanner físico do boot
let favoritosBin = JSON.parse(localStorage.getItem('console_favoritos')) || [];

document.addEventListener("DOMContentLoaded", () => {
      const inputPasta = document.getElementById("input-pasta");
      const buscaInput = document.getElementById('busca') || document.getElementById('input-pesquisa');

      if (inputPasta) {
            inputPasta.addEventListener("change", (evento) => {
                  const files = evento.target.files;
                  window.mapearPastaConsoles(files);
            });
      }
      
      // Força a barra de pesquisa a ficar visível e ativa imediatamente no boot do app
      if (buscaInput) {
            buscaInput.style.setProperty("display", "block", "important");
      }
      
      // AUTO-SCANNER: Varre as subpastas físicas em Documentos logo na inicialização do boot
      carregarAcervoUnificadoDeFavoritos();
});
// <!-- fim bloco 1 -->
// <!-- inicio bloco 2: Varredura e Mapeamento do Diretório Atual (Aba Geral) -->
function mapearPastaConsoles(files) {
      const listaUl = document.getElementById('lista-jogos');
      if (!listaUl) return;

      const extensoesSuportadas = [
            '.bin', '.md', '.smd',
            '.nes', '.smc', '.sfc',
            '.gb', '.gbc', '.gba',
            '.sms', '.gg', '.pce',
            '.a26', '.rom', '.zip',
            '.gz', '.tar', '.lnx',
            '.txt', '.text', '.swf'
      ];

      const arquivosConsoles = Array.from(files).filter(file => {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            return extensoesSuportadas.includes(ext);
          });

      const itensConsolesAntigos = listaUl.querySelectorAll('.bin-game-item, .flash-game-item');
      itensConsolesAntigos.forEach(item => item.remove());

      // Reseta os mapas de cache locais da sessão antes de ler os novos arquivos
      jogosBinArmazenados = {};
      jogosCaminhosReaisSwf = {};

      arquivosConsoles.forEach(file => {
            const nomeLimpo = file.name.substring(0, file.name.lastIndexOf('.')).replace(/_/g, ' ').replace(/-/g, ' ');
            
            // COMPORTAMENTO ORIGINAL DE BLOB PRESERVADO: Se for .swf, gera a URL de objeto nativa para o embed funcionar
            if (file.name.toLowerCase().endsWith('.swf')) {
                 jogosBinArmazenados[nomeLimpo] = URL.createObjectURL(file);
                 jogosCaminhosReaisSwf[nomeLimpo] = file.path; // Guarda em paralelo a rota física real do HD
            } else {
                 jogosBinArmazenados[nomeLimpo] = file.path;
            }
            
            // ⚡ CORRIGIDO: Passa os parâmetros unificados para que o clique na estrela do Flash saiba a rota real do HD
            criarElementoJogoBin(nomeLimpo, jogosBinArmazenados[nomeLimpo], file.name, listaUl, false);
      });

      // Sincroniza a listagem superior baseada no disco
      carregarAcervoUnificadoDeFavoritos();

      if (typeof window.atualizarContadorUniversal === 'function') {
            window.atualizarContadorUniversal();
      }
}
// <!-- fim bloco 2 -->
// <!-- inicio bloco 3: Renderização de Componentes DOM e Injeção síncrona de Containers -->
function criarElementoJogoBin(nome, caminho, nomeArquivo, containerUl, éFavoritoLista) {
    if (!containerUl) return;
    const li = document.createElement('li');
    li.className = éFavoritoLista ? 'bin-fav-item' : 'bin-game-item';

    const btnJogo = document.createElement('button');
    btnJogo.className = 'game-btn';

    const ext = nomeArquivo.substring(nomeArquivo.lastIndexOf('.')).toLowerCase();

    // CALIBRAÇÃO DE ÍCONES CORE: Garante que os arquivos Flash (.swf) exibam RIGOROSAMENTE o raio
    if (ext === '.swf') {
         btnJogo.innerText = ` ⚡ ${nome}`;
    } else if (['.a26', '.rom', '.lnx', '.zip', '.gz', '.tar', '.txt', '.text'].includes(ext)) {
         btnJogo.innerText = ` 🕹️ ${nome}`;
    } else {
         btnJogo.innerText = ` 🎮 ${nome}`;
    }

    btnJogo.onclick = () => {
         const playerContainer = document.getElementById('player-container');
         const tituloJogo = document.getElementById('titulo-jogo');
         if (tituloJogo) tituloJogo.innerText = "/ " + nome.toUpperCase();

         if (!playerContainer) return;

         // Seu visualizador de manual e embed originais intactos
         if (ext === '.swf') {
              playerContainer.innerHTML = `
                  <embed src="${caminho}" quality="high" width="100%" height="100%" 
                         type="application/x-shockwave-flash" wmode="direct"
                         allowScriptAccess="always" allowFullScreen="true">
              `;
         } else {
              playerContainer.innerHTML = `
                   <iframe src="manual.html" style="width: 100%; height: 100%; border: none; background: transparent;"></iframe>
              `;
         }

         if (ext !== '.swf') {
              ipcRenderer.send('executar-emulador-portatil', caminho);
         }
    };

    const btnFav = document.createElement('button');
    btnFav.className = 'fav-btn';
    btnFav.innerText = favoritosBin.includes(nome) ? '★' : '☆';
    btnFav.onclick = () => alternarFavoritoBin(nome, nomeArquivo);

    li.appendChild(btnJogo);
    li.appendChild(btnFav);
    containerUl.appendChild(li);
}
// <!-- fim bloco 3 -->
// <!-- inicio bloco 4: Controle de Favoritos, Scanner Físico, Filtros e Contadores -->
function alternarFavoritoBin(nome, nomeArquivoOpicional) {
    const caminhoDocumentos = ipcRenderer.sendSync('buscar-caminho-documentos');
    const extPadrão = nomeArquivoOpicional ? path.extname(nomeArquivoOpicional).toLowerCase() : '.bin';
    
    let subPastaAlvo = 'super-nintendo';
    if (extPadrão === '.swf') subPastaAlvo = 'flash';
    else if (['.a26', '.rom', '.lnx', '.zip', '.gz', '.tar'].includes(extPadrão)) subPastaAlvo = 'atari';
    else if (['.md', '.smd', '.bin'].includes(extPadrão)) subPastaAlvo = 'mega-drive';

    const nomeArquivoReal = nomeArquivoOpicional || `${nome}${extPadrão}`;
    const rotaFallbackDisco = path.join(caminhoDocumentos, 'elementista-vault-favoritos', subPastaAlvo, nomeArquivoReal);

    // ⚡ CAPTURA REAL GARANTIDA: Se for .swf, busca primeiro a rota do HD no espelho 'jogosCaminhosReaisSwf' para não enviar a string do Blob
    const caminhoOriginal = jogosCaminhosReaisSwf[nome] || jogosBinArmazenados[nome] || jogosDoCofreFavoritos[nome] || rotaFallbackDisco;

    // Dispara a requisição completa e segura para o index.js agir
    ipcRenderer.send('gerenciar-favorito-acervo', {
        nome: nome,
        caminho: caminhoOriginal,
        arquivo: nomeArquivoReal
    });
}

// Escutas de confirmação que atualizam o localStorage e atualizam las listas visuais
ipcRenderer.on('favorito-salvo-sucesso', (event, nomeJogo) => {
    if (!favoritosBin.includes(nomeJogo)) favoritosBin.push(nomeJogo);
    localStorage.setItem('console_favoritos', JSON.stringify(favoritosBin));
    carregarAcervoUnificadoDeFavoritos();
});

ipcRenderer.on('favorito-removido-sucesso', (event, nomeJogo) => {
    favoritosBin = favoritosBin.filter(f => f !== nomeJogo);
    localStorage.setItem('console_favoritos', JSON.stringify(favoritosBin));
    carregarAcervoUnificadoDeFavoritos();
});

function carregarAcervoUnificadoDeFavoritos() {
    const listaFavUl = document.getElementById('lista-favorites') || document.getElementById('lista-favoritos');
    if (!listaFavUl) return;

    listaFavUl.innerHTML = "";
    jogosDoCofreFavoritos = {};

    const caminhoDocumentos = ipcRenderer.sendSync('buscar-caminho-documentos');
    if (!caminhoDocumentos) return;

    const pastaPrincipal = path.join(caminhoDocumentos, 'elementista-vault-favoritos');
    if (!fs.existsSync(pastaPrincipal)) return;

    const subPastas = ['flash', 'atari', 'mega-drive', 'super-nintendo'];

    subPastas.forEach(sub => {
        const caminhoSub = path.join(pastaPrincipal, sub);
        if (fs.existsSync(caminhoSub)) {
            const arquivos = fs.readdirSync(caminhoSub);
            arquivos.forEach(arquivo => {
                const caminhoCompletoDoJogo = path.join(caminhoSub, arquivo);
                const nomeLimpo = arquivo.substring(0, arquivo.lastIndexOf('.')).replace(/_/g, ' ').replace(/-/g, ' ');
                const ext = path.extname(arquivo).toLowerCase();
                
                const rotaFinalDoJogo = ext === '.swf' ? `file://${caminhoCompletoDoJogo}` : caminhoCompletoDoJogo;

                jogosDoCofreFavoritos[nomeLimpo] = caminhoCompletoDoJogo;
                jogosBinArmazenados[nomeLimpo] = rotaFinalDoJogo;
                
                if (ext === '.swf') {
                     jogosCaminhosReaisSwf[nomeLimpo] = caminhoCompletoDoJogo;
                }

                criarElementoJogoBin(nomeLimpo, rotaFinalDoJogo, arquivo, listaFavUl, true);
            });
        }
    });
}

function filtrarJogos() {
    const filter = document.getElementById('busca').value.toLowerCase();
    const secoes = ['lista-jogos', 'lista-favoritos'];
    
    secoes.forEach(id => {
        const elementoSecao = document.getElementById(id);
        if (!elementoSecao) return;
        
        const li = elementoSecao.getElementsByTagName('li');
        for (let i = 0; i < li.length; i++) {
            const btn = li[i].querySelector('.game-btn');
            if (btn) {
                const nomeTextoLimpo = btn.innerText.replace(/^\s*[🕹️🎮⚡️]\s*/g, '').toLowerCase();
                if (nomeTextoLimpo.includes(filter)) {
                    li[i].style.display = "";
                } else {
                    li[i].style.display = "none";
                }
            }
        }
    });
}

function alternarMenu() {
    const menu = document.getElementById('menu-lateral');
    if (menu) menu.classList.toggle('oculto');
}

function ajustarZoom(fator) {
    const player = document.getElementById('player-container');
    if (!player) return;
    if (fator === 0) nivelZoom = 1;
    else nivelZoom = Math.max(0.5, Math.min(2, nivelZoom + fator));
    player.style.transform = `scale(${nivelZoom})`;
}

function atualizarContadorUniversal() {
    const listaUl = document.getElementById('lista-jogos');
    const labelPasta = document.getElementById('label-pasta');
    if (listaUl && labelPasta) {
        const totalJogos = listaUl.querySelectorAll('li').length;
        const textoSufixo = totalJogos === 1 ? "GAME CARREGADO" : "GAMES CARREGADOS";
        labelPasta.innerText = `📂 ${totalJogos} ${textoSufixo}`;
    }
}

window.mapearPastaConsoles = mapearPastaConsoles;
window.filtrarJogos = filtrarJogos;
window.alternarMenu = alternarMenu;
window.ajustarZoom = ajustarZoom;
window.atualizarContadorUniversal = atualizarContadorUniversal;
// <!-- fim bloco 4 -->

