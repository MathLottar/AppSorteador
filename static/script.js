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
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao'); // NOVO
    const listaJogadoresUl = document.getElementById('lista-jogadores');
    const contadorJogadoresSpan = document.getElementById('contador-jogadores');

    const btnBalancear = document.getElementById('btn-balancear');
    const areaResultados = document.getElementById('area-resultados');
    const timesContainer = document.getElementById('times-container');
    const bancoContainer = document.getElementById('banco-container');

    // --- VARIÁVEIS DE ESTADO ---
    let jogadores = [];
    let editandoJogadorId = null;

    // --- FUNÇÕES ---

    async function carregarJogadoresDoBanco() {
        console.log("Iniciando carregarJogadoresDoBanco..."); // Log para depuração
        try {
            const response = await fetch('/jogadores');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao carregar jogadores." }));
                console.error("Erro na resposta do fetch /jogadores:", errData);
                throw errData;
            }
            const jogadoresDoBanco = await response.json();
            jogadores = jogadoresDoBanco;
            renderizarListaJogadores();
            console.log('Jogadores carregados do banco com sucesso:', jogadores);
        } catch (error) {
            console.error('Catch em carregarJogadoresDoBanco:', error);
            alert(`Não foi possível carregar jogadores do banco: ${error.erro || 'Verifique a conexão.'}`);
        }
    }

    function renderizarListaJogadores() {
        console.log("Renderizando lista de jogadores. Total:", jogadores.length); // Log para depuração
        listaJogadoresUl.innerHTML = '';
        jogadores.forEach((jogador) => {
            const li = document.createElement('li');
            li.textContent = `${jogador.nome} (Gênero: ${jogador.genero})`;

            const editarBtn = document.createElement('button');
            editarBtn.textContent = 'Editar';
            editarBtn.className = 'btn-editar';
            editarBtn.style.width = 'auto';
            editarBtn.style.backgroundColor = '#f59e0b';
            editarBtn.style.marginLeft = '10px';
            editarBtn.onclick = () => prepararFormularioParaEdicao(jogador);
            li.appendChild(editarBtn);

            const excluirBtn = document.createElement('button');
            excluirBtn.textContent = 'Excluir';
            excluirBtn.className = 'btn-excluir';
            excluirBtn.style.width = 'auto';
            excluirBtn.style.backgroundColor = '#ef4444';
            excluirBtn.style.marginLeft = '10px';
            excluirBtn.onclick = () => {
                if (confirm(`Tem certeza que deseja excluir ${jogador.nome} permanentemente?`)) {
                    excluirJogadorDoBanco(jogador.id);
                }
            };
            li.appendChild(excluirBtn);
            listaJogadoresUl.appendChild(li);
        });
        contadorJogadoresSpan.textContent = jogadores.length;
    }

    function prepararFormularioParaEdicao(jogador) {
        console.log("Preparando formulário para edição do jogador:", jogador); // Log
        editandoJogadorId = jogador.id;

        nomeJogadorInput.value = jogador.nome;
        generoJogadorSelect.value = jogador.genero;
        notaSaqueInput.value = jogador.notas.saque;
        notaPasseInput.value = jogador.notas.passe;
        notaLevantamentoInput.value = jogador.notas.levantamento;
        notaAtaqueInput.value = jogador.notas.ataque;
        notaMovimentacaoInput.value = jogador.notas.movimentacao;

        btnAdicionar.textContent = 'Salvar Alterações';
        btnCancelarEdicao.classList.remove('hidden'); // MOSTRA botão cancelar
        nomeJogadorInput.focus();
    }

    function resetarFormulario() {
        console.log("Resetando formulário."); // Log
        editandoJogadorId = null;
        // Não vamos limpar o nome para facilitar testes rápidos, mas você pode adicionar:
        // nomeJogadorInput.value = ''; 
        // generoJogadorSelect.value = 'F'; 
        // notaSaqueInput.value = 3;      
        // notaPasseInput.value = 3;      
        // notaLevantamentoInput.value = 3;
        // notaAtaqueInput.value = 3;    
        // notaMovimentacaoInput.value = 3;
        btnAdicionar.textContent = 'Adicionar Jogador à Lista';
        btnCancelarEdicao.classList.add('hidden'); // ESCONDE botão cancelar
        // nomeJogadorInput.focus(); // Descomente se limpar o nome
    }

    async function manipularEnvioFormularioJogador() {
        const nome = nomeJogadorInput.value.trim();
        if (!nome) {
            alert('Por favor, digite o nome do jogador.');
            return;
        }

        const dadosJogador = {
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

        if (editandoJogadorId !== null) {
            console.log("Tentando salvar edição do jogador ID:", editandoJogadorId); // Log
            try {
                const response = await fetch(`/jogador/editar/${editandoJogadorId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosJogador)
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao editar jogador." }));
                    throw errData;
                }
                const data = await response.json();
                console.log('Jogador editado no banco:', data.jogador);
                alert(data.mensagem);
                resetarFormulario();
                await carregarJogadoresDoBanco();
            } catch (error) {
                console.error('Catch em salvar edição:', error);
                alert(`Erro ao editar jogador: ${error.erro || 'Verifique a conexão.'}`);
            }
        } else {
            console.log("Tentando adicionar novo jogador."); // Log
            try {
                const response = await fetch('/jogador/adicionar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosJogador)
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao salvar jogador." }));
                    throw errData;
                }
                const data = await response.json();
                console.log('Jogador salvo no banco:', data.jogador);
                resetarFormulario();
                await carregarJogadoresDoBanco();
            } catch (error) {
                console.error('Catch em adicionar jogador:', error);
                alert(`Erro ao salvar jogador: ${error.erro || 'Verifique a conexão.'}`);
            }
        }
    }

    async function excluirJogadorDoBanco(jogadorId) {
        console.log("Tentando excluir jogador ID:", jogadorId); // Log
        try {
            const response = await fetch(`/jogador/excluir/${jogadorId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ erro: "Erro desconhecido ao excluir jogador." }));
                throw errData;
            }
            const data = await response.json();
            console.log(data.mensagem);
            alert(data.mensagem);
            await carregarJogadoresDoBanco();
        } catch (error) {
            console.error('Catch em excluir jogador:', error);
            const mensagemErro = error.erro || 'Não foi possível excluir o jogador.';
            alert(mensagemErro);
        }
    }

    async function balancearTimes() {
        console.log("Balanceando times com a lista atual:", jogadores); // Log
        if (jogadores.length === 0) {
            alert('Não há jogadores carregados ou adicionados para balancear!');
            return;
        }
        const dadosParaEnviar = {
            num_times: parseInt(numTimesInput.value),
            pessoas_por_time: parseInt(pessoasPorTimeInput.value),
            jogadores: jogadores,
            pesos: { "tecnico": 1.0, "tamanho": 2.0, "talentos": 1.5, "genero": 1.2 }
        };
        try {
            const response = await fetch('/balancear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaEnviar)
            });
            const resultado = await response.json();
            if (!response.ok) {
                alert(`Erro do servidor ao balancear: ${resultado.erro || 'Erro desconhecido'}`);
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
        if (!resultado.times_balanceados || !resultado.provas_do_equilibrio) {
            console.error("Resultado do balanceamento inválido:", resultado);
            alert("Recebido resultado inválido do servidor de balanceamento.");
            return;
        }
        resultado.times_balanceados.forEach((time, index) => {
            const coluna = document.createElement('div');
            coluna.className = 'time-coluna';
            // Adicionado para evitar erro se provas_do_equilibrio não tiver o índice esperado
            const prova = resultado.provas_do_equilibrio[index] || { soma_potencial: 0, jogadores_total: 1, somas_habilidades: {} };

            let htmlTime = `<h3>Time ${index + 1}</h3>`;
            htmlTime += '<ul class="player-list">';
            time.forEach(jogador => {
                const notasStr = jogador.notas ? Object.entries(jogador.notas)
                    .map(([habilidade, nota]) => `${habilidade.charAt(0).toUpperCase()}: ${nota}`)
                    .join(', ') : 'N/A';
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
    btnAdicionar.addEventListener('click', manipularEnvioFormularioJogador);
    btnCancelarEdicao.addEventListener('click', resetarFormulario); // NOVO
    btnBalancear.addEventListener('click', balancearTimes);

    // --- INICIALIZAÇÃO ---
    carregarJogadoresDoBanco();
});