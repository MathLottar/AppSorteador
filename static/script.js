// Espera todo o conteúdo do HTML ser carregado antes de executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- MAPEAMENTO DOS ELEMENTOS DO HTML ---
    const numTimesInput = document.getElementById('num-times');
    const pessoasPorTimeInput = document.getElementById('pessoas-por-time');

    const nomeJogadorInput = document.getElementById('nome-jogador');
    const generoJogadorSelect = document.getElementById('genero-jogador');

    const notaSaqueInput = document.getElementById('nota-saque');
    const notaPasseInput = document.getElementById('nota-passe');
    const notaLevantamentoInput = document.getElementById('nota-levantamento');
    const notaAtaqueInput = document.getElementById('nota-ataque');
    const notaMovimentacaoInput = document.getElementById('nota-movimentacao');

    const btnAdicionar = document.getElementById('btn-adicionar');
    const listaJogadoresUl = document.getElementById('lista-jogadores');
    const contadorJogadoresSpan = document.getElementById('contador-jogadores');

    const btnBalancear = document.getElementById('btn-balancear');
    const areaResultados = document.getElementById('area-resultados');
    const timesContainer = document.getElementById('times-container');
    const bancoContainer = document.getElementById('banco-container');

    // --- VARIÁVEL PARA GUARDAR NOSSOS DADOS ---
    let jogadores = [];

    // --- FUNÇÕES ---

    function adicionarJogador() {
        const nome = nomeJogadorInput.value.trim();
        if (!nome) {
            alert('Por favor, digite o nome do jogador.');
            return;
        }

        const jogador = {
            nome: nome,
            genero: generoJogadorSelect.value,
            notas: {
                saque: parseInt(notaSaqueInput.value),
                passe: parseInt(notaPasseInput.value),
                levantamento: parseInt(notaLevantamentoInput.value),
                ataque: parseInt(notaAtaqueInput.value),
                movimentacao: parseInt(notaMovimentacaoInput.value)
            }
        };

        jogadores.push(jogador);
        nomeJogadorInput.value = '';
        nomeJogadorInput.focus();
        renderizarLista();
    }

    function renderizarLista() {
        listaJogadoresUl.innerHTML = '';
        jogadores.forEach((jogador, index) => {
            const li = document.createElement('li');
            li.textContent = `${jogador.nome} (Gênero: ${jogador.genero})`;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remover';
            removeBtn.style.width = 'auto';
            removeBtn.style.backgroundColor = '#ef4444';
            removeBtn.onclick = () => {
                jogadores.splice(index, 1);
                renderizarLista();
            };
            li.appendChild(removeBtn);

            listaJogadoresUl.appendChild(li);
        });
        contadorJogadoresSpan.textContent = jogadores.length;
    }

    async function balancearTimes() {
        const dadosParaEnviar = {
            num_times: parseInt(numTimesInput.value),
            pessoas_por_time: parseInt(pessoasPorTimeInput.value),
            jogadores: jogadores,
            pesos: {
                "tecnico": 1.0,
                "tamanho": 2.0,
                "talentos": 1.5,
                "genero": 1.2
            }
        };

        try {
            const response = await fetch('https://appsorteador.onrender.com/balancear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosParaEnviar)
            });

            const resultado = await response.json();

            if (!response.ok) {
                alert(`Erro: ${resultado.erro}`);
            } else {
                renderizarResultados(resultado);
            }

        } catch (error) {
            alert('Não foi possível conectar ao servidor. Verifique se o programa Python (app.py) está rodando no terminal.');
            console.error('Erro de conexão:', error);
        }
    }

    // --- FUNÇÃO ATUALIZADA ---
    // Função para desenhar os resultados DETALHADOS na tela
    function renderizarResultados(resultado) {
        timesContainer.innerHTML = '';
        bancoContainer.innerHTML = '';

        // Cria as colunas para cada time
        resultado.times_balanceados.forEach((time, index) => {
            const coluna = document.createElement('div');
            coluna.className = 'time-coluna';

            // Pega a prova correspondente para este time
            const prova = resultado.provas_do_equilibrio[index];

            // 1. Título do Time
            let htmlTime = `<h3>Time ${index + 1}</h3>`;

            // 2. Lista de Jogadores com detalhes
            htmlTime += '<ul class="player-list">';
            time.forEach(jogador => {
                // Cria a string com as notas do jogador
                const notasStr = Object.entries(jogador.notas)
                    .map(([habilidade, nota]) => `${habilidade.charAt(0).toUpperCase()}: ${nota}`)
                    .join(', ');

                htmlTime += `
                    <li>
                        <span class="player-name">${jogador.nome} ${jogador.craque ? '⭐' : ''}</span>
                        <small class="player-details">${notasStr}</small>
                    </li>
                `;
            });
            htmlTime += '</ul>';

            // 3. Resumo do Time (com as somas de cada critério e média)
            const mediaPotencial = (prova.soma_potencial / prova.jogadores_total).toFixed(2);
            htmlTime += `<div class="team-summary">
                            <h4>Resumo do Time</h4>
                            <p><strong>Média de Potencial:</strong> ${mediaPotencial}</p>`;

            // Adiciona as somas de cada habilidade
            htmlTime += '<div class="skills-summary">';
            Object.entries(prova.somas_habilidades).forEach(([habilidade, soma]) => {
                htmlTime += `<p>${habilidade.charAt(0).toUpperCase() + habilidade.slice(1)}: <strong>${soma}</strong></p>`;
            });
            htmlTime += '</div></div>';

            coluna.innerHTML = htmlTime;
            timesContainer.appendChild(coluna);
        });

        // Mostra o banco de reservas
        if (resultado.banco_de_reservas && resultado.banco_de_reservas.length > 0) {
            let htmlBanco = '<ul>';
            resultado.banco_de_reservas.forEach(jogador => {
                htmlBanco += `<li>${jogador.nome}</li>`;
            });
            htmlBanco += '</ul>';
            bancoContainer.innerHTML = htmlBanco;
        } else {
            bancoContainer.innerHTML = '<p>Nenhum jogador no banco.</p>';
        }

        areaResultados.classList.remove('hidden');
    }


    // --- "OUVIDORES" DE EVENTOS ---
    btnAdicionar.addEventListener('click', adicionarJogador);
    btnBalancear.addEventListener('click', balancearTimes);
});
