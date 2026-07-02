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

export type Sexo = 'Feminino' | 'Masculino'

/** Meio de comunicação preferencial do paciente. */
export type CanalComunicacao = 'SMS' | 'Email' | 'App' | 'Telefone' | 'Nenhum'

/** Seguro/plano de saúde. "Particular" = sem seguro (paga a totalidade). */
export type Seguro =
  | 'Particular'
  | 'Médis'
  | 'Multicare'
  | 'AdvanceCare'
  | 'SNS'

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
  /** Taxa histórica de falta nas consultas deste médico/agenda (0-1). */
  taxaFaltaHistorica: number
}

export interface Paciente {
  id: string
  nome: string
  sexo: Sexo
  idade: number
  /** Seguro/plano de saúde (ou "Particular"). */
  seguro: Seguro
  /** Meio de comunicação preferencial. */
  canalPreferido: CanalComunicacao
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
  /** Valor da consulta em euros. */
  valorEuros: number
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

// --- Lista de espera / preenchimento de vagas ------------------------------

export type Prioridade = 'Normal' | 'Preferencial' | 'Urgente'

export type PeriodoPreferido = 'Manhã' | 'Tarde' | 'Qualquer'

/** Paciente à espera de vaga numa clínica. */
export interface EntradaListaEspera {
  id: string
  pacienteId: string
  clinicaId: string
  /** Tratamento que o paciente aguarda. */
  tipoPretendido: TipoConsulta
  prioridade: Prioridade
  periodoPreferido: PeriodoPreferido
  /** Data de inscrição na lista de espera (AAAA-MM-DD). */
  dataInscricao: string
}

/** Sugestão de paciente da lista de espera para preencher uma vaga. */
export interface SugestaoEspera {
  entrada: EntradaListaEspera
  paciente: Paciente
  diasEmEspera: number
  /** True se o tratamento pretendido corresponde ao da vaga. */
  compativel: boolean
  pontuacao: number
  motivos: string[]
}
