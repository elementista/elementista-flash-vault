// ⚡ MELHORIA MODULAR DEFINITIVA: Mapeador Automático de Joysticks USB (PLAYER 1 & PLAYER 2)
(function () {
    let loopGamepad;
    let estadoAnteriorBotoes = {};
    let direcoesAtivas = {};

    // ⚡ MATRIZ DE CONFIGURAÇÃO DO PLAYER 1 (6 Botões de Respeito)
    const MAPA_PLAYER_1 = {
        0: 'z',      // SNES: B     | Mega: B      | Atari: Tiro
        1: 'x',      // SNES: A     | Mega: C
        2: 'c',      // SNES: Y     | Mega: A
        3: 's',      // SNES: X     | Mega: X
        4: 'd',      // SNES: L     | Mega: Y
        5: ' ',      // SNES: R     | Mega: Z (Barra de Espaço)
        9: 'Enter',  // START P1
        8: 'Shift',  // SELECT P1
        10: 'Escape' // ESC (Sair do jogo externo)
    };

    // ⚡ MATRIZ DE CONFIGURAÇÃO DO PLAYER 2 (Corrigido com 6 Botões Nativos do Emulador)
    const MAPA_PLAYER_2 = {
        0: 'u',      // SNES: B     | Mega: B P2
        1: 'i',      // SNES: A     | Mega: C P2
        2: 'o',      // SNES: Y     | Mega: A P2
        3: 'j',      // SNES: X     | Mega: X P2
        4: 'k',      // SNES: L     | Mega: Y P2
        5: 'l',      // SNES: R     | Mega: Z P2
        9: '6',      // START P2
        8: '7',      // SELECT P2
    };

    console.log("[Elementista Vault] Módulo de Joysticks USB Ativado para 2 Players.");

    window.addEventListener("gamepadconnected", (evento) => {
        const gp = evento.gamepad;
        console.log(`[Hardware Vault] Controle detectado no Índice ${gp.index}: ${gp.id}`);
        
        mostrarAvisoVisualJogador(gp.index, gp.id);

        if (!loopGamepad) {
            loopGamepad = setInterval(escutarTodosOsGamepads, 16); // 60fps para lag zero
        }
    });

    window.addEventListener("gamepaddisconnected", () => {
        if (navigator.getGamepads().filter(g => g).length === 0) {
            clearInterval(loopGamepad);
            loopGamepad = null;
        }
    });

    function escutarTodosOsGamepads() {
        const gamepads = navigator.getGamepads();
        
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp) {
                const mapaAtivo = (gp.index === 0) ? MAPA_PLAYER_1 : (gp.index === 1 ? MAPA_PLAYER_2 : null);
                if (!mapaAtivo) continue;

                // 1. Processamento e injeção síncrona dos botões de ação
                gp.buttons.forEach((botao, indice) => {
                    const chaveIdentificacao = `gp_${gp.index}_btn_${indice}`;
                    const tecla = mapaAtivo[indice];
                    if (!tecla) return;

                    if (botao.pressed && !estadoAnteriorBotoes[chaveIdentificacao]) {
                        injetarTeclaNoDOM(tecla, "keydown");
                    } else if (!botao.pressed && estadoAnteriorBotoes[chaveIdentificacao]) {
                        injetarTeclaNoDOM(tecla, "keyup");
                    }
                    estadoAnteriorBotoes[chaveIdentificacao] = botao.pressed;
                });

                // 2. Processamento e mapeamento dos direcionais de cada jogador
                if (gp.index === 0) {
                    // Direcionais Player 1 (Setas Padrão)
                    gerenciarDirecionaisP1(gp.buttons[12]?.pressed || gp.axes[1] < -0.5, 'ArrowUp', 'cima');
                    gerenciarDirecionaisP1(gp.buttons[13]?.pressed || gp.axes[1] > 0.5, 'ArrowDown', 'baixo');
                    gerenciarDirecionaisP1(gp.buttons[14]?.pressed || gp.axes[0] < -0.5, 'ArrowLeft', 'esquerda');
                    gerenciarDirecionaisP1(gp.buttons[15]?.pressed || gp.axes[0] > 0.5, 'ArrowRight', 'direita');
                } else if (gp.index === 1) {
                    // Direcionais Player 2 (Alinhados com o teclado alfanumérico padrão secundário)
                    gerenciarDirecionaisP2(gp.buttons[12]?.pressed || gp.axes[1] < -0.5, 't', 'cima_p2');
                    gerenciarDirecionaisP2(gp.buttons[13]?.pressed || gp.axes[1] > 0.5, 'b', 'baixo_p2');
                    gerenciarDirecionaisP2(gp.buttons[14]?.pressed || gp.axes[0] < -0.5, 'f', 'esquerda_p2');
                    gerenciarDirecionaisP2(gp.buttons[15]?.pressed || gp.axes[0] > 0.5, 'h', 'direita_p2');
                }
            }
        }
    }

    function gerenciarDirecionaisP1(condicao, nomeTecla, chave) {
        const identificador = `p1_${chave}`;
        if (condicao && !direcoesAtivas[identificador]) {
            injetarTeclaNoDOM(nomeTecla, "keydown");
            direcoesAtivas[identificador] = true;
        } else if (!condicao && direcoesAtivas[identificador]) {
            injetarTeclaNoDOM(nomeTecla, "keyup");
            direcoesAtivas[identificador] = false;
        }
    }

    // Corrigido para não cruzar referências físicas com os direcionais do Player 1
    function gerenciarDirecionaisP2(condicao, nomeTecla, chave) {
        const identificador = `p2_${chave}`;
        if (condicao && !direcoesAtivas[identificador]) {
            injetarTeclaNoDOM(nomeTecla, "keydown");
            direcoesAtivas[identificador] = true;
        } else if (!condicao && direcoesAtivas[identificador]) {
            injetarTeclaNoDOM(nomeTecla, "keyup");
            direcoesAtivas[identificador] = false;
        }
    }

    function injetarTeclaNoDOM(teclaNome, tipoEvento) {
        const evento = new KeyboardEvent(tipoEvento, {
            key: teclaNome,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(evento);
    }

    function mostrarAvisoVisualJogador(indice, nomeDispositivo) {
        const divAlerta = document.createElement("div");
        divAlerta.style.position = "fixed";
        divAlerta.style.bottom = `${20 + (indice * 65)}px`;
        divAlerta.style.right = "20px";
        divAlerta.style.backgroundColor = "#000000";
        divAlerta.style.border = "1px solid #00ffcc";
        divAlerta.style.color = "#33ff33";
        divAlerta.style.padding = "10px";
        divAlerta.style.fontFamily = "monospace";
        divAlerta.style.fontSize = "11px";
        divAlerta.style.zIndex = "9999";
        divAlerta.style.boxShadow = "0 0 8px #00ffcc";
        
        const numeroPlayer = indice + 1;
        divAlerta.innerHTML = `🎮 <strong>PLAYER ${numeroPlayer} ATIVADO:</strong><br><span style="color:#ff9900;">${nomeDispositivo.substring(0, 22)}...</span><br>Mapeamento de 6 botões ativo.`;
        
        document.body.appendChild(divAlerta);
        setTimeout(() => { divAlerta.remove(); }, 4000);
    }
})();

