from flask import Flask, request, jsonify
from flask_cors import CORS # Importação necessária
import statistics
import random

# --- CONFIGURAÇÃO DO SERVIDOR FLASK ---
app = Flask(__name__)
# ATIVAÇÃO DO CORS DE FORMA ESPECÍFICA E PERMISSIVA PARA A ROTA
CORS(app, resources={r"/balancear": {"origins": "*"}})

# --- O RESTANTE DO CÓDIGO CONTINUA EXATAMENTE IGUAL ---
def balancear_times_avancado(jogadores, num_times, pessoas_por_time, pesos):
    # (Toda a sua lógica de balanceamento aqui, sem nenhuma alteração)
    jogadores_necessarios = num_times * pessoas_por_time
    jogadores_disponiveis = len(jogadores)

    if jogadores_disponiveis < jogadores_necessarios:
        return None, None, {"erro": f"Jogadores insuficientes. São necessários {jogadores_necessarios}, mas apenas {jogadores_disponiveis} estão disponíveis."}

    for jogador in jogadores:
        notas = jogador['notas'].values()
        jogador['potencial'] = sum(notas) / len(notas) if notas else 0
    
    jogadores_ordenados_geral = sorted(jogadores, key=lambda j: j['potencial'], reverse=True)

    jogadores_selecionados = jogadores_ordenados_geral[:jogadores_necessarios]
    banco_de_reservas = jogadores_ordenados_geral[jogadores_necessarios:]

    for j in jogadores_selecionados:
        j['craque'] = False

    jogadores_ordenados = sorted(jogadores_selecionados, key=lambda j: j['potencial'], reverse=True)
    num_craques = len(jogadores_ordenados) // 3
    for i in range(num_craques):
        jogadores_ordenados[i]['craque'] = True
    
    metade_superior = jogadores_ordenados[:len(jogadores_ordenados)//2]
    metade_inferior = jogadores_ordenados[len(jogadores_ordenados)//2:]
    random.shuffle(metade_superior)
    jogadores_para_alocar = metade_superior + metade_inferior

    if not jogadores_para_alocar:
        return [], [], banco_de_reservas

    categorias = list(jogadores_para_alocar[0]['notas'].keys())
    times = [[] for _ in range(num_times)]

    for jogador in jogadores_para_alocar:
        melhor_time_idx = -1
        menor_custo = float('inf')

        for i in range(num_times):
            times[i].append(jogador)
            
            somas_categorias = [{cat: sum(p['notas'][cat] for p in t) for cat in categorias} for t in times]
            custo_tecnico = sum(statistics.stdev([s[cat] for s in somas_categorias]) if len(somas_categorias) > 1 else 0 for cat in categorias)
            
            custo_tamanho = statistics.stdev([len(t) for t in times]) if len(times) > 1 else 0
            custo_talentos = statistics.stdev([sum(1 for p in t if p['craque']) for t in times]) if len(times) > 1 else 0
            custo_genero = statistics.stdev([sum(1 for p in t if p['genero'] == 'M') for t in times]) if len(times) > 1 else 0
            
            custo_total = (custo_tecnico * pesos.get('tecnico', 1)) + \
                          (custo_tamanho * pesos.get('tamanho', 1)) + \
                          (custo_talentos * pesos.get('talentos', 1)) + \
                          (custo_genero * pesos.get('genero', 1))

            if custo_total < menor_custo:
                menor_custo = custo_total
                melhor_time_idx = i

            times[i].pop()

        times[melhor_time_idx].append(jogador)
    
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


@app.route('/balancear', methods=['POST'])
def handle_balanceamento():
    dados = request.get_json()
    
    if not dados or 'jogadores' not in dados or 'num_times' not in dados or 'pessoas_por_time' not in dados:
        return jsonify({"erro": "Dados incompletos. É preciso enviar 'jogadores', 'num_times' e 'pessoas_por_time'."}), 400

    jogadores = dados.get('jogadores', [])
    num_times = dados.get('num_times', 2)
    pessoas_por_time = dados.get('pessoas_por_time', 0)
    pesos = dados.get('pesos', {})
    
    times_finais, provas_finais, banco = balancear_times_avancado(jogadores, num_times, pessoas_por_time, pesos)

    if times_finais is None:
        return jsonify(banco), 400

    return jsonify({
        "times_balanceados": times_finais,
        "banco_de_reservas": banco,
        "provas_do_equilibrio": provas_finais
    })

if __name__ == '__main__':
    app.run(debug=True)