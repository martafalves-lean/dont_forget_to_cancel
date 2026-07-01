# Modelo preditivo de faltas

Esqueleto de um pipeline em Python para **treinar** um modelo que prevê a
probabilidade de um paciente faltar a uma consulta.

Isto é independente da aplicação web (que usa, para já, um modelo heurístico em
`src/logica/risco.ts`). Quando este modelo estiver treinado com dados reais,
pode substituir essa heurística (ver "Integração" mais abaixo).

## O que está aqui

| Ficheiro | Função |
|---|---|
| `requirements.txt` | Dependências Python |
| `caracteristicas.py` | Definição e preparação das variáveis (partilhado) |
| `gerar_dados_exemplo.py` | Cria um CSV fictício para experimentar o pipeline |
| `treinar_modelo.py` | Treina, avalia e guarda o modelo |
| `prever.py` | Aplica o modelo guardado a novas marcações |
| `esquema_dados.md` | Formato do CSV de treino (colunas esperadas) |
| `dados/` | Onde colocar os CSV (ficam fora do Git) |
| `saida/` | Modelo treinado, métricas e gráficos (gerado) |

## Como correr (Windows / PowerShell)

```powershell
cd modelo
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 1) gerar dados de exemplo (ficticios)
python gerar_dados_exemplo.py

# 2) treinar o modelo e ver as metricas
python treinar_modelo.py

# 3) prever o risco de novas marcacoes
python prever.py
```

(Em macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`.)

## Como ler as métricas

- **ROC AUC** — capacidade de distinguir quem falta de quem comparece.
  `0.5` = aleatório; `1.0` = perfeito. Em faltas, `0.70–0.80` já é útil.
- **Brier score** — quão bem calibradas estão as probabilidades (mais baixo é
  melhor). Importante se quiser confiar no "%" mostrado.
- **Matriz de confusão** — acertos e erros no limiar de 50%.
- **Coeficientes** (regressão logística) — o peso de cada variável, para
  perceber o que mais influencia o risco.

## Se o Windows bloquear o scikit-learn

Em alguns computadores, uma política de segurança ("Controlo de
Aplicações"/WDAC ou Smart App Control) bloqueia as DLLs compiladas do
scikit-learn, com o erro:

```
ImportError: DLL load failed ... Uma política de Controlo de Aplicações bloqueou este ficheiro.
```

Opções:
- Pedir ao departamento de IT para autorizar o Python/scikit-learn; ou
- Treinar o modelo **na cloud, no Google Colab** (não usa a sua máquina):
  1. Abra <https://colab.research.google.com> → novo notebook.
  2. Faça upload de `caracteristicas.py`, `treinar_modelo.py` e do CSV de dados.
  3. Numa célula: `!pip install scikit-learn pandas joblib matplotlib`
  4. Noutra: `!python treinar_modelo.py --dados o_meu.csv`
  5. Faça download de `saida/modelo_faltas.joblib`.

A geração de dados de exemplo (`gerar_dados_exemplo.py`) e a preparação de
variáveis (`caracteristicas.py`) usam apenas pandas/numpy e não são afetadas.

## Usar os seus dados reais

1. Exporte o histórico para um CSV com as colunas de [`esquema_dados.md`](esquema_dados.md).
2. Treine: `python treinar_modelo.py --dados dados/os_meus_dados.csv`
3. Compare `logistica` (interpretável) com `boosting` (costuma prever melhor):
   `python treinar_modelo.py --modelo boosting`

## Integração na aplicação

Depois de treinado, há dois caminhos para levar as previsões à app:

1. **Pré-calcular** (mais simples): correr `prever.py` periodicamente e gravar a
   probabilidade numa coluna `risco_falta` da tabela `consultas`. A app passa a
   ler essa coluna em vez de chamar `calcularRisco`.
2. **API em tempo real**: expor o modelo num pequeno serviço (ex.: FastAPI) que
   recebe as variáveis e devolve a probabilidade.

## Aviso ético e legal

Variáveis como **sexo** ou **seguro** podem introduzir enviesamento e levantam
questões de RGPD/equidade. Antes de usar em decisões reais (ex.: prioridade de
contacto), valide com a equipa se devem entrar no modelo e monitorize o impacto
por grupo.
