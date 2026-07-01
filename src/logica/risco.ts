import type {
  Consulta,
  FatorRisco,
  Medico,
  NivelRisco,
  Paciente,
  ResultadoRisco,
  TipoConsulta,
} from '../tipos'

// ---------------------------------------------------------------------------
// Modelo de risco de falta
// ---------------------------------------------------------------------------
// Modelo heurístico e transparente (a substituir, no futuro, por um modelo
// preditivo treinado com dados reais). Cada fator devolve uma contribuição em
// pontos e uma explicação, para ser mostrada na interface. A pontuação final é
// a soma das contribuições, limitada a 0-100.
//
// Variáveis consideradas (alinhadas com o futuro modelo preditivo):
//   histórico de faltas, antecedência e confirmação, tipo de tratamento,
//   valor da consulta, hora, dia da semana, época do ano, idade, sexo,
//   distância, inatividade, seguro, meio de comunicação preferencial e
//   taxa de falta histórica do médico/agenda.
//
// NOTA: os pesos são ilustrativos e devem ser calibrados com dados reais.
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

const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function diasEntre(dataInicio: string, dataFim: string): number {
  const a = new Date(dataInicio + 'T00:00:00')
  const b = new Date(dataFim + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * Calcula o risco de falta de uma marcação combinando o histórico do paciente,
 * o estado de confirmação, o contexto da consulta, o perfil do paciente e a
 * agenda do médico responsável.
 */
export function calcularRisco(
  consulta: Consulta,
  paciente: Paciente,
  medico?: Medico,
): ResultadoRisco {
  const fatores: FatorRisco[] = []

  // --- Histórico de faltas -----------------------------------------------
  if (paciente.consultasTotais === 0) {
    fatores.push({
      etiqueta: 'Sem histórico',
      contribuicao: 12,
      descricao: 'Paciente novo, sem histórico de comparência conhecido.',
    })
  } else {
    const taxaFaltas = paciente.faltas / paciente.consultasTotais
    const ptFaltas = Math.round(22 * limitar(taxaFaltas / 0.4))
    if (ptFaltas > 0) {
      fatores.push({
        etiqueta: 'Histórico de faltas',
        contribuicao: ptFaltas,
        descricao: `${paciente.faltas} falta(s) em ${paciente.consultasTotais} consultas (${Math.round(
          taxaFaltas * 100,
        )}%).`,
      })
    }
    const ptCancel = Math.round(8 * limitar(paciente.cancelamentosTardios / 3))
    if (ptCancel > 0) {
      fatores.push({
        etiqueta: 'Cancelamentos tardios',
        contribuicao: ptCancel,
        descricao: `${paciente.cancelamentosTardios} cancelamento(s) em cima da hora.`,
      })
    }
  }

  // --- Confirmação e antecedência ----------------------------------------
  if (!consulta.confirmada) {
    fatores.push({
      etiqueta: 'Por confirmar',
      contribuicao: 12,
      descricao: 'A marcação ainda não foi confirmada pelo paciente.',
    })
  }
  const antecedencia = Math.max(0, diasEntre(consulta.dataMarcacao, consulta.data))
  const ptAntecedencia = Math.round(8 * limitar(antecedencia / 45))
  if (ptAntecedencia > 0) {
    fatores.push({
      etiqueta: 'Marcação antecipada',
      contribuicao: ptAntecedencia,
      descricao: `Marcada com ${antecedencia} dias de antecedência — maior probabilidade de esquecimento.`,
    })
  }

  // --- Contexto da consulta ----------------------------------------------
  const ptTipo = Math.round(7 * PROPENSAO_TIPO[consulta.tipo])
  if (ptTipo > 0) {
    fatores.push({
      etiqueta: `Tratamento: ${consulta.tipo}`,
      contribuicao: ptTipo,
      descricao: 'Tipo de tratamento com propensão de falta acima da média.',
    })
  }

  if (consulta.valorEuros < 50) {
    fatores.push({
      etiqueta: 'Consulta de baixo valor',
      contribuicao: 3,
      descricao: `Valor da consulta (${consulta.valorEuros} €) — menor peso para o paciente.`,
    })
  }

  const horaNum = parseInt(consulta.hora.slice(0, 2), 10)
  if (horaNum < 9 || horaNum >= 18) {
    fatores.push({
      etiqueta: horaNum < 9 ? 'Horário muito cedo' : 'Horário ao fim do dia',
      contribuicao: 3,
      descricao: 'Horários de extremo do dia falham com mais frequência.',
    })
  }

  const dataConsulta = new Date(consulta.data + 'T00:00:00')
  const diaSemana = dataConsulta.getDay()
  if (diaSemana === 1 || diaSemana === 5 || diaSemana === 6) {
    fatores.push({
      etiqueta: `Dia: ${NOMES_DIAS[diaSemana]}`,
      contribuicao: 3,
      descricao: 'Início/fim de semana com taxa de falta mais elevada.',
    })
  }

  const mes = dataConsulta.getMonth()
  if (mes === 6 || mes === 7 || mes === 11) {
    fatores.push({
      etiqueta: 'Época de férias',
      contribuicao: 4,
      descricao: `${NOMES_MESES[mes]} — período de férias/festas com mais faltas.`,
    })
  }

  if (consulta.tipo === 'Primeira consulta') {
    fatores.push({
      etiqueta: 'Primeira consulta',
      contribuicao: 3,
      descricao: 'Pacientes em primeira consulta faltam mais.',
    })
  }

  // --- Agenda do médico responsável --------------------------------------
  if (medico) {
    const ptMedico = Math.round(5 * limitar(medico.taxaFaltaHistorica / 0.25))
    if (ptMedico > 0) {
      fatores.push({
        etiqueta: 'Agenda do médico',
        contribuicao: ptMedico,
        descricao: `${medico.nome}: ${Math.round(
          medico.taxaFaltaHistorica * 100,
        )}% de faltas históricas na agenda.`,
      })
    }
  }

  // --- Perfil do paciente -------------------------------------------------
  if (paciente.idade < 30) {
    const ptIdade = Math.round(6 * limitar((30 - paciente.idade) / 18))
    if (ptIdade > 0) {
      fatores.push({
        etiqueta: 'Faixa etária jovem',
        contribuicao: ptIdade,
        descricao: `${paciente.idade} anos — faixa com maior taxa de falta.`,
      })
    }
  }

  if (paciente.sexo === 'Masculino') {
    fatores.push({
      etiqueta: 'Sexo masculino',
      contribuicao: 3,
      descricao: 'Fator demográfico ilustrativo, a calibrar com dados reais.',
    })
  }

  const ptDistancia = Math.round(6 * limitar(paciente.distanciaKm / 25))
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
      contribuicao: 5,
      descricao: 'Sem visita realizada anterior.',
    })
  } else {
    const ptInatividade = Math.round(
      5 * limitar(paciente.mesesDesdeUltimaVisita / 24),
    )
    if (ptInatividade > 0) {
      fatores.push({
        etiqueta: 'Inatividade prolongada',
        contribuicao: ptInatividade,
        descricao: `Última visita há ${paciente.mesesDesdeUltimaVisita} meses.`,
      })
    }
  }

  if (paciente.seguro !== 'Particular') {
    fatores.push({
      etiqueta: 'Consulta comparticipada',
      contribuicao: 2,
      descricao: `Seguro/plano: ${paciente.seguro} — menor compromisso financeiro.`,
    })
  }

  if (paciente.canalPreferido === 'Nenhum') {
    fatores.push({
      etiqueta: 'Sem canal de contacto',
      contribuicao: 3,
      descricao: 'Não recebe lembretes automáticos.',
    })
  } else if (paciente.canalPreferido === 'Telefone') {
    fatores.push({
      etiqueta: 'Contacto só por telefone',
      contribuicao: 1,
      descricao: 'Sem lembretes digitais automáticos.',
    })
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
