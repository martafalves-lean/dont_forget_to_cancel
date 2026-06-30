import type { ResumoClinica } from '../dados/repositorio'
import { dataLonga } from '../utils/formato'

interface Props {
  resumos: ResumoClinica[]
  data: string
  aoSelecionar: (clinicaId: string) => void
}

export function SeletorClinica({ resumos, data, aoSelecionar }: Props) {
  return (
    <section className="selecao-clinica">
      <div className="hero-logo">
        <img
          src={`${import.meta.env.BASE_URL}logo-aot.png`}
          alt="AoT — Appointment on Time"
        />
        <p className="hero-modulo">Módulo de Cancelamentos</p>
      </div>

      <header className="selecao-cabecalho">
        <h2>Escolha a clínica</h2>
        <p className="subtitulo">
          Resumo do dia <strong>{dataLonga(data)}</strong>. Selecione um local
          para ver as marcações por gabinete.
        </p>
      </header>

      <div className="grelha-clinicas">
        {resumos.map(({ clinica, total, porConfirmar, altoRisco, faltasPrevistas }) => (
          <button
            key={clinica.id}
            className="cartao-clinica"
            onClick={() => aoSelecionar(clinica.id)}
          >
            <div className="cartao-clinica-topo">
              <span className="etiqueta-cidade">{clinica.cidade}</span>
              {altoRisco > 0 && (
                <span className="selo-alerta" title="Marcacoes de risco alto">
                  {altoRisco} em risco
                </span>
              )}
            </div>
            <h3>{clinica.nome}</h3>
            <p className="morada">{clinica.morada}</p>

            <dl className="metricas-clinica">
              <div>
                <dt>Marcações</dt>
                <dd>{total}</dd>
              </div>
              <div>
                <dt>Por confirmar</dt>
                <dd>{porConfirmar}</dd>
              </div>
              <div>
                <dt>Faltas previstas</dt>
                <dd className={faltasPrevistas > 0 ? 'destaque-aviso' : ''}>
                  {faltasPrevistas}
                </dd>
              </div>
            </dl>

            <span className="cartao-acao">Ver agenda →</span>
          </button>
        ))}
      </div>
    </section>
  )
}
