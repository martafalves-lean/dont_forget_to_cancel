import type { ConsultaEnriquecida, Gabinete } from '../tipos'
import { CartaoConsulta } from './CartaoConsulta'

interface Props {
  gabinetes: Gabinete[]
  consultas: ConsultaEnriquecida[]
  consultaSelecionada: string | null
  aoSelecionarConsulta: (id: string) => void
}

export function VistaGabinetes({
  gabinetes,
  consultas,
  consultaSelecionada,
  aoSelecionarConsulta,
}: Props) {
  return (
    <div className="vista-gabinetes">
      {gabinetes.map((gab) => {
        const doGabinete = consultas.filter((c) => c.gabineteId === gab.id)
        const medico = doGabinete[0]?.medico
        const ativas = doGabinete.filter(
          (c) => c.estado !== 'Cancelada' && c.estado !== 'Faltou',
        )
        return (
          <div key={gab.id} className="coluna-gabinete">
            <header className="cabecalho-gabinete">
              <div>
                <h3>{gab.nome}</h3>
                {medico && <span className="medico-nome">{medico.nome}</span>}
              </div>
              <span className="contador-gabinete">{ativas.length}</span>
            </header>

            <div className="lista-consultas">
              {doGabinete.length === 0 ? (
                <p className="sem-consultas">Sem marcações</p>
              ) : (
                doGabinete.map((c) => (
                  <CartaoConsulta
                    key={c.id}
                    consulta={c}
                    selecionada={consultaSelecionada === c.id}
                    aoClicar={() => aoSelecionarConsulta(c.id)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
