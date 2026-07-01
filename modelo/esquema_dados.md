# Formato do CSV de treino

Uma linha por **consulta passada** (que já teve desfecho). O modelo aprende a
relação entre as variáveis e a coluna-alvo `faltou`.

| Coluna | Tipo | Exemplo | Notas |
|---|---|---|---|
| `sexo` | texto | Feminino / Masculino | |
| `idade` | inteiro | 42 | anos |
| `tratamento` | texto | Endodontia | tipo de consulta |
| `medico` | texto | m07 | id ou nome do médico/responsável |
| `seguro` | texto | Particular | "Particular" = sem seguro |
| `canal_preferido` | texto | SMS | SMS / Email / App / Telefone / Nenhum |
| `valor_euros` | número | 180 | valor da consulta |
| `distancia_km` | número | 12.4 | distância casa→clínica |
| `data` | data | 2025-03-14 | AAAA-MM-DD (data da consulta) |
| `hora` | texto | 09:30 | HH:MM |
| `consultas_totais` | inteiro | 11 | histórico do paciente antes desta consulta |
| `faltas_anteriores` | inteiro | 4 | faltas do paciente antes desta consulta |
| `antecedencia_dias` | inteiro | 21 | dias entre a marcação e a consulta |
| **`faltou`** | 0/1 | 1 | **alvo**: 1 = faltou, 0 = compareceu |

## Variáveis derivadas (calculadas automaticamente)

O script [`caracteristicas.py`](caracteristicas.py) cria, a partir das colunas
acima: hora do dia, mês, dia da semana, estação do ano, época de férias, taxa
histórica de faltas (`faltas_anteriores / consultas_totais`) e "paciente novo".

## De onde vêm estes dados

Quase tudo já existe na tabela `consultas` (e tabelas relacionadas) do Supabase.
O rótulo `faltou` obtém-se do campo `estado`: `Faltou` → 1; `Realizada` → 0
(as `Cancelada`/`Agendada`/`Confirmada` não entram no treino).

> Nota: `consultas_totais` e `faltas_anteriores` devem refletir o histórico do
> paciente **até à data dessa consulta** (não o total de hoje), para não
> "espreitar o futuro" durante o treino.

## Cardinalidade do médico

Com muitos médicos, a coluna `medico` gera muitas colunas no *one-hot encoding*.
Para produção, considerar agrupar por clínica ou usar *target encoding*.
