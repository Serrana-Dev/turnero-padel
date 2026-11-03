// Ligas y torneos: fixture todos contra todos, zonas, cuadro y tabla de posiciones.
// Funciones puras; el estado vive en datos.ts.
import { negocio } from '../config/negocio'
import { deClave, sumarDias } from './formato'

export type Pareja = { id: string; nombre: string }
export type Sets = [number, number][]

/** De dónde sale una pareja de la llave cuando todavía no se sabe quién es. */
export type Origen = { zona: string; puesto: number } | { ganador: string }

export type Partido = {
  id: string
  /** "Fecha 3", "Zona A", "Cuartos", "Semifinal", "Final" */
  ronda: string
  dia: string
  inicio: number
  canchaId: string
  a: string | null
  b: string | null
  desdeA?: Origen
  desdeB?: Origen
  sets?: Sets
}

export type Competencia = {
  id: string
  nombre: string
  formato: 'liga' | 'torneo'
  categoria: string
  parejas: Pareja[]
  partidos: Partido[]
}

export type Fila = { pareja: Pareja; pj: number; pg: number; pp: number; sf: number; sc: number; gf: number; gc: number; pts: number }

/** Puntos por partido, como en el fútbol: ganar suma 3, perder no suma. */
export const PUNTOS_GANADO = 3

export const ganador = (p: Partido) => {
  if (!p.sets?.length || !p.a || !p.b) return null
  const a = p.sets.filter(([x, y]) => x > y).length
  const b = p.sets.length - a
  return a > b ? p.a : p.b
}

export const marcador = (p: Partido) => p.sets?.map(([x, y]) => `${x}-${y}`).join(' ') ?? ''

export function tabla(parejas: Pareja[], partidos: Partido[]): Fila[] {
  const filas = new Map(parejas.map((p) => [p.id, { pareja: p, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0, gf: 0, gc: 0, pts: 0 }]))
  for (const p of partidos) {
    const g = ganador(p)
    if (!g || !p.a || !p.b) continue
    for (const [lado, flip] of [[p.a, false], [p.b, true]] as const) {
      const f = filas.get(lado)
      if (!f) continue
      f.pj++
      if (g === lado) {
        f.pg++
        f.pts += PUNTOS_GANADO
      } else f.pp++
      for (const [x, y] of p.sets!) {
        const [m, t] = flip ? [y, x] : [x, y]
        f.gf += m
        f.gc += t
        if (m > t) f.sf++
        else f.sc++
      }
    }
  }
  return [...filas.values()].sort((x, y) => y.pts - x.pts || y.sf - y.sc - (x.sf - x.sc) || y.gf - y.gc - (x.gf - x.gc) || x.pareja.nombre.localeCompare(y.pareja.nombre))
}

/** Todos contra todos por el método del círculo: una fecha por semana. */
export function fixtureLiga(parejas: Pareja[], primera: string, inicio: number): Partido[] {
  const ids = parejas.map((p) => p.id)
  if (ids.length % 2) ids.push('libre')
  const n = ids.length
  const partidos: Partido[] = []
  let rueda = [...ids]
  for (let f = 0; f < n - 1; f++) {
    const dia = sumarDias(primera, f * 7)
    for (let i = 0; i < n / 2; i++) {
      const a = rueda[i]
      const b = rueda[n - 1 - i]
      if (a === 'libre' || b === 'libre') continue
      const k = partidos.filter((x) => x.dia === dia).length
      partidos.push({
        id: `f${f + 1}-${i}`,
        ronda: `Fecha ${f + 1}`,
        dia,
        inicio: inicio + Math.floor(k / negocio.canchas.length) * negocio.duracion,
        canchaId: negocio.canchas[k % negocio.canchas.length].id,
        a: f % 2 ? b : a,
        b: f % 2 ? a : b,
      })
    }
    rueda = [rueda[0], rueda[n - 1], ...rueda.slice(1, n - 1)]
  }
  return partidos
}

const LETRAS = 'ABCDEFGH'

