import type {
  Clinica,
  Consulta,
  ConsultaEnriquecida,
  EntradaListaEspera,
  Gabinete,
  Medico,
  Paciente,
  SugestaoEspera,
} from '../tipos'
import { calcularRisco } from '../logica/risco'
import { avaliarSugestao, ordenarSugestoes } from '../logica/espera'
import { hojeISO } from '../utils/formato'
import {
  CLINICAS,
  GABINETES,
  MEDICOS,
  PACIENTES,
  gerarConsultas,
  gerarListaEspera,
} from './seed'
import { supabase, TEM_SUPABASE } from './supabase'

// ---------------------------------------------------------------------------
// Camada de acesso a dados.
// Se houver Supabase configurado, le da base de dados; caso contrario usa os
// dados de demonstracao em memoria. Em ambos os casos o risco e calculado no
// cliente a partir do modelo em logica/risco.ts.
// ---------------------------------------------------------------------------

/** Indica a fonte de dados ativa, para mostrar na interface. */
export const FONTE_DADOS: 'supabase' | 'demonstracao' = TEM_SUPABASE
  ? 'supabase'
  : 'demonstracao'

export interface ResumoClinica {
  clinica: Clinica
  total: number
  porConfirmar: number
  altoRisco: number
  faltasPrevistas: number
}

// --- Conjunto de dados em memoria (demonstracao) ---------------------------

let consultasMemoria: Consulta[] | null = null
function consultasDemo(): Consulta[] {
  if (!consultasMemoria) consultasMemoria = gerarConsultas()
  return consultasMemoria
}

let listaEsperaMemoria: EntradaListaEspera[] | null = null
function listaEsperaDemo(): EntradaListaEspera[] {
  if (!listaEsperaMemoria) listaEsperaMemoria = gerarListaEspera()
  return listaEsperaMemoria
}

const mapaPacientes = new Map(PACIENTES.map((p) => [p.id, p]))
const mapaMedicos = new Map(MEDICOS.map((m) => [m.id, m]))
const mapaGabinetes = new Map(GABINETES.map((g) => [g.id, g]))

function enriquecer(
  c: Consulta,
  pacientes: Map<string, Paciente>,
  medicos: Map<string, Medico>,
  gabinetes: Map<string, Gabinete>,
): ConsultaEnriquecida | null {
  const paciente = pacientes.get(c.pacienteId)
  const medico = medicos.get(c.medicoId)
  const gabinete = gabinetes.get(c.gabineteId)
  if (!paciente || !medico || !gabinete) return null
  return {
    ...c,
    paciente,
    medico,
    gabinete,
    risco: calcularRisco(c, paciente, medico),
  }
}

function ordenarPorHora(a: ConsultaEnriquecida, b: ConsultaEnriquecida) {
  return a.hora.localeCompare(b.hora)
}

// --- Mapeamento de linhas Supabase (snake_case -> camelCase) ---------------

/* eslint-disable @typescript-eslint/no-explicit-any */
const linhaParaPaciente = (r: any): Paciente => ({
  id: r.id,
  nome: r.nome,
  sexo: r.sexo,
  idade: r.idade,
  seguro: r.seguro,
  canalPreferido: r.canal_preferido,
  distanciaKm: Number(r.distancia_km),
  consultasTotais: r.consultas_totais,
  faltas: r.faltas,
  cancelamentosTardios: r.cancelamentos_tardios,
  mesesDesdeUltimaVisita: r.meses_desde_ultima_visita,
  telefone: r.telefone,
})

const linhaParaConsulta = (r: any): Consulta => ({
  id: r.id,
  clinicaId: r.clinica_id,
  gabineteId: r.gabinete_id,
  medicoId: r.medico_id,
  pacienteId: r.paciente_id,
  data: r.data,
  hora: typeof r.hora === 'string' ? r.hora.slice(0, 5) : r.hora,
  duracaoMin: r.duracao_min,
  tipo: r.tipo,
  valorEuros: Number(r.valor_euros),
  estado: r.estado,
  dataMarcacao: r.data_marcacao,
  confirmada: r.confirmada,
  canalConfirmacao: r.canal_confirmacao,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

// --- API publica -----------------------------------------------------------

export async function obterClinicas(): Promise<Clinica[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('clinicas')
      .select('*')
      .order('cidade')
    if (error) throw error
    return data as Clinica[]
  }
  return CLINICAS
}

export async function obterGabinetes(clinicaId: string): Promise<Gabinete[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('gabinetes')
      .select('id, nome, clinica_id')
      .eq('clinica_id', clinicaId)
      .order('nome')
    if (error) throw error
    return (data ?? []).map((r: any) => ({
      id: r.id,
      nome: r.nome,
      clinicaId: r.clinica_id,
    }))
  }
  return GABINETES.filter((g) => g.clinicaId === clinicaId)
}

