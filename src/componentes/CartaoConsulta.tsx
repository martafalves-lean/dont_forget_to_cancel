import type { ConsultaEnriquecida } from '../tipos'
import { DistintivoRisco } from './DistintivoRisco'

interface Props {
  consulta: ConsultaEnriquecida
  selecionada: boolean
  aoClicar: () => void
}

export function CartaoConsulta({ consulta, selecionada, aoClicar }: Props) {
  const { paciente, risco, estado } = consulta
  const inativa = estado === 'Cancelada' || estado === 'Faltou'

  return (
    <button
      className={`cartao-consulta borda-${risco.nivel} ${
        selecionada ? 'selecionada' : ''
      } ${inativa ? 'inativa' : ''}`}
      onClick={aoClicar}
    >
      <div className="consulta-hora">
        <strong>{consulta.hora}</strong>
        <span>{consulta.duracaoMin} min</span>
      </div>

      <div className="consulta-corpo">
        <div className="consulta-linha-topo">
          <span className="consulta-paciente">{paciente.nome}</span>
          <DistintivoRisco nivel={risco.nivel} pontuacao={risco.pontuacao} />
        </div>
        <div className="consulta-meta">
          <span className="consulta-tipo">{consulta.tipo}</span>
          <span className={`etiqueta-estado estado-${estado.toLowerCase()}`}>
            {estado}
          </span>
          {!consulta.confirmada && !inativa && (
            <span className="etiqueta-por-confirmar">Por confirmar</span>
          )}
        </div>
      </div>
    </button>
  )
}
