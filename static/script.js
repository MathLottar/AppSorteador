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
    let jogadores = []; // Esta lista agora será populada pelo banco de dados!

    // --- FUNÇÕES ---

    // NOVO: Função para carregar jogadores do banco
    async function carregarJogadoresDoBanco() {
        try {
            const response = await fetch('/jogadores'); // Chama nossa nova rota GET
            if (!response.ok) {
                // Se o servidor retornar um erro (ex: 500)
                const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao carregar jogadores." }));
                throw errData;
            }
            const jogadoresDoBanco = await response.json();
            jogadores = jogadoresDoBanco; // Substitui a lista local pela lista do banco
            renderizarListaJogadores(); // Renderiza a lista na tela
            console.log('Jogadores carregados do banco:', jogadores);
        } catch (error) {
            console.error('Erro ao carregar jogadores do banco:', error);
            alert(`Não foi possível carregar jogadores do banco: ${error.erro || 'Verifique a conexão.'}`);
        }
    }

    // MODIFICADO: Renomeada para renderizar a lista de jogadores (geralmente vinda do banco)
    // Esta função agora será a principal para mostrar os jogadores na "Lista de Jogadores Confirmados"
    // que no futuro será a nossa "Lista de Jogadores Cadastrados" para seleção.
    function renderizarListaJogadores() {
        listaJogadoresUl.innerHTML = '';
        jogadores.forEach((jogador, index) => {
            const li = document.createElement('li');
            // Mostra o nome e talvez o ID do banco para referência (opcional)
            li.textContent = `${jogador.nome} (Gênero: ${jogador.genero})`;
            // Id: ${jogador.id || 'Novo'}

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remover';
            removeBtn.style.width = 'auto';
            removeBtn.style.backgroundColor = '#ef4444';
            removeBtn.onclick = () => {
                // A lógica de remover do banco de dados virá depois.
                // Por enquanto, apenas remove da lista local e atualiza a tela.
                console.warn("Funcionalidade 'Remover do Banco' ainda não implementada.");
                jogadores.splice(index, 1);
                renderizarListaJogadores();
            };
            li.appendChild(removeBtn);
            listaJogadoresUl.appendChild(li);
        });
        contadorJogadoresSpan.textContent = jogadores.length;
    }

    // MODIFICADO: Função adicionarJogador
    async function adicionarJogador() {
        const nome = nomeJogadorInput.value.trim();
        if (!nome) {
            alert('Por favor, digite o nome do jogador.');
            return;
        }

        const jogadorParaSalvar = { // Objeto enviado ao backend
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

        try {
            const response = await fetch('/jogador/adicionar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(jogadorParaSalvar)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao salvar jogador." }));
                throw errData;
            }
            const data = await response.json();
            console.log('Jogador salvo no banco:', data.jogador);
            // alert(data.mensagem); // Opcional: alerta de sucesso

            // MODIFICADO: Após salvar com sucesso, recarrega a lista do banco
            await carregarJogadoresDoBanco();

        } catch (error) {
            console.error('Erro ao salvar jogador no banco:', error);
            const mensagemErro = error.erro || 'Erro de conexão ao tentar salvar jogador.';
            alert(mensagemErro);
        }

        nomeJogadorInput.value = '';
        nomeJogadorInput.focus();
        // A lista será atualizada pelo carregarJogadoresDoBanco()
    }


    async function balancearTimes() {
        // O balanceamento usará os jogadores que estão na variável global 'jogadores'
        // que agora é populada pelo banco de dados.
        if (jogadores.length === 0) {
            alert('Não há jogadores carregados ou adicionados para balancear!');
            return;
        }

        const dadosParaEnviar = {
            num_times: parseInt(numTimesInput.value),
            pessoas_por_time: parseInt(pessoasPorTimeInput.value),
            jogadores: jogadores,
            pesos: { /* ... seus pesos ... */ }
        };

        try {
            const response = await fetch('/balancear', { /* ... */ });
            // ... (resto da função balancearTimes como antes) ...
            const resultado = await response.json();
            if (!response.ok) {
                alert(`Erro do servidor: ${resultado.erro || 'Erro desconhecido'}`);
            } else {
                renderizarResultados(resultado);
            }
        } catch (error) {
            alert('Não foi possível conectar ao servidor de balanceamento.');
            console.error('Erro de conexão ao balancear:', error);
        }
    }

    function renderizarResultados(resultado) {
        // ... (função renderizarResultados como antes) ...
        timesContainer.innerHTML = '';
        bancoContainer.innerHTML = '';
        resultado.times_balanceados.forEach((time, index) => {
            const coluna = document.createElement('div');
            coluna.className = 'time-coluna';
            const prova = resultado.provas_do_equilibrio[index];
            let htmlTime = `<h3>Time ${index + 1}</h3>`;
            htmlTime += '<ul class="player-list">';
            time.forEach(jogador => {
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
            const mediaPotencial = (prova.soma_potencial / (prova.jogadores_total || 1)).toFixed(2);
            htmlTime += `<div class="team-summary">
                            <h4>Resumo do Time</h4>
                            <p><strong>Média de Potencial:</strong> ${mediaPotencial}</p>`;
            htmlTime += '<div class="skills-summary">';
            Object.entries(prova.somas_habilidades).forEach(([habilidade, soma]) => {
                htmlTime += `<p>${habilidade.charAt(0).toUpperCase() + habilidade.slice(1)}: <strong>${soma}</strong></p>`;
            });
            htmlTime += '</div></div>';
            coluna.innerHTML = htmlTime;
            timesContainer.appendChild(coluna);
        });
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

    // --- INICIALIZAÇÃO ---
    // NOVO: Chama a função para carregar os jogadores do banco assim que a página estiver pronta
    carregarJogadoresDoBanco();
});