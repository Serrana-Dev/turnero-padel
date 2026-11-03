const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export const pesos = (n: number) => moneda.format(n).replace(/\s/g, '')
export const num = (n: number) => numero.format(n)
export const pct = (n: number) => `${Math.round(n * 100)}%`

/** 'HH:MM' → minutos desde medianoche */
export const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** minutos desde medianoche → 'HH:MM' */
export const hora = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export const duracion = (min: number) => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Fecha local como 'YYYY-MM-DD' */
export const clave = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const deClave = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const sumarDias = (k: string, n: number) => {
  const d = deClave(k)
  d.setDate(d.getDate() + n)
  return clave(d)
}

export const hoyClave = () => clave(new Date())
export const ahoraMin = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

const fLarga = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
const fCorta = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric' })
const fDiaMes = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
const fMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })

export const fechaLarga = (k: string) => fLarga.format(deClave(k))
export const fechaCorta = (k: string) => fCorta.format(deClave(k)).replace('.', '')
export const diaMes = (k: string) => fDiaMes.format(deClave(k)).replace('.', '')
export const mesAño = (k: string) => fMes.format(deClave(k))

/** "hoy", "mañana" o la fecha larga */
export const fechaRelativa = (k: string) => {
  const h = hoyClave()
  if (k === h) return 'hoy'
  if (k === sumarDias(h, 1)) return 'mañana'
  return fechaLarga(k)
}

export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const iniciales = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
