"""
Treina um modelo de previsao de faltas a partir de um CSV historico.

Uso:
    python treinar_modelo.py                          # usa dados/consultas_exemplo.csv
    python treinar_modelo.py --dados dados/reais.csv  # usa os seus dados
    python treinar_modelo.py --modelo boosting        # regressao logistica (padrao) ou boosting

Saidas (na pasta modelo/saida/):
    modelo_faltas.joblib   -> modelo treinado, para usar em prever.py
    metricas.txt           -> resumo das metricas
    roc.png / calibracao.png (se o matplotlib estiver disponivel)
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    brier_score_loss,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

import caracteristicas as carac

AQUI = Path(__file__).parent
SAIDA = AQUI / "saida"


def construir_pipeline(tipo: str) -> Pipeline:
    pre = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), carac.CATEGORICAS),
            ("num", StandardScaler(), carac.NUMERICAS),
        ]
    )
    if tipo == "boosting":
        modelo = GradientBoostingClassifier(random_state=0)
    else:
        # class_weight="balanced" -> compensa o facto de as faltas serem minoria.
        modelo = LogisticRegression(max_iter=1000, class_weight="balanced")
    return Pipeline([("pre", pre), ("modelo", modelo)])


def nomes_caracteristicas(pipe: Pipeline) -> list[str]:
    pre: ColumnTransformer = pipe.named_steps["pre"]
    ohe: OneHotEncoder = pre.named_transformers_["cat"]
    nomes_cat = list(ohe.get_feature_names_out(carac.CATEGORICAS))
    return nomes_cat + list(carac.NUMERICAS)


def guardar_graficos(y_test, prob) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from sklearn.calibration import calibration_curve
        from sklearn.metrics import RocCurveDisplay

        RocCurveDisplay.from_predictions(y_test, prob)
        plt.title("Curva ROC")
        plt.savefig(SAIDA / "roc.png", dpi=120, bbox_inches="tight")
        plt.close()

        frac_pos, media_prev = calibration_curve(y_test, prob, n_bins=10)
        plt.plot(media_prev, frac_pos, "o-", label="Modelo")
        plt.plot([0, 1], [0, 1], "--", color="gray", label="Ideal")
        plt.xlabel("Probabilidade prevista")
        plt.ylabel("Faltas observadas")
        plt.title("Calibracao")
        plt.legend()
        plt.savefig(SAIDA / "calibracao.png", dpi=120, bbox_inches="tight")
        plt.close()
        print(f"Graficos guardados em {SAIDA}/roc.png e calibracao.png")
    except Exception as e:  # matplotlib opcional
        print(f"(graficos ignorados: {e})")


def main() -> None:
    ap = argparse.ArgumentParser(description="Treina o modelo de previsao de faltas.")
    ap.add_argument("--dados", default=str(AQUI / "dados" / "consultas_exemplo.csv"))
    ap.add_argument("--modelo", choices=["logistica", "boosting"], default="logistica")
    ap.add_argument("--saida", default=str(SAIDA / "modelo_faltas.joblib"))
    args = ap.parse_args()

    SAIDA.mkdir(parents=True, exist_ok=True)

    caminho = Path(args.dados)
    if not caminho.exists():
        raise SystemExit(
            f"Ficheiro nao encontrado: {caminho}\n"
            "Gere dados de exemplo com: python gerar_dados_exemplo.py"
        )

    print(f"A ler {caminho} ...")
    df = pd.read_csv(caminho)
    em_falta = [c for c in carac.COLUNAS_BASE + [carac.ALVO] if c not in df.columns]
    if em_falta:
        raise SystemExit(f"Colunas em falta no CSV: {em_falta}")

    X, y = carac.features_alvo(df)
    print(f"{len(df)} consultas | {y.mean():.1%} de faltas no historico")

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, random_state=0, stratify=y
    )

    pipe = construir_pipeline(args.modelo)
    print(f"A treinar modelo ({args.modelo}) ...")
    pipe.fit(X_tr, y_tr)

    prob = pipe.predict_proba(X_te)[:, 1]
    pred = (prob >= 0.5).astype(int)

    auc = roc_auc_score(y_te, prob)
    brier = brier_score_loss(y_te, prob)
    relatorio = classification_report(y_te, pred, target_names=["Compareceu", "Faltou"])
    matriz = confusion_matrix(y_te, pred)

    linhas = [
        f"Modelo: {args.modelo}",
        f"Consultas de treino/teste: {len(X_tr)}/{len(X_te)}",
        f"ROC AUC: {auc:.3f}  (0.5 = aleatorio, 1.0 = perfeito)",
        f"Brier score: {brier:.3f}  (mais baixo = melhor calibrado)",
        "",
        "Relatorio de classificacao (limiar 0.5):",
        relatorio,
        "Matriz de confusao [linhas=real, colunas=previsto]:",
        f"                previsto: Compareceu  Faltou",
        f"  real Compareceu           {matriz[0,0]:>6}  {matriz[0,1]:>6}",
        f"  real Faltou               {matriz[1,0]:>6}  {matriz[1,1]:>6}",
    ]

    # Peso de cada variavel (apenas na regressao logistica).
    if args.modelo == "logistica":
        coefs = pipe.named_steps["modelo"].coef_[0]
        nomes = nomes_caracteristicas(pipe)
        top = sorted(zip(nomes, coefs), key=lambda t: abs(t[1]), reverse=True)[:12]
        linhas.append("")
        linhas.append("Variaveis com mais peso (coeficiente; + aumenta risco):")
        for nome, c in top:
            linhas.append(f"  {c:+.2f}  {nome}")

    resumo = "\n".join(linhas)
    print("\n" + resumo)
    (SAIDA / "metricas.txt").write_text(resumo + "\n", encoding="utf-8")

    joblib.dump(pipe, args.saida)
    print(f"\nModelo guardado em {args.saida}")

    guardar_graficos(y_te, prob)


if __name__ == "__main__":
    main()
