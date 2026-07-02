import type {
  Consulta,
  EntradaListaEspera,
  Paciente,
  SugestaoEspera,
} from '../tipos'

// ---------------------------------------------------------------------------
// Ordenação da lista de espera para preencher uma vaga (consulta cancelada).
// Objetivo: sugerir rapidamente quem contactar primeiro para não perder a vaga.
//
// Critérios (pontuação):
//   Mesmo tratamento da vaga .............. +50
//   Prioridade urgente / preferencial ..... +40 / +20
//   Período (manhã/tarde) compatível ...... +15
//   Tempo em espera (até 60 dias) ......... +0.5 por dia (máx +30)
// ---------------------------------------------------------------------------

function diasEntre(dataInicio: string, dataFim: string): number {
  const a = new Date(dataInicio + 'T00:00:00')
  const b = new Date(dataFim + 'T00:00:00')
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000))
}

function periodoDaHora(hora: string): 'Manhã' | 'Tarde' {
  return parseInt(hora.slice(0, 2), 10) < 13 ? 'Manhã' : 'Tarde'
}

/** Avalia uma entrada da lista de espera face à vaga (consulta cancelada). */
export function avaliarSugestao(
  entrada: EntradaListaEspera,
  paciente: Paciente,
  vaga: Consulta,
  hojeISO: string,
): SugestaoEspera {
  const diasEmEspera = diasEntre(entrada.dataInscricao, hojeISO)
  const periodoVaga = periodoDaHora(vaga.hora)
  const compativel = entrada.tipoPretendido === vaga.tipo

  const motivos: string[] = []
  let pontuacao = 0

  if (compativel) {
    pontuacao += 50
    motivos.push(`Mesmo tratamento (${vaga.tipo})`)
  }
  if (entrada.prioridade === 'Urgente') {
    pontuacao += 40
    motivos.push('Prioridade urgente')
  } else if (entrada.prioridade === 'Preferencial') {
    pontuacao += 20
    motivos.push('Prioridade preferencial')
  }
  const periodoOk =
    entrada.periodoPreferido === 'Qualquer' ||
    entrada.periodoPreferido === periodoVaga
  if (periodoOk) {
    pontuacao += 15
    motivos.push(`Disponível de ${periodoVaga.toLowerCase()}`)
  }
  pontuacao += Math.min(diasEmEspera, 60) * 0.5
  motivos.push(`Em espera há ${diasEmEspera} dias`)

  return {
    entrada,
    paciente,
    diasEmEspera,
    compativel,
    pontuacao: Math.round(pontuacao),
    motivos,
  }
}

/** Ordena e devolve as melhores sugestões (maior pontuação primeiro). */
export function ordenarSugestoes(
  sugestoes: SugestaoEspera[],
  limite = 5,
): SugestaoEspera[] {
  return [...sugestoes]
    .sort((a, b) => b.pontuacao - a.pontuacao || b.diasEmEspera - a.diasEmEspera)
    .slice(0, limite)
}
