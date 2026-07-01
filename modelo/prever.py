"""
Aplica um modelo treinado a novas marcacoes e devolve a probabilidade de falta.

Demonstra o passo de integracao "pre-calcular": gera um CSV com uma coluna
`risco_falta` (0-100) e `nivel`, que a aplicacao poderia ler diretamente (ou
que poderia ser gravado numa coluna da tabela `consultas` no Supabase).

Uso:
    python prever.py --entrada dados/novas.csv --saida saida/previsoes.csv

Se nao indicar --entrada, usa as primeiras linhas do CSV de exemplo (sem o
rotulo) apenas para demonstrar o funcionamento.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd

import caracteristicas as carac

AQUI = Path(__file__).parent


def nivel(pct: float) -> str:
    if pct >= 67:
        return "alto"
    if pct >= 34:
        return "medio"
    return "baixo"


def main() -> None:
    ap = argparse.ArgumentParser(description="Preve o risco de falta de novas marcacoes.")
    ap.add_argument("--modelo", default=str(AQUI / "saida" / "modelo_faltas.joblib"))
    ap.add_argument("--entrada", default=None)
    ap.add_argument("--saida", default=str(AQUI / "saida" / "previsoes.csv"))
    args = ap.parse_args()

    modelo_path = Path(args.modelo)
    if not modelo_path.exists():
        raise SystemExit(
            f"Modelo nao encontrado: {modelo_path}\n"
            "Treine primeiro com: python treinar_modelo.py"
        )
    pipe = joblib.load(modelo_path)

    if args.entrada:
        df = pd.read_csv(args.entrada)
    else:
        exemplo = AQUI / "dados" / "consultas_exemplo.csv"
        if not exemplo.exists():
            raise SystemExit("Sem --entrada e sem dados de exemplo. Gere dados primeiro.")
        df = pd.read_csv(exemplo).head(10).drop(columns=[carac.ALVO], errors="ignore")
        print("(sem --entrada: a demonstrar com 10 linhas do CSV de exemplo)")

    X = carac.apenas_features(df)
    prob = pipe.predict_proba(X)[:, 1]

    saida = df.copy()
    saida["risco_falta"] = (prob * 100).round().astype(int)
    saida["nivel"] = saida["risco_falta"].apply(nivel)

    Path(args.saida).parent.mkdir(parents=True, exist_ok=True)
    saida.to_csv(args.saida, index=False, encoding="utf-8")
    print(f"Previsoes guardadas em {args.saida}")

    cols = [c for c in ["tratamento", "medico", "risco_falta", "nivel"] if c in saida.columns]
    print(saida[cols].to_string(index=False))


if __name__ == "__main__":
    main()
