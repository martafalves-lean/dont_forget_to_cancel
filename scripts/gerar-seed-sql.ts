// Gera o ficheiro supabase/seed.sql a partir dos mesmos dados de demonstracao
// usados pela aplicacao. Execucao: `npm run gerar-seed`.
//
// As datas das consultas sao geradas relativamente a hoje, pelo que convem
// regenerar o seed antes de carregar a base de dados.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CLINICAS,
  GABINETES,
  MEDICOS,
  PACIENTES,
  gerarConsultas,
} from '../src/dados/seed'

const aspas = (v: string) => `'${v.replace(/'/g, "''")}'`
const nulo = (v: number | null) => (v === null ? 'null' : String(v))
const bool = (v: boolean) => (v ? 'true' : 'false')

const linhas: string[] = []
linhas.push('-- Dados de demonstracao gerados automaticamente. Nao editar a mao.')
linhas.push('begin;')
linhas.push(
  'truncate consultas, pacientes, medicos, gabinetes, clinicas restart identity cascade;',
)

linhas.push('\n-- clinicas')
for (const c of CLINICAS) {
  linhas.push(
    `insert into clinicas (id, nome, cidade, morada) values (${aspas(c.id)}, ${aspas(c.nome)}, ${aspas(c.cidade)}, ${aspas(c.morada)});`,
  )
}

linhas.push('\n-- gabinetes')
for (const g of GABINETES) {
  linhas.push(
    `insert into gabinetes (id, clinica_id, nome) values (${aspas(g.id)}, ${aspas(g.clinicaId)}, ${aspas(g.nome)});`,
  )
}

linhas.push('\n-- medicos')
for (const m of MEDICOS) {
  linhas.push(
    `insert into medicos (id, clinica_id, nome, especialidade) values (${aspas(m.id)}, ${aspas(m.clinicaId)}, ${aspas(m.nome)}, ${aspas(m.especialidade)});`,
  )
}

linhas.push('\n-- pacientes')
for (const p of PACIENTES) {
  linhas.push(
    `insert into pacientes (id, nome, idade, distancia_km, consultas_totais, faltas, cancelamentos_tardios, meses_desde_ultima_visita, telefone) values (${aspas(p.id)}, ${aspas(p.nome)}, ${p.idade}, ${p.distanciaKm}, ${p.consultasTotais}, ${p.faltas}, ${p.cancelamentosTardios}, ${nulo(p.mesesDesdeUltimaVisita)}, ${aspas(p.telefone)});`,
  )
}

linhas.push('\n-- consultas')
for (const c of gerarConsultas()) {
  linhas.push(
    `insert into consultas (id, clinica_id, gabinete_id, medico_id, paciente_id, data, hora, duracao_min, tipo, estado, data_marcacao, confirmada, canal_confirmacao) values (${aspas(c.id)}, ${aspas(c.clinicaId)}, ${aspas(c.gabineteId)}, ${aspas(c.medicoId)}, ${aspas(c.pacienteId)}, ${aspas(c.data)}, ${aspas(c.hora)}, ${c.duracaoMin}, ${aspas(c.tipo)}, ${aspas(c.estado)}, ${aspas(c.dataMarcacao)}, ${bool(c.confirmada)}, ${c.canalConfirmacao ? aspas(c.canalConfirmacao) : 'null'});`,
  )
}

linhas.push('commit;')

const aqui = dirname(fileURLToPath(import.meta.url))
const destino = resolve(aqui, '../supabase/seed.sql')
mkdirSync(dirname(destino), { recursive: true })
writeFileSync(destino, linhas.join('\n') + '\n', 'utf8')

console.log(`Seed gerado em ${destino} (${gerarConsultas().length} consultas).`)
