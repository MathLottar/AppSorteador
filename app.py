import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import statistics
import random

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# --- CONFIGURAÇÃO DO BANCO DE DADOS (TENTATIVA SSL MAIS SIMPLES) ---
basedir = os.path.abspath(os.path.dirname(__file__))
database_url_from_env = os.environ.get('DATABASE_URL')

if database_url_from_env:
    # Se estiver rodando no Render (ou qualquer ambiente com DATABASE_URL definido)
    # Garante que a URL use 'postgresql://' que é o esperado pelo SQLAlchemy
    current_uri = database_url_from_env
    if current_uri.startswith("postgres://"):
        current_uri = current_uri.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = current_uri
    
    # REMOVEMOS as tentativas de forçar sslmode aqui.
    if 'SQLALCHEMY_ENGINE_OPTIONS' in app.config:
        del app.config['SQLALCHEMY_ENGINE_OPTIONS']
else:
    # Configuração para SQLite local
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app_local.db')
    if 'SQLALCHEMY_ENGINE_OPTIONS' in app.config:
        del app.config['SQLALCHEMY_ENGINE_OPTIONS']

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
# --- FIM DA CONFIGURAÇÃO DO BANCO DE DADOS ---

CORS(app, resources={
    r"/balancear": {"origins": "*"},
    r"/jogador/adicionar": {"origins": "*"},
    r"/jogadores": {"origins": "*"},
    r"/jogador/excluir/<int:jogador_id>": {"origins": "*"},
    r"/jogador/editar/<int:jogador_id>": {"origins": "*"}
})

