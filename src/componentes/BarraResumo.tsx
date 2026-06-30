import type { ConsultaEnriquecida } from '../tipos'

interface Props {
  consultas: ConsultaEnriquecida[]
}

export function BarraResumo({ consultas }: Props) {
  const ativas = consultas.filter(
    (c) => c.estado !== 'Cancelada' && c.estado !== 'Faltou',
  )
  const total = ativas.length
  const confirmadas = ativas.filter((c) => c.confirmada).length
  const altoRisco = ativas.filter((c) => c.risco.nivel === 'alto').length
  const faltasPrevistas = ativas.reduce(
    (s, c) => s + c.risco.pontuacao / 100,
    0,
  )
  const taxaPrevista = total > 0 ? (faltasPrevistas / total) * 100 : 0

  const metricas = [
    { etiqueta: 'Marcações', valor: String(total), tom: 'neutro' },
    {
      etiqueta: 'Confirmadas',
      valor: `${confirmadas}/${total}`,
      tom: 'neutro',
    },
    { etiqueta: 'Risco alto', valor: String(altoRisco), tom: 'alerta' },
    {
      etiqueta: 'Taxa de falta prevista',
      valor: `${taxaPrevista.toFixed(0)}%`,
      tom: 'aviso',
    },
    {
      etiqueta: 'Faltas previstas',
      valor: faltasPrevistas.toFixed(1),
      tom: 'aviso',
    },
  ]

  return (
    <div className="barra-resumo">
      {metricas.map((m) => (
        <div key={m.etiqueta} className={`metrica metrica-${m.tom}`}>
          <span className="metrica-valor">{m.valor}</span>
          <span className="metrica-etiqueta">{m.etiqueta}</span>
        </div>
      ))}
    </div>
  )
}
