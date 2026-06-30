// Modelo de dominio da aplicacao (PT-PT).

export type TipoConsulta =
  | 'Primeira consulta'
  | 'Consulta de rotina'
  | 'Destartarização'
  | 'Endodontia'
  | 'Implantologia'
  | 'Ortodontia'
  | 'Cirurgia oral'
  | 'Urgência'

export type EstadoConsulta =
  | 'Agendada'
  | 'Confirmada'
  | 'Realizada'
  | 'Faltou'
  | 'Cancelada'

export type CanalConfirmacao = 'SMS' | 'Email' | 'Telefone' | null

export interface Clinica {
  id: string
  nome: string
  cidade: string
  morada: string
}

export interface Gabinete {
  id: string
  clinicaId: string
  nome: string
}

export interface Medico {
  id: string
  clinicaId: string
  nome: string
  especialidade: string
}

export interface Paciente {
  id: string
  nome: string
  idade: number
  /** Distancia da residencia a clinica, em km. */
  distanciaKm: number
  /** Numero total de consultas historicas marcadas. */
  consultasTotais: number
  /** Numero de faltas (nao compareceu sem avisar). */
  faltas: number
  /** Numero de cancelamentos em cima da hora (<24h). */
  cancelamentosTardios: number
  /** Meses desde a ultima visita realizada (null = nunca veio). */
  mesesDesdeUltimaVisita: number | null
  telefone: string
}

export interface Consulta {
  id: string
  clinicaId: string
  gabineteId: string
  medicoId: string
  pacienteId: string
  /** Data da consulta no formato AAAA-MM-DD. */
  data: string
  /** Hora de inicio no formato HH:MM. */
  hora: string
  duracaoMin: number
  tipo: TipoConsulta
  estado: EstadoConsulta
  /** Data em que a marcacao foi efetuada (AAAA-MM-DD). */
  dataMarcacao: string
  confirmada: boolean
  canalConfirmacao: CanalConfirmacao
}

export type NivelRisco = 'baixo' | 'medio' | 'alto'

export interface FatorRisco {
  etiqueta: string
  /** Pontos que este fator acrescenta ao risco (0-100). */
  contribuicao: number
  descricao: string
}

export interface ResultadoRisco {
  pontuacao: number
  nivel: NivelRisco
  fatores: FatorRisco[]
}

/** Consulta enriquecida com as entidades relacionadas e o risco calculado. */
export interface ConsultaEnriquecida extends Consulta {
  paciente: Paciente
  medico: Medico
  gabinete: Gabinete
  risco: ResultadoRisco
}
