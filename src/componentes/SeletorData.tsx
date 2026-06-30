import { dataLonga, deslocarDia, hojeISO } from '../utils/formato'

interface Props {
  data: string
  aoMudar: (data: string) => void
}

export function SeletorData({ data, aoMudar }: Props) {
  return (
    <div className="seletor-data">
      <button
        className="btn-nav-data"
        onClick={() => aoMudar(deslocarDia(data, -1))}
        aria-label="Dia anterior"
      >
        ‹
      </button>

      <div className="seletor-data-centro">
        <span className="seletor-data-texto">{dataLonga(data)}</span>
        <input
          type="date"
          value={data}
          onChange={(e) => aoMudar(e.target.value)}
          className="input-data"
        />
      </div>

      <button
        className="btn-nav-data"
        onClick={() => aoMudar(deslocarDia(data, 1))}
        aria-label="Dia seguinte"
      >
        ›
      </button>

      {data !== hojeISO() && (
        <button className="btn-hoje" onClick={() => aoMudar(hojeISO())}>
          Hoje
        </button>
      )}
    </div>
  )
}
