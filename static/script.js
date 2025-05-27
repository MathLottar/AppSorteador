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

    async function carregarJogadoresDoBanco() {
        try {
            const response = await fetch('/jogadores');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao carregar jogadores." }));
                throw errData;
            }
            const jogadoresDoBanco = await response.json();
            jogadores = jogadoresDoBanco;
            renderizarListaJogadores();
            console.log('Jogadores carregados do banco:', jogadores);
        } catch (error) {
            console.error('Erro ao carregar jogadores do banco:', error);
            alert(`Não foi possível carregar jogadores do banco: ${error.erro || 'Verifique a conexão.'}`);
        }
    }

    // MODIFICADO: O botão de remover agora chama excluirJogadorDoBanco
    function renderizarListaJogadores() {
        listaJogadoresUl.innerHTML = '';
        jogadores.forEach((jogador) => { // Removido 'index' pois usaremos jogador.id
            const li = document.createElement('li');
            li.textContent = `${jogador.nome} (Gênero: ${jogador.genero})`;

            const excluirBtn = document.createElement('button'); // Nome do botão alterado para clareza
            excluirBtn.textContent = 'Excluir';
            excluirBtn.className = 'btn-excluir'; // Adicionada uma classe para possível estilização
            excluirBtn.style.width = 'auto';
            excluirBtn.style.backgroundColor = '#ef4444'; // Vermelho
            excluirBtn.style.marginLeft = '10px'; // Adiciona um espaço

            // MODIFICADO: Chama a função para excluir do banco
            excluirBtn.onclick = () => {
                // Adiciona uma confirmação antes de excluir
                if (confirm(`Tem certeza que deseja excluir ${jogador.nome} permanentemente?`)) {
                    excluirJogadorDoBanco(jogador.id);
                }
            };
            li.appendChild(excluirBtn);
            listaJogadoresUl.appendChild(li);
        });
        contadorJogadoresSpan.textContent = jogadores.length;
    }

    async function adicionarJogador() {
        const nome = nomeJogadorInput.value.trim();
        if (!nome) {
            alert('Por favor, digite o nome do jogador.');
            return;
        }
        const jogadorParaSalvar = { /* ... (como antes) ... */
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
            await carregarJogadoresDoBanco();
        } catch (error) {
            console.error('Erro ao salvar jogador no banco:', error);
            const mensagemErro = error.erro || 'Erro de conexão ao tentar salvar jogador.';
            alert(mensagemErro);
        }
        nomeJogadorInput.value = '';
        nomeJogadorInput.focus();
    }

    // NOVO: Função para excluir um jogador do banco de dados
    async function excluirJogadorDoBanco(jogadorId) {
        try {
            const response = await fetch(`/jogador/excluir/${jogadorId}`, {
                method: 'DELETE' // Usamos o método HTTP DELETE
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao excluir jogador." }));
                throw errData;
            }
            const data = await response.json();
            console.log(data.mensagem); // Ex: "Jogador 'Nome' excluído com sucesso!"
            alert(data.mensagem); // Mostra a mensagem de sucesso

            // Recarrega a lista de jogadores do banco para atualizar a tela
            await carregarJogadoresDoBanco();

        } catch (error) {
            console.error('Erro ao excluir jogador:', error);
            const mensagemErro = error.erro || 'Não foi possível excluir o jogador.';
            alert(mensagemErro);
        }
    }

    async function balancearTimes() {
        if (jogadores.length === 0) {
            alert('Não há jogadores carregados ou adicionados para balancear!');
            return;
        }
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
            const response = await fetch('/balancear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaEnviar)
            });
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
    carregarJogadoresDoBanco();
});