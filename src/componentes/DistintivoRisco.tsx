import type { NivelRisco } from '../tipos'
import { ETIQUETA_NIVEL } from '../logica/risco'

interface Props {
  nivel: NivelRisco
  pontuacao: number
  tamanho?: 'normal' | 'grande'
}

export function DistintivoRisco({ nivel, pontuacao, tamanho = 'normal' }: Props) {
  return (
    <span
      className={`distintivo-risco risco-${nivel} ${
        tamanho === 'grande' ? 'distintivo-grande' : ''
      }`}
      title={ETIQUETA_NIVEL[nivel]}
    >
      <span className="ponto-risco" aria-hidden="true" />
      <strong>{pontuacao}</strong>
      <span className="distintivo-etiqueta">{ETIQUETA_NIVEL[nivel]}</span>
    </span>
  )
}
