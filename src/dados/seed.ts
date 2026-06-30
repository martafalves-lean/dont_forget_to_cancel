import type {
  CanalConfirmacao,
  Clinica,
  Consulta,
  EstadoConsulta,
  Gabinete,
  Medico,
  Paciente,
  TipoConsulta,
} from '../tipos'

// ---------------------------------------------------------------------------
// Gerador de dados de demonstracao deterministico.
// Os pacientes e marcacoes sao gerados com um PRNG semeado para que os dados
// sejam reproduziveis. As datas das consultas sao relativas ao dia atual para
// que a demonstracao mostre sempre marcacoes "de hoje".
// ---------------------------------------------------------------------------

function mulberry32(semente: number) {
  let a = semente >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const escolher = <T>(r: () => number, lista: readonly T[]): T =>
  lista[Math.floor(r() * lista.length)]

const inteiro = (r: () => number, min: number, max: number) =>
  Math.floor(r() * (max - min + 1)) + min

function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function adicionarDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

// --- Dimensoes fixas -------------------------------------------------------

export const CLINICAS: Clinica[] = [
  { id: 'cl-lisboa', nome: 'Os Vossos Dentes — Saldanha', cidade: 'Lisboa', morada: 'Av. da República 45, 1050-187 Lisboa' },
  { id: 'cl-porto', nome: 'Os Vossos Dentes — Boavista', cidade: 'Porto', morada: 'Av. da Boavista 1203, 4100-130 Porto' },
  { id: 'cl-coimbra', nome: 'Os Vossos Dentes — Centro', cidade: 'Coimbra', morada: 'Rua Ferreira Borges 88, 3000-180 Coimbra' },
  { id: 'cl-faro', nome: 'Os Vossos Dentes — Marina', cidade: 'Faro', morada: 'Rua de Santo António 12, 8000-283 Faro' },
]

const GABINETES_POR_CLINICA: Record<string, number> = {
  'cl-lisboa': 4,
  'cl-porto': 3,
  'cl-coimbra': 3,
  'cl-faro': 2,
}

export const GABINETES: Gabinete[] = CLINICAS.flatMap((c) =>
  Array.from({ length: GABINETES_POR_CLINICA[c.id] }, (_, i) => ({
    id: `${c.id}-g${i + 1}`,
    clinicaId: c.id,
    nome: `Gabinete ${i + 1}`,
  })),
)

const ESPECIALIDADES = [
  'Medicina dentária geral',
  'Ortodontia',
  'Endodontia',
  'Implantologia',
  'Cirurgia oral',
  'Odontopediatria',
]

const NOMES_MEDICOS = [
  'Dra. Ana Sousa', 'Dr. João Marques', 'Dra. Rita Carvalho', 'Dr. Pedro Antunes',
  'Dra. Sofia Lopes', 'Dr. Miguel Ferreira', 'Dra. Inês Rocha', 'Dr. Tiago Nunes',
  'Dra. Carla Mendes', 'Dr. Bruno Pinto', 'Dra. Helena Dias', 'Dr. André Costa',
  'Dra. Marta Ribeiro', 'Dr. Nuno Faria',
]

export const MEDICOS: Medico[] = (() => {
  const r = mulberry32(101)
  const lista: Medico[] = []
  let nomeIdx = 0
  for (const c of CLINICAS) {
    const n = GABINETES_POR_CLINICA[c.id]
    for (let i = 0; i < n; i++) {
      lista.push({
        id: `${c.id}-m${i + 1}`,
        clinicaId: c.id,
        nome: NOMES_MEDICOS[nomeIdx % NOMES_MEDICOS.length],
        especialidade: escolher(r, ESPECIALIDADES),
      })
      nomeIdx++
    }
  }
  return lista
})()

// --- Pacientes -------------------------------------------------------------

const PRIMEIROS_NOMES = [
  'Maria', 'João', 'Ana', 'Manuel', 'Francisco', 'Beatriz', 'Carlos', 'Inês',
  'Rui', 'Sofia', 'Pedro', 'Catarina', 'António', 'Mariana', 'José', 'Leonor',
  'Tiago', 'Matilde', 'Diogo', 'Margarida', 'Gonçalo', 'Carolina', 'André',
  'Rita', 'Luís', 'Joana', 'Vasco', 'Teresa', 'Fernando', 'Helena',
]

const APELIDOS = [
  'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues',
  'Martins', 'Jesus', 'Sousa', 'Fernandes', 'Goncalves', 'Gomes', 'Lopes',
  'Marques', 'Alves', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho', 'Teixeira',
  'Moreira', 'Correia', 'Mendes', 'Nunes', 'Soares', 'Vieira', 'Monteiro',
  'Gonçalves',
]

const TOTAL_PACIENTES = 90

export const PACIENTES: Paciente[] = (() => {
  const r = mulberry32(2027)
  return Array.from({ length: TOTAL_PACIENTES }, (_, i) => {
    const consultasTotais = inteiro(r, 0, 18)
    // Perfis de comparencia variados: a maioria fiavel, alguns problematicos.
    const propensao = r()
    const faltas =
      consultasTotais === 0
        ? 0
        : Math.min(
            consultasTotais,
            Math.round(consultasTotais * propensao * propensao * 0.6),
          )
    return {
      id: `pac-${String(i + 1).padStart(3, '0')}`,
      nome: `${escolher(r, PRIMEIROS_NOMES)} ${escolher(r, APELIDOS)}`,
      idade: inteiro(r, 7, 84),
      distanciaKm: Math.round((1 + r() * 39) * 10) / 10,
      consultasTotais,
      faltas,
      cancelamentosTardios: Math.min(
        consultasTotais,
        Math.round(propensao * inteiro(r, 0, 4)),
      ),
      mesesDesdeUltimaVisita:
        consultasTotais === 0 ? null : inteiro(r, 0, 30),
      telefone: `9${inteiro(r, 1, 6)}${String(inteiro(r, 0, 9999999)).padStart(7, '0')}`,
    }
  })
})()

// --- Consultas (relativas a hoje) ------------------------------------------

const TIPOS: TipoConsulta[] = [
  'Primeira consulta', 'Consulta de rotina', 'Destartarização', 'Endodontia',
  'Implantologia', 'Ortodontia', 'Cirurgia oral', 'Urgência',
]

const HORAS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30',
]

