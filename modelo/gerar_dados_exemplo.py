"""
Gera um CSV de dados de exemplo (ficticios) no formato de treino, para que o
pipeline possa ser experimentado de ponta a ponta sem dados reais.

Os rotulos `faltou` sao gerados a partir de uma relacao conhecida entre as
variaveis e a probabilidade de falta, de modo a que o modelo tenha sinal para
aprender. NAO representam dados reais.

Uso:
    python gerar_dados_exemplo.py            # cria dados/consultas_exemplo.csv
    python gerar_dados_exemplo.py -n 8000    # numero de linhas
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

TRATAMENTOS = {
    "Primeira consulta": 30,
    "Consulta de rotina": 40,
    "Destartarizacao": 55,
    "Endodontia": 180,
    "Implantologia": 900,
    "Ortodontia": 120,
    "Cirurgia oral": 250,
    "Urgencia": 60,
}
# Propensao relativa de falta por tratamento (0 baixa, 1 alta).
PROP_TRATAMENTO = {
    "Urgencia": 0.05, "Implantologia": 0.15, "Cirurgia oral": 0.2,
    "Endodontia": 0.35, "Ortodontia": 0.55, "Primeira consulta": 0.7,
    "Consulta de rotina": 0.8, "Destartarizacao": 0.85,
}
SEGUROS = ["Particular", "Medis", "Multicare", "AdvanceCare", "SNS"]
CANAIS = ["SMS", "Email", "App", "Telefone", "Nenhum"]
HORAS = ["08:30", "09:00", "09:30", "10:00", "11:00", "12:00",
         "14:00", "15:00", "16:00", "17:00", "18:00", "18:30"]


def gerar(n: int, semente: int = 42) -> pd.DataFrame:
    r = np.random.default_rng(semente)

    # Efeito por medico (alguns tem agendas com mais faltas).
    medicos = [f"m{ i:02d}" for i in range(1, 21)]
    efeito_medico = {m: r.uniform(-0.6, 0.9) for m in medicos}

    linhas = []
    base = pd.Timestamp("2025-01-01")
    for _ in range(n):
        sexo = r.choice(["Feminino", "Masculino"])
        idade = int(r.integers(7, 85))
        tratamento = r.choice(list(TRATAMENTOS))
        medico = r.choice(medicos)
        seguro = r.choice(SEGUROS)
        canal = r.choice(CANAIS)
        valor = TRATAMENTOS[tratamento]
        distancia = round(float(r.uniform(1, 40)), 1)
        data = base + pd.Timedelta(days=int(r.integers(0, 365)))
        hora = r.choice(HORAS)
        consultas_totais = int(r.integers(0, 19))
        propensao = r.random()
        faltas_ant = 0 if consultas_totais == 0 else int(
            min(consultas_totais, round(consultas_totais * propensao ** 2 * 0.6))
        )
        antecedencia = int(r.integers(0, 61))

        # --- Relacao latente (logit) -> probabilidade de faltar ------------
        taxa_faltas = 0.0 if consultas_totais == 0 else faltas_ant / consultas_totais
        hora_num = int(hora[:2])
        mes = data.month
        logit = -4.0  # intercepto ajustado para uma taxa global de faltas ~20%
        logit += 2.6 * taxa_faltas
        logit += 0.9 if consultas_totais == 0 else 0.0
        logit += 1.1 * PROP_TRATAMENTO[tratamento]
        logit += 0.010 * antecedencia
        logit += 0.020 * distancia
        logit += 0.5 if idade < 30 else 0.0
        logit += 0.25 if sexo == "Masculino" else 0.0
        logit += 0.4 if mes in (7, 8, 12) else 0.0
        logit += 0.6 if canal == "Nenhum" else 0.0
        logit += 0.3 if seguro != "Particular" else 0.0
        logit += 0.4 if hora_num < 9 or hora_num >= 18 else 0.0
        logit += efeito_medico[medico]
        logit += r.normal(0, 0.35)  # ruido

        prob = 1 / (1 + np.exp(-logit))
        faltou = int(r.random() < prob)

        linhas.append({
            "sexo": sexo, "idade": idade, "tratamento": tratamento,
            "medico": medico, "seguro": seguro, "canal_preferido": canal,
            "valor_euros": valor, "distancia_km": distancia,
            "data": data.strftime("%Y-%m-%d"), "hora": hora,
            "consultas_totais": consultas_totais, "faltas_anteriores": faltas_ant,
            "antecedencia_dias": antecedencia, "faltou": faltou,
        })

    return pd.DataFrame(linhas)


def main() -> None:
    ap = argparse.ArgumentParser(description="Gera dados de exemplo para treino.")
    ap.add_argument("-n", "--linhas", type=int, default=5000)
    ap.add_argument("-o", "--saida", default=None)
    args = ap.parse_args()

    destino = Path(args.saida) if args.saida else Path(__file__).parent / "dados" / "consultas_exemplo.csv"
    destino.parent.mkdir(parents=True, exist_ok=True)

    df = gerar(args.linhas)
    df.to_csv(destino, index=False, encoding="utf-8")
    taxa = df["faltou"].mean()
    print(f"Gerado: {destino} ({len(df)} linhas, {taxa:.1%} de faltas)")


if __name__ == "__main__":
    main()
