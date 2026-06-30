// Utilitarios de formatacao em portugues europeu.

const fmtDataLonga = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const fmtDataCurta = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
})

export function hojeISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

export function paraData(iso: string): Date {
  return new Date(iso + 'T00:00:00')
}

export function dataLonga(iso: string): string {
  return capitalizar(fmtDataLonga.format(paraData(iso)))
}

export function dataCurta(iso: string): string {
  return fmtDataCurta.format(paraData(iso))
}

export function deslocarDia(iso: string, dias: number): string {
  const d = paraData(iso)
  d.setDate(d.getDate() + dias)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function iniciais(nome: string): string {
  const partes = nome.replace(/^(Dr|Dra)\.?\s+/i, '').trim().split(/\s+/)
  const primeiro = partes[0]?.[0] ?? ''
  const ultimo = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeiro + ultimo).toUpperCase()
}
