import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import statistics
import random

# --- CONFIGURAÇÃO DO APP E DO BANCO DE DADOS ---
app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# Define o caminho base do projeto para o banco de dados SQLite local
basedir = os.path.abspath(os.path.dirname(__file__))

# Tenta pegar a URL do banco de dados do Render (Variável de Ambiente).
# Se não encontrar (estamos rodando localmente), usa um banco SQLite local.
db_url_render = os.environ.get('DATABASE_URL')
if db_url_render:
    # Se estiver no Render, substitui 'postgres://' por 'postgresql://' se necessário
    # (SQLAlchemy espera 'postgresql://')
    if db_url_render.startswith("postgres://"):
        db_url_render = db_url_render.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url_render
else:
    # Configuração para o banco de dados SQLite local
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app_local.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

CORS(app, resources={
    r"/balancear": {"origins": "*"},
    r"/jogador/adicionar": {"origins": "*"},
    r"/jogadores": {"origins": "*"} # Adicionaremos esta rota em breve
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
        novo_jogador = Jogador(
            nome=dados['nome'],
            genero=dados['genero'],
            notas=dados['notas']
        )
        db.session.add(novo_jogador)
        db.session.commit()
        return jsonify({
            "mensagem": "Jogador adicionado com sucesso!",
            "jogador": {
                "id": novo_jogador.id,
                "nome": novo_jogador.nome,
                "genero": novo_jogador.genero,
                "notas": novo_jogador.notas
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao adicionar jogador: {e}")
        return jsonify({"erro": "Erro interno ao salvar jogador"}), 500

@app.route('/balancear', methods=['POST'])
def handle_balanceamento():
    dados = request.get_json()
    if not dados or 'jogadores' not in dados or 'num_times' not in dados or 'pessoas_por_time' not in dados:
        return jsonify({"erro": "Dados incompletos."}), 400
    jogadores_data = dados.get('jogadores', []) # Renomeado para evitar conflito de nome
    num_times = dados.get('num_times', 2)
    pessoas_por_time = dados.get('pessoas_por_time', 0)
    pesos = dados.get('pesos', {})
    
    times_finais, provas_finais, banco = balancear_times_avancado(jogadores_data, num_times, pessoas_por_time, pesos) # Usando jogadores_data
    if times_finais is None:
        return jsonify(banco), 400
    return jsonify({
        "times_balanceados": times_finais,
        "banco_de_reservas": banco,
        "provas_do_equilibrio": provas_finais
    })

# ROTA PARA BUSCAR TODOS OS JOGADORES DO BANCO DE DADOS
@app.route('/jogadores', methods=['GET'])
def get_jogadores():
    try:
        todos_os_jogadores = Jogador.query.all() # Busca todos os jogadores
        
        # Converte a lista de objetos Jogador em uma lista de dicionários para o JSON
        lista_jogadores_dict = []
        for jogador_obj in todos_os_jogadores:
            lista_jogadores_dict.append({
                "id": jogador_obj.id,
                "nome": jogador_obj.nome,
                "genero": jogador_obj.genero,
                "notas": jogador_obj.notas # O campo notas já é um JSON/dict
            })
            
        return jsonify(lista_jogadores_dict), 200
    except Exception as e:
        print(f"Erro ao buscar jogadores: {e}")
        return jsonify({"erro": "Erro interno ao buscar jogadores"}), 500

def balancear_times_avancado(jogadores_param, num_times, pessoas_por_time, pesos): # Renomeado para jogadores_param
    jogadores_necessarios = num_times * pessoas_por_time
    jogadores_disponiveis = len(jogadores_param)

    if jogadores_disponiveis < jogadores_necessarios:
        return None, None, {"erro": f"Jogadores insuficientes. São necessários {jogadores_necessarios}, mas apenas {jogadores_disponiveis} estão disponíveis."}

    # Cria uma cópia dos jogadores para não modificar a lista original
    jogadores_copia = [j.copy() for j in jogadores_param]


    for jogador_obj in jogadores_copia: # Mudança para jogador_obj
        notas_vals = jogador_obj['notas'].values()
        jogador_obj['potencial'] = sum(notas_vals) / len(notas_vals) if notas_vals else 0
    
    jogadores_ordenados_geral = sorted(jogadores_copia, key=lambda j: j['potencial'], reverse=True)

    jogadores_selecionados = jogadores_ordenados_geral[:jogadores_necessarios]
    banco_de_reservas = jogadores_ordenados_geral[jogadores_necessarios:]

    for j_obj in jogadores_selecionados: # Mudança para j_obj
        j_obj['craque'] = False

    jogadores_ordenados = sorted(jogadores_selecionados, key=lambda j_obj: j_obj['potencial'], reverse=True)
    if jogadores_ordenados:
        num_craques_a_marcar = len(jogadores_ordenados) // 3
        for i in range(min(num_craques_a_marcar, len(jogadores_ordenados))):
            jogadores_ordenados[i]['craque'] = True
    
    metade_superior = jogadores_ordenados[:len(jogadores_ordenados)//2]
    metade_inferior = jogadores_ordenados[len(jogadores_ordenados)//2:]
    random.shuffle(metade_superior)
    jogadores_para_alocar = metade_superior + metade_inferior

    if not jogadores_para_alocar:
        return [], [], banco_de_reservas

    # Adicionado para o caso de jogadores_para_alocar não ter notas (embora improvável aqui)
    if not jogadores_para_alocar[0].get('notas'):
        return [], [], banco_de_reservas # Ou trate o erro como preferir

    categorias = list(jogadores_para_alocar[0]['notas'].keys())
    times = [[] for _ in range(num_times)]

    for jogador_obj_alocar in jogadores_para_alocar: # Mudança para jogador_obj_alocar
        melhor_time_idx = -1
        menor_custo = float('inf')

        for i in range(num_times):
            times[i].append(jogador_obj_alocar)
            
            somas_categorias_temp = [{cat: sum(p['notas'][cat] for p in t) for cat in categorias} for t in times]
            
            custo_tecnico = 0
            for cat in categorias:
                valores_cat = [s[cat] for s in somas_categorias_temp]
                if len(valores_cat) > 1 and len([v for v in valores_cat if isinstance(v, (int, float))]) > 1:
                    custo_tecnico += statistics.stdev(valores_cat)
            
            tamanhos_times = [len(t) for t in times]
            custo_tamanho = statistics.stdev(tamanhos_times) if len(set(tamanhos_times)) > 1 else 0
            
            contagem_craques_times = [sum(1 for p in t if p['craque']) for t in times]
            custo_talentos = statistics.stdev(contagem_craques_times) if len(set(contagem_craques_times)) > 1 else 0
            
            contagem_genero_m_times = [sum(1 for p in t if p['genero'] == 'M') for t in times]
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
        else:
            times[0].append(jogador_obj_alocar)

    provas_equilibrio = []
    for t in times:
        prova = {
            "jogadores_total": len(t),
            "genero_m": sum(1 for p in t if p['genero'] == 'M'),
            "genero_f": sum(1 for p in t if p['genero'] == 'F'),
            "craques_total": sum(1 for p in t if p['craque']),
            "soma_potencial": sum(p['potencial'] for p in t),
            "somas_habilidades": {cat: sum(p['notas'][cat] for p in t) for cat in categorias}
        }
        provas_equilibrio.append(prova)

    return times, provas_equilibrio, banco_de_reservas

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)