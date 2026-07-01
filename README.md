# Lembre-se de Cancelar

Painel web para uma clínica dentária com várias localizações. Mostra as
marcações por dia e por gabinete de consulta, e calcula o **risco de cada
paciente faltar à consulta** a partir de um conjunto de variáveis.

Interface inteiramente em **português europeu**.

> Estado: protótipo / mockup funcional. Arranca com dados de demonstração em
> memória e pode ligar-se a uma base de dados Supabase real.

## Funcionalidades

- **Navegação por localização primeiro:** escolhe-se a clínica, depois vê-se a
  agenda do dia organizada por gabinete.
- **Agenda por gabinete:** cada gabinete é uma coluna com as marcações por ordem
  de hora, médico responsável e estado (Agendada, Confirmada, Realizada, Faltou,
  Cancelada).
- **Risco de falta por paciente:** cada marcação tem uma pontuação 0–100 e um
  nível (baixo / médio / alto), com cores e um distintivo.
- **Explicação do risco:** ao abrir um paciente, o painel mostra exatamente que
  fatores contribuíram para a pontuação e sugere uma ação (ex.: ligar a
  confirmar, enviar SMS).
- **Resumo do dia:** marcações, confirmadas, risco alto, taxa de falta prevista
  e número estimado de faltas — por clínica e no topo da agenda.
- **Filtros:** por gabinete, por nível de risco, por "só por confirmar" e
  pesquisa por nome do paciente.
- **Seletor de data:** navegação dia-a-dia ou escolha direta no calendário.

## Modelo de risco

O risco é uma pontuação 0–100. O modelo atual é **heurístico e transparente**:
cada fator devolve a sua contribuição em pontos e uma explicação
(ver [`src/logica/risco.ts`](src/logica/risco.ts)). No futuro será substituído
por um modelo preditivo treinado com dados reais; as variáveis já estão
alinhadas com esse objetivo.

| Grupo | Variáveis |
|---|---|
| Histórico | taxa de faltas, cancelamentos tardios, paciente novo |
| Confirmação/antecedência | marcação por confirmar, dias de antecedência |
| Contexto da consulta | tratamento (tipo), valor da consulta, hora, dia da semana, época do ano, primeira consulta |
| Médico/responsável | taxa de falta histórica da agenda do médico |
| Perfil do paciente | idade, sexo, distância, inatividade, seguro, meio de comunicação preferencial |

Níveis: **baixo** (0–33), **médio** (34–66), **alto** (67–100).

> Os pesos são ilustrativos. Variáveis sensíveis (ex.: sexo) estão incluídas por
> constarem do conjunto previsto para o modelo, e devem ser calibradas — ou
> ponderadas eticamente — com dados reais.

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Base de dados:** Supabase (PostgreSQL) — opcional
- **Sem backend próprio:** o cálculo de risco corre no cliente; a Supabase serve
  apenas os dados.

## Como executar

Requer [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Sem configuração, usa dados de demonstração
gerados para os dias à volta de hoje (o cabeçalho mostra "Dados de demonstração").

### Build de produção

```bash
npm run build      # gera dist/
npm run preview    # serve o build localmente
```

## Ligar a uma base de dados Supabase (opcional)

1. Cria um projeto em [supabase.com](https://supabase.com).
2. Aplica o esquema: corre [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql)
   no SQL Editor da Supabase.
3. Gera e carrega os dados de demonstração:
   ```bash
   npm run gerar-seed          # cria supabase/seed.sql
   ```
   Depois cola o conteúdo de `supabase/seed.sql` no SQL Editor e executa.
4. Copia `.env.example` para `.env` e preenche:
   ```
   VITE_SUPABASE_URL=https://<o-teu-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<a-tua-anon-key>
   ```
5. Reinicia `npm run dev`. O cabeçalho passa a mostrar "Dados: Supabase".

> As datas das marcações são geradas relativamente ao dia atual, por isso convém
> regerar o seed (`npm run gerar-seed`) antes de recarregar a base de dados.

## Estrutura do projeto

```
src/
  tipos.ts                 Modelo de domínio (TypeScript)
  logica/risco.ts          Modelo de cálculo de risco de falta
  dados/
    seed.ts                Gerador de dados de demonstração
    supabase.ts            Cliente Supabase
    repositorio.ts         Camada de acesso (mock + Supabase)
  componentes/             Componentes React da interface
  utils/formato.ts         Formatação de datas e texto (pt-PT)
scripts/
  gerar-seed-sql.ts        Gera supabase/seed.sql a partir do seed
supabase/
  migrations/0001_schema.sql
modelo/                    Pipeline Python para treinar o modelo preditivo (futuro)
```

## Modelo preditivo (futuro)

O risco mostrado na app é, para já, uma **heurística** ([src/logica/risco.ts](src/logica/risco.ts)).
A pasta [`modelo/`](modelo/) contém o esqueleto de um pipeline em Python
(pandas + scikit-learn) para, no futuro, **treinar um modelo preditivo** com o
histórico real de faltas e substituir essa heurística. Ver
[modelo/README.md](modelo/README.md).

## Aviso

Os dados (pacientes, médicos, marcações) são fictícios e gerados
automaticamente. O modelo de risco é ilustrativo e deve ser calibrado com dados
reais antes de qualquer uso clínico.
