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

// Clínicas Dentárias Santa Madalena. A morada guarda apenas a informação
// relevante para uso interno; `gabinetes` define o nº de gabinetes de cada local.
interface DefClinica extends Clinica {
  gabinetes: number
}

const DEF_CLINICAS: DefClinica[] = [
  { id: 'cl-alverca', nome: 'Santa Madalena — Alverca Park', cidade: 'Alverca', morada: 'E.N. 10, Alverca Park, 2619-501 Alverca', gabinetes: 20 },
  { id: 'cl-aveiro', nome: 'Santa Madalena — Aveiro', cidade: 'Aveiro', morada: 'Pingo Doce Esgueira, E.N. 109, Loja 2, 3800-042 Aveiro', gabinetes: 5 },
  { id: 'cl-bplanet', nome: 'Santa Madalena — BPlanet', cidade: 'Coina', morada: 'Barreiro Retail Planet, Loja F, E.N. 10 km 18,5, 2830-411 Coina', gabinetes: 16 },
  { id: 'cl-braga', nome: 'Santa Madalena — Braga Parque', cidade: 'Braga', morada: 'Braga Parque, Loja 1055, 4710-427 Braga', gabinetes: 8 },
  { id: 'cl-cascais', nome: 'Santa Madalena — Cascais', cidade: 'Cascais', morada: 'Rua dos Tremoceiros 356, 2750-492 Cascais', gabinetes: 20 },
  { id: 'cl-coimbra', nome: 'Santa Madalena — Coimbra (Fórum)', cidade: 'Coimbra', morada: 'Fórum Coimbra, Loja 048, 3040-389 Coimbra', gabinetes: 8 },
  { id: 'cl-evora', nome: 'Santa Madalena — Évora Plaza', cidade: 'Évora', morada: 'Évora Plaza, Loja 1.04, 7005-345 Évora', gabinetes: 9 },
  { id: 'cl-leiria', nome: 'Santa Madalena — Leiria', cidade: 'Leiria', morada: 'Lis Shopping, Rua Dr. João Soares, 2400-082 Leiria', gabinetes: 9 },
  { id: 'cl-lisboa-alvalade', nome: 'Santa Madalena — Lisboa Alvalade', cidade: 'Lisboa', morada: 'C.C. Alvalade, Loja 28, Praça Alvalade 6B, 1700-036 Lisboa', gabinetes: 11 },
  { id: 'cl-lisboa-campo-pequeno', nome: 'Santa Madalena — Lisboa Campo Pequeno', cidade: 'Lisboa', morada: 'C.C. Campo Pequeno, Loja 144, 1000-082 Lisboa', gabinetes: 11 },
  { id: 'cl-lisboa-colombo', nome: 'Santa Madalena — Lisboa Colombo', cidade: 'Lisboa', morada: 'C.C. Colombo, Piso 0, Loja 0.515, 1500-392 Lisboa', gabinetes: 7 },
  { id: 'cl-lisboa-conde-redondo', nome: 'Santa Madalena — Lisboa Conde Redondo', cidade: 'Lisboa', morada: 'Rua Conde de Redondo 1, 1150-101 Lisboa', gabinetes: 18 },
  { id: 'cl-lisboa-nacoes', nome: 'Santa Madalena — Lisboa Parque das Nações', cidade: 'Lisboa', morada: 'Alameda dos Oceanos, Ed. Smart, Loja D/E/F, 1990-265 Lisboa', gabinetes: 17 },
  { id: 'cl-loures', nome: 'Santa Madalena — Loures Shopping', cidade: 'Loures', morada: 'LoureShopping, Loja 0.010, Av. das Descobertas 90, 2670-457 Loures', gabinetes: 6 },
  { id: 'cl-miraflores', nome: 'Santa Madalena — Miraflores', cidade: 'Algés', morada: 'C.C. New Life, Av. das Túlipas 6, Loja 2.01, 1495-161 Algés', gabinetes: 16 },
  { id: 'cl-montijo', nome: 'Santa Madalena — Montijo (Fórum)', cidade: 'Montijo', morada: 'Fórum Montijo, Loja 1.30 A, Piso 1, 2870-100 Montijo', gabinetes: 16 },
  { id: 'cl-odivelas', nome: 'Santa Madalena — Odivelas (Strada Outlet)', cidade: 'Odivelas', morada: 'Strada Outlet, Loja 2108, Estrada de Paiã, 2675-626 Odivelas', gabinetes: 8 },
  { id: 'cl-porto', nome: 'Santa Madalena — Porto', cidade: 'Porto', morada: 'Av. da Boavista 4049, 4100-140 Porto', gabinetes: 20 },
  { id: 'cl-feira', nome: 'Santa Madalena — Santa Maria da Feira', cidade: 'Santa Maria da Feira', morada: 'Pingo Doce, Rua Dr. Crispim B. de Castro, 4520-283 Sta. M. da Feira', gabinetes: 5 },
  { id: 'cl-santarem', nome: 'Santa Madalena — Santarém', cidade: 'Santarém', morada: 'Santarém Retail Park, Loja K, 2000-471 Santarém', gabinetes: 9 },
  { id: 'cl-setubal', nome: 'Santa Madalena — Setúbal', cidade: 'Setúbal', morada: 'Av. Mestre Lima de Freitas 28, 2910-866 Setúbal', gabinetes: 12 },
  { id: 'cl-sintra', nome: 'Santa Madalena — Sintra Retail Park', cidade: 'Rio de Mouro', morada: 'Sintra Retail Park, Loja 18, IC19, 2639-005 Rio de Mouro', gabinetes: 18 },
  { id: 'cl-taguspark', nome: 'Santa Madalena — TagusPark', cidade: 'Porto Salvo', morada: 'TagusPark, Núcleo Central 185, 2740-257 Porto Salvo', gabinetes: 19 },
]

export const CLINICAS: Clinica[] = DEF_CLINICAS.map((c) => ({
  id: c.id,
  nome: c.nome,
  cidade: c.cidade,
  morada: c.morada,
}))

const GABINETES_POR_CLINICA: Record<string, number> = Object.fromEntries(
  DEF_CLINICAS.map((c) => [c.id, c.gabinetes]),
)

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
          medicoId: gab.id.replace(/-g(\d+)$/, '-m$1'),
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
