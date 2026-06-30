import type {
  Consulta,
  FatorRisco,
  NivelRisco,
  Paciente,
  ResultadoRisco,
  TipoConsulta,
} from '../tipos'

// ---------------------------------------------------------------------------
// Modelo de risco de falta
// ---------------------------------------------------------------------------
// O risco é uma pontuação 0-100 composta por quatro grupos de variáveis, cada
// um com um orçamento máximo de pontos. A soma das contribuições dá a
// pontuação final. O modelo é propositadamente transparente: cada fator
// devolve uma contribuição e uma explicação para ser mostrada na interface.
//
//   Histórico de faltas .............. até 35 pts
//   Confirmação e antecedência ....... até 25 pts
//   Contexto da consulta ............. até 20 pts
//   Perfil do paciente ............... até 20 pts
// ---------------------------------------------------------------------------

const limitar = (valor: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, valor))

/** Propensão relativa de falta por tipo de consulta (0 = baixa, 1 = alta). */
const PROPENSAO_TIPO: Record<TipoConsulta, number> = {
  Urgência: 0.05,
  Implantologia: 0.15,
  'Cirurgia oral': 0.2,
  Endodontia: 0.35,
  Ortodontia: 0.55,
  'Primeira consulta': 0.7,
  'Consulta de rotina': 0.8,
  Destartarização: 0.85,
}

const NOMES_DIAS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
]

function diasEntre(dataInicio: string, dataFim: string): number {
  const a = new Date(dataInicio + 'T00:00:00')
  const b = new Date(dataFim + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * Calcula o risco de falta de uma marcação combinando histórico do paciente,
 * estado de confirmação, contexto da consulta e perfil do paciente.
 */
export function calcularRisco(
  consulta: Consulta,
  paciente: Paciente,
): ResultadoRisco {
  const fatores: FatorRisco[] = []

  // --- Grupo 1: Histórico de faltas (até 35 pts) -------------------------
  if (paciente.consultasTotais === 0) {
    fatores.push({
      etiqueta: 'Sem histórico',
      contribuicao: 14,
      descricao: 'Paciente novo, sem histórico de comparência conhecido.',
    })
  } else {
    const taxaFaltas = paciente.faltas / paciente.consultasTotais
    const ptFaltas = Math.round(25 * limitar(taxaFaltas / 0.4))
    if (ptFaltas > 0) {
      fatores.push({
        etiqueta: 'Histórico de faltas',
        contribuicao: ptFaltas,
        descricao: `${paciente.faltas} falta(s) em ${paciente.consultasTotais} consultas (${Math.round(
          taxaFaltas * 100,
        )}%).`,
      })
    }
    const ptCancel = Math.round(10 * limitar(paciente.cancelamentosTardios / 3))
    if (ptCancel > 0) {
      fatores.push({
        etiqueta: 'Cancelamentos tardios',
        contribuicao: ptCancel,
        descricao: `${paciente.cancelamentosTardios} cancelamento(s) em cima da hora.`,
      })
    }
  }

  // --- Grupo 2: Confirmação e antecedência (até 25 pts) ------------------
  if (!consulta.confirmada) {
    fatores.push({
      etiqueta: 'Por confirmar',
      contribuicao: 15,
      descricao: 'A marcação ainda não foi confirmada pelo paciente.',
    })
  }
  const antecedencia = Math.max(0, diasEntre(consulta.dataMarcacao, consulta.data))
  const ptAntecedencia = Math.round(10 * limitar(antecedencia / 45))
  if (ptAntecedencia > 0) {
    fatores.push({
      etiqueta: 'Marcação antecipada',
      contribuicao: ptAntecedencia,
      descricao: `Marcada com ${antecedencia} dias de antecedência — maior probabilidade de esquecimento.`,
    })
  }

  // --- Grupo 3: Contexto da consulta (até 20 pts) ------------------------
  const ptTipo = Math.round(8 * PROPENSAO_TIPO[consulta.tipo])
  if (ptTipo > 0) {
    fatores.push({
      etiqueta: `Tipo: ${consulta.tipo}`,
      contribuicao: ptTipo,
      descricao: 'Tipo de consulta com propensão de falta acima da média.',
    })
  }

  const horaNum = parseInt(consulta.hora.slice(0, 2), 10)
  if (horaNum < 9 || horaNum >= 18) {
    fatores.push({
      etiqueta: horaNum < 9 ? 'Horário muito cedo' : 'Horário ao fim do dia',
      contribuicao: 4,
      descricao: 'Horários de extremo do dia falham com mais frequência.',
    })
  }

  const diaSemana = new Date(consulta.data + 'T00:00:00').getDay()
  if (diaSemana === 1 || diaSemana === 5 || diaSemana === 6) {
    fatores.push({
      etiqueta: `Dia: ${NOMES_DIAS[diaSemana]}`,
      contribuicao: 4,
      descricao: 'Início/fim de semana com taxa de falta mais elevada.',
    })
  }

  if (consulta.tipo === 'Primeira consulta') {
    fatores.push({
      etiqueta: 'Primeira consulta',
      contribuicao: 4,
      descricao: 'Pacientes em primeira consulta faltam mais.',
    })
  }

  // --- Grupo 4: Perfil do paciente (até 20 pts) --------------------------
  if (paciente.idade < 30) {
    const ptIdade = Math.round(7 * limitar((30 - paciente.idade) / 18))
    if (ptIdade > 0) {
      fatores.push({
        etiqueta: 'Faixa etária jovem',
        contribuicao: ptIdade,
        descricao: `${paciente.idade} anos — faixa com maior taxa de falta.`,
      })
    }
  }

  const ptDistancia = Math.round(7 * limitar(paciente.distanciaKm / 25))
  if (ptDistancia > 0) {
    fatores.push({
      etiqueta: 'Distância à clínica',
      contribuicao: ptDistancia,
      descricao: `Reside a ${paciente.distanciaKm} km da clínica.`,
    })
  }

  if (paciente.mesesDesdeUltimaVisita === null) {
    fatores.push({
      etiqueta: 'Nunca compareceu',
      contribuicao: 6,
      descricao: 'Sem visita realizada anterior.',
    })
  } else {
    const ptInatividade = Math.round(
      6 * limitar(paciente.mesesDesdeUltimaVisita / 24),
    )
    if (ptInatividade > 0) {
      fatores.push({
        etiqueta: 'Inatividade prolongada',
        contribuicao: ptInatividade,
        descricao: `Última visita há ${paciente.mesesDesdeUltimaVisita} meses.`,
      })
    }
  }

  // --- Pontuação final ----------------------------------------------------
  const pontuacao = limitar(
    fatores.reduce((soma, f) => soma + f.contribuicao, 0),
    0,
    100,
  )
  fatores.sort((a, b) => b.contribuicao - a.contribuicao)

  return {
    pontuacao: Math.round(pontuacao),
    nivel: classificarNivel(pontuacao),
    fatores,
  }
}

export function classificarNivel(pontuacao: number): NivelRisco {
  if (pontuacao >= 67) return 'alto'
  if (pontuacao >= 34) return 'medio'
  return 'baixo'
}

export const ETIQUETA_NIVEL: Record<NivelRisco, string> = {
  baixo: 'Risco baixo',
  medio: 'Risco médio',
  alto: 'Risco alto',
}
