// Importa o shell nativo do Electron de forma segura para abrir links no navegador do sistema
const { shell } = require('electron');

let jogosArmazenados = {};
let nivelZoom = 1;
let favoritos = JSON.parse(localStorage.getItem('flash_favoritos')) || [];

// Aguarda a árvore DOM estar pronta para renderizar o layout inicial sem travar
document.addEventListener("DOMContentLoaded", () => {
    atualizarLayoutFavoritos();
});

// 🌐 FUNÇÃO CRÍTICA: Abre as redes no navegador padrão do Linux (evita quebrar a tela do jogo)
function abrirLink(url) {
    shell.openExternal(url);
}

function mapearPastaJogos(files) {
    const listaUl = document.getElementById('lista-jogos');
    const buscaInput = document.getElementById('busca');
    const labelPasta = document.getElementById('label-pasta');
    const statusTela = document.getElementById('status-tela');
    
    if (listaUl) {
        const itensFlashAntigos = listaUl.querySelectorAll('.flash-game-item');
        itensFlashAntigos.forEach(item => item.remove());
    }

    jogosArmazenados = {};

    const arquivosSwf = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.swf'));
    
    // ⚡ SOLUÇÃO DO ERRO: Garante que a barra de pesquisa sempre apareça ao ler qualquer tipo de acervo
    if (buscaInput) {
        buscaInput.style.setProperty("display", "block", "important");
    }

    // ⚡ CORREÇÃO CIRÚRGICA: Avisa se for acervo misto, mas NÃO PARA a execução com 'return'
    if (arquivosSwf.length === 0) { 
        if (statusTela) {
            statusTela.innerHTML = "[ ACERVO MISTO INTEGRADO ]<br>Consoles mapeados com sucesso. Escolha um título ⚡";
        }
    } else {
        // Só processa e desenhos jogos em Flash se eles existirem na pasta
        arquivosSwf.sort((a, b) => a.name.localeCompare(b.name));

        arquivosSwf.forEach(file => {
            const urlObjeto = URL.createObjectURL(file);
            
            let nomeLimpo = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            nomeLimpo = nomeLimpo.replace(/_/g, ' ').replace(/-/g, ' ');
            nomeLimpo = nomeLimpo.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            jogosArmazenados[nomeLimpo] = urlObjeto;
            criarElementoJogo(nomeLimpo, urlObjeto, listaUl, false);
        });

        if (statusTela) {
            statusTela.innerHTML = "[ ACERVO MAPEADO COM SUCESSO ]<br>Escolha um título ou adicione aos favoritos ⭐";
        }
    }
    
    atualizarLayoutFavoritos();
    atualizarContadorUniversal();
}

function criarElementoJogo(nome, url, containerUl, éFavoritoLista) {
    if (!containerUl) return;
    const li = document.createElement('li');
    
    li.className = éFavoritoLista ? 'flash-fav-item' : 'flash-game-item';
    
    const btnJogo = document.createElement('button');
    btnJogo.className = 'game-btn';
    btnJogo.innerText = `⚡ ${nome}`; 
    btnJogo.onclick = () => carregarJogo(url, nome);
    
    const btnFav = document.createElement('button');
    btnFav.className = 'fav-btn';
    btnFav.innerText = favoritos.includes(nome) ? '★' : '☆';
    btnFav.onclick = () => alternarFavorito(nome);

    li.appendChild(btnJogo);
    li.appendChild(btnFav);
    containerUl.appendChild(li);
}

function carregarJogo(blobUrl, nomeJogo) {
    document.getElementById('titulo-jogo').innerText = "🕹️ " + nomeJogo;
    const container = document.getElementById('player-container');
    ajustarZoom(0);
    container.innerHTML = `
        <embed src="${blobUrl}" quality="high" width="100%" height="100%" 
               type="application/x-shockwave-flash" wmode="direct"
               allowScriptAccess="always" allowFullScreen="true">
    `;
}

function alternarFavorito(nome) {
    if (favoritos.includes(nome)) {
        favoritos = favoritos.filter(f => f !== nome);
    } else {
        favoritos.push(nome);
    }
    localStorage.setItem('flash_favoritos', JSON.stringify(favoritos));
    
    const listaUl = document.getElementById('lista-jogos');
    if (listaUl) {
        const itensFlashAntigos = listaUl.querySelectorAll('.flash-game-item');
        itensFlashAntigos.forEach(item => item.remove());
        
        for (let nomeJogo in jogosArmazenados) {
            criarElementoJogo(nomeJogo, jogosArmazenados[nomeJogo], listaUl, false);
        }
    }
    atualizarLayoutFavoritos();
}

function atualizarLayoutFavoritos() {
    const listaFavUl = document.getElementById('lista-favoritos');
    if (!listaFavUl) return;
    
    const itensFlashFavAntigos = listaFavUl.querySelectorAll('.flash-fav-item');
    itensFlashFavAntigos.forEach(item => item.remove());
    
    favoritos.forEach(nome => {
        if (jogosArmazenados[nome]) {
            criarElementoJogo(nome, jogosArmazenados[nome], listaFavUl, true);
        }
    });
}

// ⚡ LÓGICA DO CONTADOR DINÂMICO UNIFICADO
function atualizarContadorUniversal() {
    const listaUl = document.getElementById('lista-jogos');
    const labelPasta = document.getElementById('label-pasta');
    if (listaUl && labelPasta) {
        const totalJogos = listaUl.querySelectorAll('li').length;
        const textoSufixo = totalJogos === 1 ? "GAME CARREGADO" : "GAMES CARREGADOS";
        labelPasta.innerText = `📂 ${totalJogos} ${textoSufixo}`;
    }
}

function ajustarZoom(fator) {
    const player = document.getElementById('player-container');
    if (!player) return;
    if (fator === 0) nivelZoom = 1;
    else nivelZoom = Math.max(0.5, Math.min(2, nivelZoom + fator));
    player.style.transform = `scale(${nivelZoom})`;
}

function alternarMenu() {
    const menu = document.getElementById('menu-lateral');
    if (menu) menu.classList.toggle('oculto');
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
            if (btn && btn.innerText.toLowerCase().includes(filter)) li[i].style.display = "";
            else li[i].style.display = "none";
        }
    });
}

window.mapearPastaJogosGlobal = function(files) {
    mapearPastaJogos(files);
    if (typeof window.mapearPastaConsoles === 'function') {
        window.mapearPastaConsoles(files);
    }
};
window.filtrarJogos = filtrarJogos;
window.alternarMenu = alternarMenu;
window.ajustarZoom = ajustarZoom;
window.abrirLink = abrirLink;
window.atualizarContadorUniversal = atualizarContadorUniversal;

