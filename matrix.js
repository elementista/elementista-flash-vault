// ⚡ EFEITO CHUVA MATRIX: Agente autônomo e isolado que cria o fundo sem mexer no HTML físico
document.addEventListener("DOMContentLoaded", () => {
    // 1. Cria o elemento Canvas dinamicamente na memória
    const canvasMatrix = document.createElement('canvas');
    canvasMatrix.id = 'canvas-matrix-fundo';
    
    // 2. Trava o estilo CSS via script para ele ficar fixo no fundo de tudo
    canvasMatrix.style.position = 'fixed';
    canvasMatrix.style.top = '0';
    canvasMatrix.style.left = '0';
    canvasMatrix.style.width = '100vw';
    canvasMatrix.style.height = '100vh';
    canvasMatrix.style.zIndex = '-1'; // ⚡ Joga para trás dos botões e menus
    canvasMatrix.style.pointerEvents = 'none'; // Garante que não atrapalhe os cliques do mouse
    canvasMatrix.style.background = '#000000';

    // Injeta o canvas direto no início do body do seu HTML
    document.body.insertBefore(canvasMatrix, document.body.firstChild);

    const ctx = canvasMatrix.getContext('2d');

    // Ajusta o tamanho do Canvas para cobrir a tela cheia do Electron
    function redimensionarTela() {
        canvasMatrix.width = window.innerWidth;
        canvasMatrix.height = window.innerHeight;
    }
    redimensionarTela();
    window.addEventListener('resize', redimensionarTela);

    // Configuração dos caracteres da Matrix (Katakana japonês e números)
    const letrasMatrix = "🚀⚡🕹️🎮0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ";
    const alfabeto = letrasMatrix.split("");

    const tamanhoFonte = 14;
    let colunas = canvasMatrix.width / tamanhoFonte;
    let gotasCaindo = [];

    // Inicializa a posição de início de cada coluna de chuva
    function inicializarGotas() {
        colunas = canvasMatrix.width / tamanhoFonte;
        gotasCaindo = [];
        for (let x = 0; fill = x < colunas; x++) {
            gotasCaindo[x] = Math.random() * -100; // Começam fora da tela para dar suavidade
        }
    }
    inicializarGotas();
    window.addEventListener('resize', inicializarGotas);

    // Função de desenho contínuo (Loop da Matrix)
    function desenharChuvaMatrix() {
        // Aplica um fundo preto quase transparente para criar o rastro (efeito de brilho fantasma)
        ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
        ctx.fillRect(0, 0, canvasMatrix.width, canvasMatrix.height);

        // Define a fonte e o estilo do texto
        ctx.font = tamanhoFonte + "px monospace";

        for (let i = 0; i < gotasCaindo.length; i++) {
            // Pega um caractere aleatório do alfabeto
            const caractere = alfabeto[Math.floor(Math.random() * alfabeto.length)];
            
            // X é a posição da coluna, Y é a altura da gota caindo
            const x = i * tamanhoFonte;
            const y = gotasCaindo[i] * tamanhoFonte;

            // Cria o efeito degrade de brilho: a primeira letra da gota é verde clara, o rastro é escuro
            if (Math.random() > 0.97) {
                ctx.fillStyle = "#ffffff"; // Brilho intenso aleatório na ponta
            } else if (gotasCaindo[i] < 5) {
                ctx.fillStyle = "#00ffcc"; // Tom ciano neon do seu blog
            } else {
                ctx.fillStyle = "#00ff33"; // Verde clássico brilhante Matrix
            }

            ctx.fillText(caractere, x, y);

            // Se a gota passou do fundo da tela, joga ela de volta para o topo aleatoriamente
            if (y > canvasMatrix.height && Math.random() > 0.975) {
                gotasCaindo[i] = 0;
            }

            // Move a gota para baixo no próximo frame
            gotasCaindo[i]++;
        }
    }

    // Trava o loop em aproximadamente 30 frames por segundo para ficar leve e não pesar a CPU
    setInterval(desenharChuvaMatrix, 33);
});