class Jogador(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    genero = db.Column(db.String(1), nullable=False)
    notas = db.Column(db.JSON, nullable=False)

    def __init__(self, nome, genero, notas):
        self.nome = nome
        self.genero = genero
        self.notas = notas

    def __repr__(self):
        return f'<Jogador {self.nome}>'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/jogador/adicionar', methods=['POST'])
def adicionar_jogador_db():
    dados = request.get_json()
    if not dados or 'nome' not in dados or 'genero' not in dados or 'notas' not in dados:
        return jsonify({"erro": "Dados do jogador incompletos"}), 400
    try:
        novo_jogador = Jogador(nome=dados['nome'], genero=dados['genero'], notas=dados['notas'])
        db.session.add(novo_jogador)
        db.session.commit()
        db.session.remove()
        return jsonify({"mensagem": "Jogador adicionado com sucesso!", "jogador": {"id": novo_jogador.id, "nome": novo_jogador.nome, "genero": novo_jogador.genero, "notas": novo_jogador.notas}}), 201
    except Exception as e:
        db.session.rollback()
        db.session.remove()
        app.logger.error(f"Erro ao adicionar jogador: {e}", exc_info=True)
        return jsonify({"erro": "Erro interno ao salvar jogador"}), 500

@app.route('/jogadores', methods=['GET'])
def get_jogadores():
    try:
        todos_os_jogadores = Jogador.query.all()
        lista_jogadores_dict = [{"id": j.id, "nome": j.nome, "genero": j.genero, "notas": j.notas} for j in todos_os_jogadores]
        return jsonify(lista_jogadores_dict), 200
    except Exception as e:
        app.logger.error(f"Erro ao buscar jogadores: {e}", exc_info=True)
        return jsonify({"erro": "Erro interno ao buscar jogadores"}), 500
    finally:
        db.session.remove()

@app.route('/jogador/excluir/<int:jogador_id>', methods=['DELETE'])
def excluir_jogador_db(jogador_id):
    try:
        jogador_para_excluir = Jogador.query.get_or_404(jogador_id)
        db.session.delete(jogador_para_excluir)
        db.session.commit()
        db.session.remove()
        return jsonify({"mensagem": f"Jogador '{jogador_para_excluir.nome}' excluído com sucesso!"}), 200
    except Exception as e:
        db.session.rollback()
        db.session.remove()
        app.logger.error(f"Erro ao excluir jogador ID {jogador_id}: {e}", exc_info=True)
        return jsonify({"erro": "Erro interno ao excluir jogador"}), 500

@app.route('/jogador/editar/<int:jogador_id>', methods=['PUT'])
def editar_jogador_db(jogador_id):
    try:
        jogador_para_editar = Jogador.query.get_or_404(jogador_id)
        dados = request.get_json()
        if not dados:
            return jsonify({"erro": "Nenhum dado fornecido para atualização"}), 400
        jogador_para_editar.nome = dados.get('nome', jogador_para_editar.nome)
        jogador_para_editar.genero = dados.get('genero', jogador_para_editar.genero)
        if 'notas' in dados:
            jogador_para_editar.notas = dados['notas']
        db.session.commit()
        db.session.remove()
        return jsonify({"mensagem": f"Jogador '{jogador_para_editar.nome}' atualizado com sucesso!", "jogador": {"id": jogador_para_editar.id, "nome": jogador_para_editar.nome, "genero": jogador_para_editar.genero, "notas": jogador_para_editar.notas}}), 200
    except Exception as e:
        db.session.rollback()
        db.session.remove()
        app.logger.error(f"Erro ao editar jogador ID {jogador_id}: {e}", exc_info=True)
        return jsonify({"erro": "Erro interno ao editar jogador"}), 500

@app.route('/balancear', methods=['POST'])
def handle_balanceamento():
    # ... (código do balanceamento como antes) ...
    dados = request.get_json()
    if not dados or 'jogadores' not in dados or 'num_times' not in dados or 'pessoas_por_time' not in dados:
        return jsonify({"erro": "Dados incompletos."}), 400
    jogadores_data = dados.get('jogadores', [])
    num_times = dados.get('num_times', 2)
    pessoas_por_time = dados.get('pessoas_por_time', 0)
    pesos = dados.get('pesos', {})
    
    times_finais, provas_finais, banco = balancear_times_avancado(jogadores_data, num_times, pessoas_por_time, pesos)
    if times_finais is None:
        msg_erro = banco.get("erro") if isinstance(banco, dict) and "erro" in banco else "Erro no balanceamento."
        return jsonify({"erro": msg_erro}), 400
    return jsonify({"times_balanceados": times_finais, "banco_de_reservas": banco, "provas_do_equilibrio": provas_finais})

def balancear_times_avancado(jogadores_param, num_times, pessoas_por_time, pesos):
    # ... (código do balancear_times_avancado como antes) ...
    jogadores_necessarios = num_times * pessoas_por_time
    jogadores_disponiveis = len(jogadores_param)
    if jogadores_disponiveis < jogadores_necessarios:
        return None, None, {"erro": f"Jogadores insuficientes. São necessários {jogadores_necessarios}, mas apenas {jogadores_disponiveis} estão disponíveis."}
    jogadores_copia = [j.copy() for j in jogadores_param]
    for jogador_obj in jogadores_copia:
        notas_vals = jogador_obj.get('notas', {}).values()
        jogador_obj['potencial'] = sum(notas_vals) / len(notas_vals) if notas_vals else 0.0
    jogadores_ordenados_geral = sorted(jogadores_copia, key=lambda j: j.get('potencial', 0.0), reverse=True)
    jogadores_selecionados = jogadores_ordenados_geral[:jogadores_necessarios]
    banco_de_reservas = jogadores_ordenados_geral[jogadores_necessarios:]
    for j_obj in jogadores_selecionados:
        j_obj['craque'] = False
    jogadores_ordenados_selecionados = sorted(jogadores_selecionados, key=lambda j: j.get('potencial', 0.0), reverse=True)
    if jogadores_ordenados_selecionados:
        num_craques_a_marcar = len(jogadores_ordenados_selecionados) // 3
        for i in range(min(num_craques_a_marcar, len(jogadores_ordenados_selecionados))):
            jogadores_ordenados_selecionados[i]['craque'] = True
    if jogadores_ordenados_selecionados:
        metade_superior = jogadores_ordenados_selecionados[:len(jogadores_ordenados_selecionados)//2]
        metade_inferior = jogadores_ordenados_selecionados[len(jogadores_ordenados_selecionados)//2:]
        random.shuffle(metade_superior)
        jogadores_para_alocar = metade_superior + metade_inferior
    else:
        jogadores_para_alocar = []
    if not jogadores_para_alocar:
        return [], [], banco_de_reservas
    if not jogadores_para_alocar[0].get('notas'):
        app.logger.error("Primeiro jogador para alocar não tem 'notas': %s", jogadores_para_alocar[0])
        return [], [], banco_de_reservas 
    categorias = list(jogadores_para_alocar[0]['notas'].keys())
    times = [[] for _ in range(num_times)]
    for jogador_obj_alocar in jogadores_para_alocar:
        melhor_time_idx = -1
        menor_custo = float('inf')
        for i in range(num_times):
            times[i].append(jogador_obj_alocar)
            somas_categorias_temp = [{cat: sum(p.get('notas',{}).get(cat,0) for p in t) for cat in categorias} for t in times]
            custo_tecnico = 0
            for cat in categorias:
                valores_cat = [s[cat] for s in somas_categorias_temp]
                if len(valores_cat) > 1 :
                    numeros_validos = [v for v in valores_cat if isinstance(v, (int, float))]
                    if len(numeros_validos) > 1:
                         custo_tecnico += statistics.stdev(numeros_validos)
            tamanhos_times = [len(t) for t in times]
            custo_tamanho = statistics.stdev(tamanhos_times) if len(set(tamanhos_times)) > 1 else 0
            contagem_craques_times = [sum(1 for p in t if p.get('craque', False)) for t in times]
            custo_talentos = statistics.stdev(contagem_craques_times) if len(set(contagem_craques_times)) > 1 else 0
            contagem_genero_m_times = [sum(1 for p in t if p.get('genero') == 'M') for t in times]
            custo_genero = statistics.stdev(contagem_genero_m_times) if len(set(contagem_genero_m_times)) > 1 else 0
            custo_total = (custo_tecnico * pesos.get('tecnico', 1.0)) + \
                          (custo_tamanho * pesos.get('tamanho', 1.0)) + \
                          (custo_talentos * pesos.get('talentos', 1.0)) + \
                          (custo_genero * pesos.get('genero', 1.0))
            if custo_total < menor_custo:
                menor_custo = custo_total
                melhor_time_idx = i
            times[i].pop()
        if melhor_time_idx != -1 :
             times[melhor_time_idx].append(jogador_obj_alocar)
        elif times: 
            times[0].append(jogador_obj_alocar)
    provas_equilibrio = []
    for t in times:
        cats_para_soma = categorias if t and t[0].get('notas') else (list(jogadores_para_alocar[0]['notas'].keys()) if jogadores_para_alocar and jogadores_para_alocar[0].get('notas') else [])
        prova = {
            "jogadores_total": len(t),
            "genero_m": sum(1 for p in t if p.get('genero') == 'M'),
            "genero_f": sum(1 for p in t if p.get('genero') == 'F'),
            "craques_total": sum(1 for p in t if p.get('craque', False)),
            "soma_potencial": sum(p.get('potencial', 0.0) for p in t),
            "somas_habilidades": {cat: sum(p.get('notas',{}).get(cat,0) for p in t) for cat in cats_para_soma}
        }
        provas_equilibrio.append(prova)
    return times, provas_equilibrio, banco_de_reservas

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)