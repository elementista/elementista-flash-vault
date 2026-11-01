// ⚡ MÓDULO GLOBAL INDEPENDENTE: Pesquisa e Contador Universal Matrix
document.addEventListener("DOMContentLoaded", () => {
      const inputPesquisa = document.getElementById("busca") || document.getElementById("input-pesquisa") || document.getElementById("search-input");
      
      // Força uma primeira contagem ao iniciar o app
      window.atualizarContadorUniversal();

      if (inputPesquisa) {
            inputPesquisa.addEventListener("input", (evento) => {
                  const termo = evento.target.value.toLowerCase();

                  // Pega absolutamente todos os elementos de lista (<li>) visíveis na barra lateral
                  const todosOsItens = document.querySelectorAll('#lista-jogos li, #lista-favoritos li, .bin-game-item, .flash-game-item, .atari-game-item');

                  todosOsItens.forEach(item => {
                        const textoDoJogo = item.textContent.toLowerCase();

                        if (textoDoJogo.includes(termo)) {
                            item.style.display = "";
                        } else {
                            item.style.display = "none";
                        }
                  });
                  
                  // Atualiza o número caso você filtre a lista por texto
                  window.atualizarContadorUniversal();
            });
      }
});

// ⚡ REENGENHARIA DO CONTADOR: Conta de forma cega tudo o que estiver renderizado na lista de jogos
window.atualizarContadorUniversal = function() {
      const listaUl = document.getElementById('lista-jogos');
      const labelPasta = document.getElementById('label-pasta');
      
      if (listaUl && labelPasta) {
            // Conta todos os <li> reais presentes dentro do container de jogos ativos
            const totalJogos = listaUl.querySelectorAll('li').length;
            const textoSufixo = totalJogos === 1 ? "GAME CARREGADO" : "GAMES CARREGADOS";
            
            // Injeta a string com o número real na sua tarja laranja da interface
            labelPasta.innerText = `🔥 ${totalJogos} ${textoSufixo}`;
      }
};

// Ponte nativa para focar o cursor na barra ao pressionar o atalho do teclado (Ctrl + F)
if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      ipcRenderer.on('focar-pesquisa', () => {
            const inputBusca = document.getElementById("busca") || document.getElementById("input-pesquisa");
            if (inputBusca) {
                  inputBusca.focus();
                  inputBusca.select();
            }
      });
}