export async function obterConsultasDoDia(
  clinicaId: string,
  data: string,
): Promise<ConsultaEnriquecida[]> {
  if (supabase) {
    const { data: linhas, error } = await supabase
      .from('consultas')
      .select(
        '*, paciente:pacientes(*), medico:medicos(*), gabinete:gabinetes(*)',
      )
      .eq('clinica_id', clinicaId)
      .eq('data', data)
    if (error) throw error
    const lista = (linhas ?? [])
      .map((r: any): ConsultaEnriquecida | null => {
        if (!r.paciente || !r.medico || !r.gabinete) return null
        const consulta = linhaParaConsulta(r)
        const paciente = linhaParaPaciente(r.paciente)
        const medico = {
          id: r.medico.id,
          clinicaId: r.medico.clinica_id,
          nome: r.medico.nome,
          especialidade: r.medico.especialidade,
          taxaFaltaHistorica: Number(r.medico.taxa_falta_historica),
        }
        return {
          ...consulta,
          paciente,
          medico,
          gabinete: {
            id: r.gabinete.id,
            clinicaId: r.gabinete.clinica_id,
            nome: r.gabinete.nome,
          },
          risco: calcularRisco(consulta, paciente, medico),
        }
      })
      .filter((c): c is ConsultaEnriquecida => c !== null)
    return lista.sort(ordenarPorHora)
  }

  return consultasDemo()
    .filter((c) => c.clinicaId === clinicaId && c.data === data)
    .map((c) => enriquecer(c, mapaPacientes, mapaMedicos, mapaGabinetes))
    .filter((c): c is ConsultaEnriquecida => c !== null)
    .sort(ordenarPorHora)
}

/** Resumo do dia indicado, por clinica, para o ecra de selecao. */
export async function obterResumoClinicas(
  data: string,
): Promise<ResumoClinica[]> {
  const clinicas = await obterClinicas()
  const resumos = await Promise.all(
    clinicas.map(async (clinica) => {
      const consultas = await obterConsultasDoDia(clinica.id, data)
      const ativas = consultas.filter(
        (c) => c.estado !== 'Cancelada' && c.estado !== 'Faltou',
      )
      return {
        clinica,
        total: ativas.length,
        porConfirmar: ativas.filter((c) => !c.confirmada).length,
        altoRisco: ativas.filter((c) => c.risco.nivel === 'alto').length,
        faltasPrevistas: Math.round(
          ativas.reduce((s, c) => s + c.risco.pontuacao / 100, 0),
        ),
      }
    }),
  )
  return resumos
}

/**
 * Sugere pacientes da lista de espera da mesma clínica para preencher uma vaga
 * (consulta cancelada). Devolve os `limite` melhores, ordenados por prioridade.
 */
export async function obterSugestoesListaEspera(
  vaga: Consulta,
  limite = 5,
): Promise<SugestaoEspera[]> {
  const hoje = hojeISO()

  if (supabase) {
    const { data, error } = await supabase
      .from('lista_espera')
      .select('*, paciente:pacientes(*)')
      .eq('clinica_id', vaga.clinicaId)
    if (error) throw error
    const sugestoes = (data ?? [])
      .filter((r: any) => r.paciente)
      .map((r: any) => {
        const entrada: EntradaListaEspera = {
          id: r.id,
          pacienteId: r.paciente_id,
          clinicaId: r.clinica_id,
          tipoPretendido: r.tipo_pretendido,
          prioridade: r.prioridade,
          periodoPreferido: r.periodo_preferido,
          dataInscricao: r.data_inscricao,
        }
        return avaliarSugestao(entrada, linhaParaPaciente(r.paciente), vaga, hoje)
      })
    return ordenarSugestoes(sugestoes, limite)
  }

  const sugestoes = listaEsperaDemo()
    .filter((e) => e.clinicaId === vaga.clinicaId)
    .map((e) => {
      const paciente = mapaPacientes.get(e.pacienteId)
      return paciente ? avaliarSugestao(e, paciente, vaga, hoje) : null
    })
    .filter((s): s is SugestaoEspera => s !== null)
  return ordenarSugestoes(sugestoes, limite)
}