const CANAIS: CanalConfirmacao[] = ['SMS', 'Email', 'Telefone']

/**
 * Gera as marcacoes para uma janela de dias a volta do dia de referencia.
 * Por defeito: de 3 dias atras ate 12 dias a frente.
 */
export function gerarConsultas(
  hoje: Date = new Date(),
  diasAntes = 3,
  diasDepois = 12,
): Consulta[] {
  const r = mulberry32(9090)
  const consultas: Consulta[] = []
  let n = 0

  for (let offset = -diasAntes; offset <= diasDepois; offset++) {
    const dia = adicionarDias(hoje, offset)
    const diaSemana = dia.getDay()
    if (diaSemana === 0) continue // domingo fechado

    for (const gab of GABINETES) {
      // Cada gabinete preenche uma parte das horas disponiveis.
      for (const hora of HORAS) {
        if (diaSemana === 6 && parseInt(hora, 10) >= 14) continue // sabado so de manha
        if (r() > 0.62) continue // nem todas as horas estao ocupadas

        const paciente = escolher(r, PACIENTES)
        const tipo = escolher(r, TIPOS)
        const antecedencia = inteiro(r, 0, 60)
        const dataMarcacao = dataISO(adicionarDias(dia, -antecedencia))

        let estado: EstadoConsulta
        let confirmada: boolean
        let canal: CanalConfirmacao

        if (offset < 0) {
          // Passado: ja teve desfecho.
          const desfecho = r()
          if (desfecho < 0.12) estado = 'Faltou'
          else if (desfecho < 0.2) estado = 'Cancelada'
          else estado = 'Realizada'
          confirmada = estado !== 'Faltou'
          canal = confirmada ? escolher(r, CANAIS) : null
        } else {
          // Futuro / hoje.
          const e = r()
          if (e < 0.06) estado = 'Cancelada'
          else if (e < 0.55) estado = 'Confirmada'
          else estado = 'Agendada'
          confirmada = estado === 'Confirmada'
          canal = confirmada ? escolher(r, CANAIS) : null
        }

        n++
        consultas.push({
          id: `con-${String(n).padStart(5, '0')}`,
          clinicaId: gab.clinicaId,
          gabineteId: gab.id,
          medicoId: gab.id.replace('-g', '-m'),
          pacienteId: paciente.id,
          data: dataISO(dia),
          hora,
          duracaoMin: escolher(r, [30, 30, 45, 60, 60, 90]),
          tipo,
          estado,
          dataMarcacao,
          confirmada,
          canalConfirmacao: canal,
        })
      }
    }
  }
  return consultas
}
