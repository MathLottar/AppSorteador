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

    const btnAdicionar = document.getElementById('btn-adicionar'); // Este botão agora terá dupla função
    const listaJogadoresUl = document.getElementById('lista-jogadores');
    const contadorJogadoresSpan = document.getElementById('contador-jogadores');

    const btnBalancear = document.getElementById('btn-balancear');
    const areaResultados = document.getElementById('area-resultados');
    const timesContainer = document.getElementById('times-container');
    const bancoContainer = document.getElementById('banco-container');

    // --- VARIÁVEIS DE ESTADO ---
    let jogadores = [];
    let editandoJogadorId = null; // NOVO: Controla se estamos editando e qual jogador

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

    // MODIFICADO: Adiciona botão "Editar"
    function renderizarListaJogadores() {
        listaJogadoresUl.innerHTML = '';
        jogadores.forEach((jogador) => {
            const li = document.createElement('li');
            li.textContent = `${jogador.nome} (Gênero: ${jogador.genero})`;

            // Botão Editar
            const editarBtn = document.createElement('button');
            editarBtn.textContent = 'Editar';
            editarBtn.className = 'btn-editar'; // NOVO
            editarBtn.style.width = 'auto';
            editarBtn.style.backgroundColor = '#f9a825'; // Amarelo/Laranja
            editarBtn.style.marginLeft = '10px';
            editarBtn.onclick = () => prepararFormularioParaEdicao(jogador); // NOVO: Chama função para popular form
            li.appendChild(editarBtn);

            // Botão Excluir
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

    // NOVO: Função para preencher o formulário com dados do jogador para edição
    function prepararFormularioParaEdicao(jogador) {
        editandoJogadorId = jogador.id; // Guarda o ID do jogador que estamos editando

        nomeJogadorInput.value = jogador.nome;
        generoJogadorSelect.value = jogador.genero;
        notaSaqueInput.value = jogador.notas.saque;
        notaPasseInput.value = jogador.notas.passe;
        notaLevantamentoInput.value = jogador.notas.levantamento;
        notaAtaqueInput.value = jogador.notas.ataque;
        notaMovimentacaoInput.value = jogador.notas.movimentacao;

        btnAdicionar.textContent = 'Salvar Alterações'; // Muda o texto do botão
        // Opcional: Mudar o título da seção
        // document.querySelector('section.card h2').textContent = '2. Editar Jogador'; 
        nomeJogadorInput.focus();
    }

    // NOVO: Função para resetar o formulário para o modo "Adicionar"
    function resetarFormulario() {
        editandoJogadorId = null;
        nomeJogadorInput.value = '';
        generoJogadorSelect.value = 'F'; // Valor padrão
        notaSaqueInput.value = 3;       // Valor padrão
        notaPasseInput.value = 3;       // Valor padrão
        notaLevantamentoInput.value = 3;// Valor padrão
        notaAtaqueInput.value = 3;      // Valor padrão
        notaMovimentacaoInput.value = 3;// Valor padrão
        btnAdicionar.textContent = 'Adicionar Jogador à Lista';
        // Opcional: Voltar o título da seção
        // document.querySelector('section.card h2').textContent = '2. Adicionar Jogador';
        nomeJogadorInput.focus();
    }


    // MODIFICADO: Função principal do formulário agora decide se Adiciona ou Edita
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
            // Estamos no MODO EDIÇÃO
            try {
                const response = await fetch(`/jogador/editar/${editandoJogadorId}`, { // URL RELATIVA
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
                resetarFormulario(); // Volta ao modo de adição
                await carregarJogadoresDoBanco();
            } catch (error) {
                console.error('Erro ao editar jogador:', error);
                alert(`Erro ao editar jogador: ${error.erro || 'Verifique a conexão.'}`);
            }
        } else {
            // Estamos no MODO ADIÇÃO (como antes)
            try {
                const response = await fetch('/jogador/adicionar', { // URL RELATIVA
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
                // alert(data.mensagem); // Opcional
                resetarFormulario(); // Limpa o formulário e mantém no modo de adição
                await carregarJogadoresDoBanco();
            } catch (error) {
                console.error('Erro ao salvar jogador no banco:', error);
                alert(`Erro ao salvar jogador: ${error.erro || 'Verifique a conexão.'}`);
            }
        }
    }

    async function excluirJogadorDoBanco(jogadorId) {
        // ... (como antes) ...
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
            console.error('Erro ao excluir jogador:', error);
            const mensagemErro = error.erro || 'Não foi possível excluir o jogador.';
            alert(mensagemErro);
        }
    }

    async function balancearTimes() {
        // ... (como antes, mas usando a variável 'jogadores' que é carregada do banco) ...
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
        // ... (como antes) ...
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
    // MODIFICADO: O botão 'btnAdicionar' agora chama 'manipularEnvioFormularioJogador'
    btnAdicionar.addEventListener('click', manipularEnvioFormularioJogador);
    btnBalancear.addEventListener('click', balancearTimes);

    // --- INICIALIZAÇÃO ---
    carregarJogadoresDoBanco();
});