"""
Preparacao de caracteristicas (features) partilhada pelo treino e pela previsao.

Mantem uma unica definicao das variaveis, para que o treino e a previsao usem
exatamente as mesmas transformacoes (evita divergencias entre os dois passos).
"""

from __future__ import annotations

import pandas as pd

# Colunas "cruas" que devem existir no CSV de entrada (alem do alvo `faltou`).
COLUNAS_BASE = [
    "sexo",
    "idade",
    "tratamento",
    "medico",
    "seguro",
    "canal_preferido",
    "valor_euros",
    "distancia_km",
    "data",             # AAAA-MM-DD (data da consulta)
    "hora",             # HH:MM
    "consultas_totais",
    "faltas_anteriores",
    "antecedencia_dias",
]

ALVO = "faltou"  # 0 = compareceu, 1 = faltou

# Caracteristicas usadas pelo modelo (apos a preparacao).
CATEGORICAS = [
    "sexo",
    "tratamento",
    "medico",
    "seguro",
    "canal_preferido",
    "estacao",
]
NUMERICAS = [
    "idade",
    "valor_euros",
    "distancia_km",
    "hora_num",
    "dia_semana",
    "epoca_ferias",
    "taxa_faltas",
    "paciente_novo",
    "antecedencia_dias",
    "consultas_totais",
]


def _estacao(mes: int) -> str:
    if mes in (12, 1, 2):
        return "Inverno"
    if mes in (3, 4, 5):
        return "Primavera"
    if mes in (6, 7, 8):
        return "Verao"
    return "Outono"


def preparar(df: pd.DataFrame) -> pd.DataFrame:
    """Acrescenta as caracteristicas derivadas a partir das colunas base."""
    df = df.copy()

    data = pd.to_datetime(df["data"], errors="coerce")
    df["mes"] = data.dt.month
    df["dia_semana"] = data.dt.weekday  # 0 = segunda ... 6 = domingo
    df["estacao"] = df["mes"].apply(_estacao)
    # Epoca de ferias/festas (Julho, Agosto, Dezembro) tende a ter mais faltas.
    df["epoca_ferias"] = df["mes"].isin([7, 8, 12]).astype(int)

    # Hora do dia (0-23) a partir de "HH:MM".
    df["hora_num"] = df["hora"].astype(str).str.slice(0, 2)
    df["hora_num"] = pd.to_numeric(df["hora_num"], errors="coerce").fillna(0).astype(int)

    # Taxa historica de faltas do paciente.
    total = df["consultas_totais"].clip(lower=0)
    df["taxa_faltas"] = (df["faltas_anteriores"] / total.replace(0, pd.NA)).fillna(0.0)
    df["paciente_novo"] = (total == 0).astype(int)

    return df


def features_alvo(df: pd.DataFrame):
    """Devolve (X, y) prontos para o modelo. Requer a coluna `faltou`."""
    df = preparar(df)
    X = df[CATEGORICAS + NUMERICAS]
    y = df[ALVO].astype(int)
    return X, y


def apenas_features(df: pd.DataFrame):
    """Devolve X para previsao (sem alvo)."""
    df = preparar(df)
    return df[CATEGORICAS + NUMERICAS]
