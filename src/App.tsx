import { useEffect, useMemo, useState } from 'react'
import type {
  Clinica,
  ConsultaEnriquecida,
  Gabinete,
  NivelRisco,
  SugestaoEspera,
} from './tipos'
import {
  FONTE_DADOS,
  obterClinicas,
  obterConsultasDoDia,
  obterGabinetes,
  obterResumoClinicas,
  obterSugestoesListaEspera,
  type ResumoClinica,
} from './dados/repositorio'
import { hojeISO } from './utils/formato'
import { SeletorClinica } from './componentes/SeletorClinica'
import { SeletorData } from './componentes/SeletorData'
import { BarraResumo } from './componentes/BarraResumo'
import { VistaGabinetes } from './componentes/VistaGabinetes'
import { PainelPaciente } from './componentes/PainelPaciente'

type FiltroRisco = 'todos' | NivelRisco

export function App() {
  const [data, setData] = useState<string>(hojeISO())
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [clinicas, setClinicas] = useState<Clinica[]>([])

  const [resumos, setResumos] = useState<ResumoClinica[]>([])
  const [gabinetes, setGabinetes] = useState<Gabinete[]>([])
  const [consultas, setConsultas] = useState<ConsultaEnriquecida[]>([])

  const [consultaSelId, setConsultaSelId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Sugestoes da lista de espera para preencher uma vaga (consulta cancelada).
  const [sugestoes, setSugestoes] = useState<SugestaoEspera[]>([])
  const [aCarregarSugestoes, setACarregarSugestoes] = useState(false)

  // Filtros da vista de agenda
  const [filtroGabinete, setFiltroGabinete] = useState<string>('todos')
  const [filtroRisco, setFiltroRisco] = useState<FiltroRisco>('todos')
  const [pesquisa, setPesquisa] = useState('')
  const [soPorConfirmar, setSoPorConfirmar] = useState(false)
  const [soVagas, setSoVagas] = useState(false)

  useEffect(() => {
    obterClinicas().then(setClinicas).catch(() => {})
  }, [])

  // Ecra de selecao: carrega o resumo de todas as clinicas para o dia.
  useEffect(() => {
    if (clinicaId) return
    let ativo = true
    setCarregando(true)
    setErro(null)
    obterResumoClinicas(data)
      .then((r) => ativo && setResumos(r))
      .catch((e) => ativo && setErro(mensagemErro(e)))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [clinicaId, data])

  // Vista de agenda: carrega gabinetes + consultas da clinica/dia.
  useEffect(() => {
    if (!clinicaId) return
    let ativo = true
    setCarregando(true)
    setErro(null)
    Promise.all([
      obterGabinetes(clinicaId),
      obterConsultasDoDia(clinicaId, data),
    ])
      .then(([g, c]) => {
        if (!ativo) return
        setGabinetes(g)
        setConsultas(c)
      })
      .catch((e) => ativo && setErro(mensagemErro(e)))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [clinicaId, data])

  const consultaSelecionada =
    consultas.find((c) => c.id === consultaSelId) ?? null

  // Ao selecionar uma vaga (consulta cancelada), procura sugestoes de espera.
  useEffect(() => {
    if (!consultaSelecionada || consultaSelecionada.estado !== 'Cancelada') {
      setSugestoes([])
      return
    }
    let ativo = true
    setACarregarSugestoes(true)
    obterSugestoesListaEspera(consultaSelecionada)
      .then((s) => ativo && setSugestoes(s))
      .catch(() => ativo && setSugestoes([]))
      .finally(() => ativo && setACarregarSugestoes(false))
    return () => {
      ativo = false
    }
  }, [consultaSelecionada])

  const clinicaAtual = clinicas.find((c) => c.id === clinicaId) ?? null

  const numVagas = useMemo(
    () => consultas.filter((c) => c.estado === 'Cancelada').length,
    [consultas],
  )

  const consultasFiltradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()
    return consultas.filter((c) => {
      if (filtroGabinete !== 'todos' && c.gabineteId !== filtroGabinete)
        return false
      if (soVagas && c.estado !== 'Cancelada') return false
      if (filtroRisco !== 'todos' && c.risco.nivel !== filtroRisco) return false
      if (soPorConfirmar && (c.confirmada || c.estado === 'Cancelada'))
        return false
      if (termo && !c.paciente.nome.toLowerCase().includes(termo)) return false
      return true
    })
  }, [consultas, filtroGabinete, filtroRisco, soPorConfirmar, soVagas, pesquisa])

  const gabinetesVisiveis =
    filtroGabinete === 'todos'
      ? gabinetes
      : gabinetes.filter((g) => g.id === filtroGabinete)

  function voltarSelecao() {
    setClinicaId(null)
    setConsultaSelId(null)
    setFiltroGabinete('todos')
    setFiltroRisco('todos')
    setPesquisa('')
    setSoPorConfirmar(false)
    setSoVagas(false)
  }

  return (
    <div className="app">
      <header className="cabecalho-app">
        <div className="marca" onClick={voltarSelecao} role="button" tabIndex={0}>
          <img
            className="marca-logo"
            src={`${import.meta.env.BASE_URL}logo-aot.png`}
            alt="AoT — Appointment on Time"
          />
          <div>
            <span className="marca-nome">AoT — Módulo de Cancelamentos</span>
            <span className="marca-sub">Gestão de faltas · Clínica dentária</span>
          </div>
        </div>

        <div className="cabecalho-direita">
          <span className={`selo-fonte fonte-${FONTE_DADOS}`}>
            {FONTE_DADOS === 'supabase'
              ? 'Dados: Supabase'
              : 'Dados de demonstração'}
          </span>
          <SeletorData data={data} aoMudar={setData} />
        </div>
      </header>

      <nav className="trilho">
        <button className="trilho-item" onClick={voltarSelecao}>
          Clínicas
        </button>
        {clinicaAtual && (
          <>
            <span className="trilho-sep">/</span>
            <span className="trilho-item ativo">{clinicaAtual.nome}</span>
          </>
        )}
      </nav>

      <main className="conteudo">
        {erro && (
          <div className="aviso-erro">
            Ocorreu um erro ao carregar os dados: {erro}
          </div>
        )}

        {!clinicaId ? (
          carregando ? (
            <Carregando />
          ) : (
            <SeletorClinica
              resumos={resumos}
              data={data}
              aoSelecionar={setClinicaId}
            />
          )
        ) : (
          <section className="agenda">
            <BarraResumo consultas={consultas} />

            <div className="barra-filtros">
              <input
                type="search"
                className="campo-pesquisa"
                placeholder="Procurar paciente…"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
              />

              <select
                className="select-filtro"
                value={filtroGabinete}
                onChange={(e) => setFiltroGabinete(e.target.value)}
              >
                <option value="todos">Todos os gabinetes</option>
                {gabinetes.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>

              <div className="grupo-risco">
                {(['todos', 'alto', 'medio', 'baixo'] as FiltroRisco[]).map(
                  (nivel) => (
                    <button
                      key={nivel}
                      className={`chip-risco ${
                        filtroRisco === nivel ? 'ativo' : ''
                      } ${nivel !== 'todos' ? `chip-${nivel}` : ''}`}
                      onClick={() => setFiltroRisco(nivel)}
                    >
                      {nivel === 'todos'
                        ? 'Todos'
                        : nivel === 'alto'
                          ? 'Alto'
                          : nivel === 'medio'
                            ? 'Médio'
                            : 'Baixo'}
                    </button>
                  ),
                )}
              </div>

              <label className="toggle-confirmar">
                <input
                  type="checkbox"
                  checked={soPorConfirmar}
                  onChange={(e) => setSoPorConfirmar(e.target.checked)}
                />
                Só por confirmar
              </label>

              <button
                className={`chip-vagas ${soVagas ? 'ativo' : ''}`}
                onClick={() => setSoVagas((v) => !v)}
              >
                Vagas livres{numVagas > 0 ? ` (${numVagas})` : ''}
              </button>
            </div>

            {carregando ? (
              <Carregando />
            ) : consultasFiltradas.length === 0 ? (
              <p className="vazio">
                Sem marcações para os filtros selecionados.
              </p>
            ) : (
              <VistaGabinetes
                gabinetes={gabinetesVisiveis}
                consultas={consultasFiltradas}
                consultaSelecionada={consultaSelId}
                aoSelecionarConsulta={setConsultaSelId}
              />
            )}
          </section>
        )}
      </main>

      <PainelPaciente
        consulta={consultaSelecionada}
        sugestoes={sugestoes}
        aCarregarSugestoes={aCarregarSugestoes}
        aoFechar={() => setConsultaSelId(null)}
      />
    </div>
  )
}

function Carregando() {
  return <div className="carregando">A carregar…</div>
}

function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}
