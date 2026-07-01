import type { ConsultaEnriquecida } from '../tipos'
import { ETIQUETA_NIVEL } from '../logica/risco'
import { DistintivoRisco } from './DistintivoRisco'
import { iniciais } from '../utils/formato'

interface Props {
  consulta: ConsultaEnriquecida | null
  aoFechar: () => void
}

function acaoSugerida(c: ConsultaEnriquecida): string {
  if (c.estado === 'Cancelada') return 'Marcação cancelada — libertar o horário.'
  if (c.estado === 'Faltou') return 'Paciente faltou — contactar para remarcar.'
  if (c.risco.nivel === 'alto')
    return c.confirmada
      ? 'Reforçar lembrete por telefone na véspera.'
      : 'Ligar ao paciente para confirmar a presença.'
  if (c.risco.nivel === 'medio')
    return c.confirmada
      ? 'Enviar lembrete automático por SMS na véspera.'
      : 'Enviar pedido de confirmação por SMS.'
  return 'Sem ação necessária — risco controlado.'
}

export function PainelPaciente({ consulta, aoFechar }: Props) {
  if (!consulta) return null
  const { paciente, medico, gabinete, risco } = consulta
  const taxaHistorica =
    paciente.consultasTotais > 0
      ? Math.round((paciente.faltas / paciente.consultasTotais) * 100)
      : null

  return (
    <>
      <div className="painel-fundo" onClick={aoFechar} />
      <aside className="painel-paciente" role="dialog" aria-label="Detalhe do paciente">
        <header className="painel-cabecalho">
          <div className="avatar">{iniciais(paciente.nome)}</div>
          <div className="painel-titulo">
            <h2>{paciente.nome}</h2>
            <span>
              {paciente.idade} anos · {paciente.telefone}
            </span>
          </div>
          <button className="btn-fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="painel-risco">
          <DistintivoRisco
            nivel={risco.nivel}
            pontuacao={risco.pontuacao}
            tamanho="grande"
          />
          <p className="painel-risco-texto">
            Probabilidade estimada de falta:{' '}
            <strong>{risco.pontuacao}%</strong> ({ETIQUETA_NIVEL[risco.nivel]})
          </p>
        </div>

        <div className="painel-accao">
          <span className="painel-accao-icone" aria-hidden="true">⚑</span>
          <p>{acaoSugerida(consulta)}</p>
        </div>

        <section className="painel-seccao">
          <h4>Marcação</h4>
          <dl className="painel-detalhes">
            <div><dt>Tipo</dt><dd>{consulta.tipo}</dd></div>
            <div><dt>Valor</dt><dd>{consulta.valorEuros} €</dd></div>
            <div><dt>Hora</dt><dd>{consulta.hora} ({consulta.duracaoMin} min)</dd></div>
            <div><dt>Gabinete</dt><dd>{gabinete.nome}</dd></div>
            <div><dt>Médico</dt><dd>{medico.nome}</dd></div>
            <div><dt>Estado</dt><dd>{consulta.estado}</dd></div>
            <div>
              <dt>Confirmação</dt>
              <dd>
                {consulta.confirmada
                  ? `Confirmada (${consulta.canalConfirmacao})`
                  : 'Por confirmar'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="painel-seccao">
          <h4>Histórico do paciente</h4>
          <dl className="painel-detalhes">
            <div><dt>Sexo</dt><dd>{paciente.sexo}</dd></div>
            <div><dt>Seguro</dt><dd>{paciente.seguro}</dd></div>
            <div><dt>Contacto preferido</dt><dd>{paciente.canalPreferido}</dd></div>
            <div><dt>Consultas</dt><dd>{paciente.consultasTotais}</dd></div>
            <div>
              <dt>Faltas</dt>
              <dd>
                {paciente.faltas}
                {taxaHistorica !== null && ` (${taxaHistorica}%)`}
              </dd>
            </div>
            <div><dt>Cancelamentos tardios</dt><dd>{paciente.cancelamentosTardios}</dd></div>
            <div><dt>Distância</dt><dd>{paciente.distanciaKm} km</dd></div>
            <div>
              <dt>Última visita</dt>
              <dd>
                {paciente.mesesDesdeUltimaVisita === null
                  ? 'Nunca'
                  : `há ${paciente.mesesDesdeUltimaVisita} meses`}
              </dd>
            </div>
          </dl>
        </section>

        <section className="painel-seccao">
          <h4>Porque é que o risco é este?</h4>
          {risco.fatores.length === 0 ? (
            <p className="sem-fatores">
              Nenhum fator de risco relevante. Paciente fiável.
            </p>
          ) : (
            <ul className="lista-fatores">
              {risco.fatores.map((f, i) => (
                <li key={i} className="fator">
                  <div className="fator-topo">
                    <span className="fator-etiqueta">{f.etiqueta}</span>
                    <span className="fator-pontos">+{f.contribuicao}</span>
                  </div>
                  <div className="fator-barra">
                    <span
                      className="fator-barra-preenchimento"
                      style={{ width: `${Math.min(100, f.contribuicao * 4)}%` }}
                    />
                  </div>
                  <p className="fator-descricao">{f.descricao}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </>
  )
}