/** Torneo de fin de semana: zonas de tres el sábado, cuartos, semis y final el domingo. */
export function fixtureTorneo(parejas: Pareja[], sabado: string): Partido[] {
  const zonas = Math.floor(parejas.length / 3)
  const partidos: Partido[] = []
  const turnosSabado = [600, 690, 780, 870, 960, 1050]
  let k = 0
  for (let z = 0; z < zonas; z++) {
    const [p1, p2, p3] = parejas.slice(z * 3, z * 3 + 3).map((p) => p.id)
    for (const [a, b] of [[p1, p2], [p1, p3], [p2, p3]]) {
      partidos.push({
        id: `z${LETRAS[z]}${k}`,
        ronda: `Zona ${LETRAS[z]}`,
        dia: sabado,
        inicio: turnosSabado[Math.floor(k / negocio.canchas.length)],
        canchaId: negocio.canchas[k % negocio.canchas.length].id,
        a,
        b,
      })
      k++
    }
  }
  const domingo = sumarDias(sabado, 1)
  const cruces: [Origen, Origen][] = [
    [{ zona: 'A', puesto: 1 }, { zona: 'B', puesto: 2 }],
    [{ zona: 'C', puesto: 1 }, { zona: 'D', puesto: 2 }],
    [{ zona: 'B', puesto: 1 }, { zona: 'A', puesto: 2 }],
    [{ zona: 'D', puesto: 1 }, { zona: 'C', puesto: 2 }],
  ]
  cruces.forEach(([x, y], i) =>
    partidos.push({ id: `cuartos${i}`, ronda: 'Cuartos', dia: domingo, inicio: 600, canchaId: negocio.canchas[i].id, a: null, b: null, desdeA: x, desdeB: y }),
  )
  for (let i = 0; i < 2; i++)
    partidos.push({
      id: `semi${i}`,
      ronda: 'Semifinal',
      dia: domingo,
      inicio: 750,
      canchaId: negocio.canchas[i].id,
      a: null,
      b: null,
      desdeA: { ganador: `cuartos${i * 2}` },
      desdeB: { ganador: `cuartos${i * 2 + 1}` },
    })
  partidos.push({ id: 'final', ronda: 'Final', dia: domingo, inicio: 1020, canchaId: 'c1', a: null, b: null, desdeA: { ganador: 'semi0' }, desdeB: { ganador: 'semi1' } })
  return partidos
}

export const zonasDe = (c: Competencia) => [...new Set(c.partidos.filter((p) => p.ronda.startsWith('Zona')).map((p) => p.ronda.slice(5)))]

export function parejasDeZona(c: Competencia, zona: string) {
  const ids = new Set(c.partidos.filter((p) => p.ronda === `Zona ${zona}`).flatMap((p) => [p.a, p.b]))
  return c.parejas.filter((p) => ids.has(p.id))
}

/** Completa la llave con los clasificados y ganadores que ya se conocen. */
export function resolver(c: Competencia): Partido[] {
  const lista = c.partidos.map((p) => ({ ...p }))
  const porId = new Map(lista.map((p) => [p.id, p]))
  const quien = (o?: Origen): string | null => {
    if (!o) return null
    if ('ganador' in o) {
      const p = porId.get(o.ganador)
      return p ? ganador(p) : null
    }
    const deZona = lista.filter((p) => p.ronda === `Zona ${o.zona}`)
    if (deZona.some((p) => !p.sets)) return null
    return tabla(parejasDeZona(c, o.zona), deZona)[o.puesto - 1]?.pareja.id ?? null
  }
  for (const p of lista) {
    if (p.desdeA) p.a = quien(p.desdeA)
    if (p.desdeB) p.b = quien(p.desdeB)
  }
  return lista
}

export const etiquetaOrigen = (o?: Origen) =>
  !o ? 'A definir' : 'zona' in o ? `${o.puesto}° Zona ${o.zona}` : `Ganador ${o.ganador.startsWith('cuartos') ? 'cuartos' : 'semi'} ${Number(o.ganador.slice(-1)) + 1}`

/** Las rondas en orden, con sus partidos. */
export function rondas(c: Competencia) {
  const lista = c.formato === 'torneo' ? resolver(c) : c.partidos
  const orden: string[] = []
  for (const p of lista) if (!orden.includes(p.ronda)) orden.push(p.ronda)
  return orden.map((r) => ({ ronda: r, partidos: lista.filter((p) => p.ronda === r) }))
}

/** La ronda que toca mirar: la primera con partidos sin resultado, o la última. */
export function rondaActual(c: Competencia) {
  const rs = rondas(c)
  return (rs.find((r) => r.partidos.some((p) => !p.sets)) ?? rs[rs.length - 1]).ronda
}

export function campeon(c: Competencia) {
  if (c.formato === 'torneo') {
    const f = resolver(c).find((p) => p.id === 'final')
    const g = f && ganador(f)
    return g ? c.parejas.find((p) => p.id === g) ?? null : null
  }
  if (c.partidos.some((p) => !p.sets)) return null
  return tabla(c.parejas, c.partidos)[0].pareja
}

/** Resultado verosímil de un partido de pádel, dos o tres sets. */
export function setsAlAzar(r: () => number): Sets {
  const set = (gana: boolean): [number, number] => {
    const x = r()
    const [g, p] = x < 0.12 ? [7, 6] : x < 0.24 ? [7, 5] : [6, Math.floor(r() * 5)]
    return gana ? [g, p] : [p, g]
  }
  const ganaA = r() < 0.5
  if (r() < 0.65) return [set(ganaA), set(ganaA)]
  return [set(ganaA), set(!ganaA), set(ganaA)]
}

export const diaSemana = (dia: string) => ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][deClave(dia).getDay()]
