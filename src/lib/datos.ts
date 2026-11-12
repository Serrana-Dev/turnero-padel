// Tipos, datos de demo y estado del complejo. Todo vive en el navegador (localStorage).
import { useSyncExternalStore } from 'react'
import { negocio, precioDe, type Insumo, type ItemCantina, type LineaReceta } from '../config/negocio'
import { ahoraMin, deClave, hoyClave, sumarDias } from './formato'
import { fixtureEliminacion, fixtureLiga, fixtureTorneo, resolver as resolverLlave, setsAlAzar, type Competencia, type Pareja, type Sets } from './competencias'

export type Metodo = 'efectivo' | 'transferencia'
export const metodos: Record<Metodo, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia' }

export type EstadoReserva = 'pendiente' | 'señada' | 'pagada' | 'cancelada'
export const estados: Record<EstadoReserva, string> = {
  pendiente: 'Falta la seña',
  señada: 'Señada',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
}

export type Reserva = {
  id: string
  canchaId: string
  dia: string
  inicio: number
  titular: string
  telefono: string
  precio: number
  seña: number
  estado: EstadoReserva
  origen: 'web' | 'whatsapp' | 'fijo'
  fijoId?: string
  metodo?: Metodo
  /** Se cobró dividido desde la cuenta de la cancha (los pagos están en la cuenta). */
  porCuenta?: boolean
}

export type Fijo = { id: string; canchaId: string; dow: number; inicio: number; titular: string; telefono: string; desde: string }
export type Venta = {
  id: string; dia: string; hora: number; itemId: string; monto: number; metodo: Metodo; cantidad?: number; reservaId?: string; quien?: string
  /** Motivo si se anuló: no suma en la caja y el stock volvió. */
  anulada?: string
  /** Invita la casa: sale de stock pero no se cobra. */
  cortesia?: boolean
  /** Porcentaje de descuento que se hizo (10 = 10 %). */
  descuento?: number
}

/** Lo que se consumió en una cancha: a nombre de alguien o para todos (quien null). */
export type Consumo = { id: string; itemId: string; quien: string | null; hora: number }
export type Pago = { nombre: string; monto: number; metodo: Metodo; hora: number }
/** La cuenta abierta de un turno: quiénes juegan, qué consumieron y quién ya pagó. */
export type Cuenta = { reservaId: string; nombres: string[]; consumos: Consumo[]; pagos: Pago[]; modo: 'partes' | 'persona'; partes: number; cerrada?: boolean }
export type MovStock = { id: string; dia: string; hora: number; insumoId: string; cantidad: number; motivo: 'venta' | 'compra' | 'ajuste' | 'merma'; detalle: string }
export type Compra = { id: string; dia: string; proveedor: string; items: { insumoId: string; cantidad: number; costo: number }[]; total: number; metodo: Metodo }
export type Gasto = { id: string; dia: string; hora: number; categoria: string; concepto: string; monto: number; metodo: Metodo; compraId?: string }
export type Cierre = { dia: string; apertura: number; contado: number; hora: number; cajero: string; abrio: number }
/** Quién abrió la caja, a qué hora y con cuánto cambio contado. */
export type Apertura = { dia: string; hora: number; monto: number; cajero: string }
/** Plata en efectivo que se saca de la caja (para depositar, pagarle a alguien) o que se pone (cambio extra). */
export type Retiro = { id: string; dia: string; hora: number; tipo: 'retiro' | 'ingreso'; monto: number; motivo: string; quien: string }
export type Solicitud = { id: string; nombre: string; telefono: string; dow: number; inicio: number; creada: string }

export type Estado = {
  version: number
  generado: string
  reservas: Reserva[]
  fijos: Fijo[]
  ventas: Venta[]
  solicitudes: Solicitud[]
  competencias: Competencia[]
  /** Stock actual de cada insumo, en su unidad. */
  stock: Record<string, number>
  movimientos: MovStock[]
  compras: Compra[]
  gastos: Gasto[]
  cuentas: Cuenta[]
  cierres: Cierre[]
  retiros: Retiro[]
  aperturas: Apertura[]
  /** La carta y los insumos se pueden editar desde el panel. */
  productos: ItemCantina[]
  insumos: Insumo[]
}

const VERSION = 12
const CLAVE = 'tresmuros-demo'

function azar(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const nombres = ['Matías', 'Lucas', 'Franco', 'Nico', 'Santi', 'Tomás', 'Joaquín', 'Facu', 'Agus', 'Bruno', 'Gonza', 'Nacho', 'Lauti', 'Juli', 'Cami', 'Sofi', 'Vale', 'Flor', 'Euge', 'Pau', 'Mica', 'Ramiro', 'Pablo', 'Diego', 'Martín', 'Seba', 'Germán', 'Ceci', 'Lu', 'Romi']
const apellidos = ['González', 'Ferreyra', 'Bustos', 'Ledesma', 'Vera', 'Sosa', 'Romero', 'Díaz', 'Pereyra', 'Moyano', 'Heredia', 'Luna', 'Oviedo', 'Quinteros', 'Carranza', 'Allende', 'Funes', 'Cabrera']
const tel = (r: () => number) => `351 ${Math.floor(150 + r() * 650)}-${String(Math.floor(r() * 10000)).padStart(4, '0')}`

function generar(): Estado {
  const hoy = hoyClave()
  const ahora = ahoraMin()
  const r = azar(Number(hoy.replace(/-/g, '')) + 7)
  const persona = () => `${nombres[Math.floor(r() * nombres.length)]} ${apellidos[Math.floor(r() * apellidos.length)]}`

  // Turnos fijos semanales en horario pico
  const fijos: Fijo[] = []
  for (let i = 0; i < 26; i++) {
    const dow = 1 + Math.floor(r() * 5)
    const inicio = negocio.turnos[6 + Math.floor(r() * 5)]
    const canchaId = negocio.canchas[Math.floor(r() * 4)].id
    if (fijos.some((f) => f.dow === dow && f.inicio === inicio && f.canchaId === canchaId)) continue
    fijos.push({ id: `f${i}`, canchaId, dow, inicio, titular: persona(), telefono: tel(r), desde: sumarDias(hoy, -Math.floor(30 + r() * 300)) })
  }

  const reservas: Reserva[] = []
  let n = 0
  for (let d = -62; d <= 10; d++) {
    const dia = sumarDias(hoy, d)
    const dow = deClave(dia).getDay()
    // Todos los horarios tienen al menos un turno: así siempre hay una cancha jugándose y otra para cobrar
    for (const inicio of negocio.turnos) {
      let hay = 0
      const forzarEn = Math.floor(r() * negocio.canchas.length)
      for (const [ci, c] of negocio.canchas.entries()) {
        const fijo = fijos.find((f) => f.dow === dow && f.inicio === inicio && f.canchaId === c.id)
        // Ocupación: noches y fines de semana llenos, siesta más tranquila
        let p = inicio >= 1110 ? 0.82 : inicio >= 1020 ? 0.62 : inicio < 600 ? 0.3 : inicio >= 780 && inicio < 1000 ? 0.16 : 0.32
        if (dow === 0 || dow === 6) p = inicio >= 1380 ? 0.4 : 0.66
        if (!c.techada && inicio >= 840 && inicio < 1020 && dow !== 0 && dow !== 6) p *= 0.6
        if (d > 0) p *= Math.max(0.25, 1 - d * 0.09)
        const forzado = !hay && ci >= forzarEn && d <= 3
        if (!fijo && !forzado && r() > p) continue
        const pasada = d < 0 || (d === 0 && inicio + negocio.duracion <= ahora)
        const enCurso = d === 0 && inicio <= ahora && inicio + negocio.duracion > ahora
        let estado: EstadoReserva = 'señada'
        // Los de hoy que terminaron hace menos de 90 minutos todavía están para cobrar: se cobra al final, la cancha y lo consumido
        if (pasada) estado = !forzado && r() < 0.04 ? 'cancelada' : d === 0 && inicio + negocio.duracion > ahora - 90 ? 'señada' : 'pagada'
        else if (enCurso) estado = 'señada'
        else if (!fijo && !forzado && r() < 0.14) estado = 'pendiente'
        reservas.push({
          id: `r${++n}`,
          canchaId: c.id,
          dia,
          inicio,
          titular: fijo?.titular ?? persona(),
          telefono: fijo?.telefono ?? tel(r),
          precio: precioDe(inicio),
          seña: estado === 'pendiente' ? 0 : fijo ? 0 : negocio.seña,
          estado,
          origen: fijo ? 'fijo' : r() < 0.62 ? 'web' : 'whatsapp',
          fijoId: fijo?.id,
          metodo: estado === 'pagada' ? (r() < 0.5 ? 'efectivo' : 'transferencia') : undefined,
        })
        if (estado !== 'cancelada') hay++
      }
    }
  }

  // La carta y los insumos arrancan como están en la configuración; después se editan desde el panel
  const productos: ItemCantina[] = negocio.cantina.map((p) => ({ ...p, receta: p.receta.map((l) => ({ ...l })) }))
  const insumos: Insumo[] = negocio.insumos.map((x) => ({ ...x }))
  const carta = { productos, insumos }

  // Ventas de la cantina: más bebidas que comida, y la cocina a la noche
  const mezcla: [string, number][] = [
    ['agua', 18], ['isotonica', 12], ['cerveza', 16], ['gaseosa', 8], ['fernet', 8], ['jarra-fernet', 2], ['hamb-simple', 7], ['hamb-completa', 5],
    ['lomito', 5], ['papas', 6], ['tostado', 6], ['combo-post', 4], ['balde', 3], ['agua-x4', 3], ['pelotas', 5], ['grip', 2], ['paleta', 6],
  ]
  const totalMezcla = mezcla.reduce((s, [, p]) => s + p, 0)
  const itemAzar = () => {
    let x = r() * totalMezcla
    for (const [id, p] of mezcla) if ((x -= p) <= 0) return productos.find((c) => c.id === id)!
    return productos[0]
  }
  const metodoAzar = (): Metodo => (r() < 0.55 ? 'efectivo' : 'transferencia')
  const ventas: Venta[] = []
  for (let d = -62; d <= 0; d++) {
    const dia = sumarDias(hoy, d)
    const cuantas = 10 + Math.floor(r() * 20) + (d === 0 ? 12 : 0)
    for (let i = 0; i < cuantas; i++) {
      const it = itemAzar()
      const h = it.categoria === 'Cocina' || it.categoria === 'Combos' ? 1110 + Math.floor(r() * 300) : 600 + Math.floor(r() * 840)
      if (d === 0 && h > ahora) continue
      const x = r()
      // De vez en cuando se anula una venta o invita la casa, como pasa en cualquier barra
      const extra: Partial<Venta> = x < 0.012 ? { anulada: ['Se cobró mal', 'Se cargó dos veces'][Math.floor(r() * 2)] } : x < 0.03 && it.categoria !== 'Deportes' ? { cortesia: true } : {}
      ventas.push({ id: `v${ventas.length}`, dia, hora: h, itemId: it.id, monto: extra.cortesia ? 0 : it.precio, metodo: metodoAzar(), cantidad: 1, ...extra })
    }
  }

  // Stock de hoy: algunos insumos ya están por debajo del mínimo para que se vea el aviso
  const stock: Record<string, number> = {
    'pan-hamb': 46, medallon: 14, cheddar: 60, panceta: 1200, huevo: 30, 'pan-lomo': 22, lomo: 3200, jamon: 900, queso: 520, verdura: 1500,
    papas: 8000, 'pan-miga': 8, agua: 64, isotonica: 18, cerveza: 85, gaseosa: 40, fernet: 3800, coca: 9000, hielo: 12000, tubo: 14, grip: 3,
  }

  // Compras a proveedores: cada uno trae lo suyo cada tantos días
  const pedidos: Record<string, [string, number][]> = {
    'Distribuidora Cuyo Bebidas': [['agua', 48], ['isotonica', 24], ['cerveza', 48], ['gaseosa', 24], ['fernet', 4500], ['coca', 13500]],
    'Frigorífico Don Pepe': [['medallon', 40], ['lomo', 5000], ['panceta', 2000], ['jamon', 2000]],
    'Panadería La Espiga': [['pan-hamb', 48], ['pan-lomo', 24], ['pan-miga', 48]],
    'Mayorista Diarco': [['cheddar', 96], ['queso', 2000], ['huevo', 60], ['papas', 10000], ['hielo', 20000], ['verdura', 3000]],
    'Padel Shop Córdoba': [['tubo', 24], ['grip', 12]],
  }
  const cada: Record<string, number> = { 'Distribuidora Cuyo Bebidas': 4, 'Frigorífico Don Pepe': 5, 'Panadería La Espiga': 3, 'Mayorista Diarco': 7, 'Padel Shop Córdoba': 14 }
  const compras: Compra[] = []
  const gastos: Gasto[] = []
  const movimientos: MovStock[] = []
  for (const [prov, items] of Object.entries(pedidos)) {
    for (let d = -60 + Math.floor(r() * cada[prov]); d <= -1; d += cada[prov]) {
      const dia = sumarDias(hoy, d)
      const lista = items.map(([insumoId, cantidad]) => ({ insumoId, cantidad, costo: insumos.find((x) => x.id === insumoId)!.costo }))
      const total = Math.round(lista.reduce((s, x) => s + x.cantidad * x.costo, 0) / 100) * 100
      const id = `co${compras.length}`
      const metodo: Metodo = prov === 'Panadería La Espiga' ? 'efectivo' : 'transferencia'
      compras.push({ id, dia, proveedor: prov, items: lista, total, metodo })
      gastos.push({ id: `g${gastos.length}`, dia, hora: 600 + Math.floor(r() * 240), categoria: 'Mercadería', concepto: `Compra a ${prov}`, monto: total, metodo, compraId: id })
      if (d >= -6) lista.forEach((x) => movimientos.push({ id: `m${movimientos.length}`, dia, hora: 630, insumoId: x.insumoId, cantidad: x.cantidad, motivo: 'compra', detalle: prov }))
    }
  }

  // Mermas de las últimas semanas: lo que se venció o se cayó
  const mermas: [number, string, number, string][] = [
    [-3, 'verdura', 400, 'Se venció'], [-6, 'pan-hamb', 6, 'Se venció'], [-9, 'cerveza', 2, 'Se cayó o se rompió'],
    [-12, 'medallon', 3, 'Salió mal en la cocina'], [-17, 'pan-miga', 8, 'Se venció'], [-22, 'fernet', 300, 'Se cayó o se rompió'],
  ]
  for (const [d, insumoId, cantidad, motivo] of mermas)
    movimientos.push({ id: `m${movimientos.length}`, dia: sumarDias(hoy, d), hora: 600 + Math.floor(r() * 600), insumoId, cantidad: -cantidad, motivo: 'merma', detalle: motivo })

  // Gastos fijos del mes y los chicos de todos los días
  for (let d = -62; d <= 0; d++) {
    const dia = sumarDias(hoy, d)
    const delMes = deClave(dia).getDate()
    const g = (categoria: string, concepto: string, monto: number, metodo: Metodo = 'transferencia') =>
      gastos.push({ id: `g${gastos.length}`, dia, hora: 540 + Math.floor(r() * 600), categoria, concepto, monto, metodo })
    if (delMes === 5) {
      g('Sueldos', 'Sueldo encargado de turno', 780000)
      g('Sueldos', 'Sueldo cantinero', 640000)
      g('Sueldos', 'Profe de la escuelita', 260000)
    }
    if (delMes === 10) g('Servicios', 'Luz (EPEC)', 186000)
    if (delMes === 12) g('Servicios', 'Agua (Aguas Cordobesas)', 24000)
    if (delMes === 15) g('Servicios', 'Internet y cámaras', 32000)
    if (delMes === 20) g('Mantenimiento de canchas', 'Arena sílice para el césped', 96000)
    if (deClave(dia).getDay() === 1) {
      g('Mantenimiento de canchas', 'Cepillado y riego de canchas', 22000, 'efectivo')
      g('Limpieza', 'Artículos de limpieza y vestuarios', 18500, 'efectivo')
    }
    if (r() < 0.35 && !(d === 0 && ahora < 700)) {
      const k = Math.floor(r() * 4)
      g('Otros', ['Hielo de emergencia', 'Propina del repartidor', 'Gas para la plancha', 'Bolsas y servilletas'][k], [4000, 2500, 9000, 6000][k], 'efectivo')
    }
  }
  // Los gastos de hoy, solo los que ya pasaron
  for (let i = gastos.length - 1; i >= 0; i--) if (gastos[i].dia === hoy && gastos[i].hora > ahora) gastos.splice(i, 1)

  // Descuentos de stock de las ventas de hoy, para ver la receta en acción
  for (const v of ventas.filter((x) => x.dia === hoy)) {
    const it = productos.find((c) => c.id === v.itemId)!
    explotar(carta, it.id).forEach((l) => movimientos.push({ id: `m${movimientos.length}`, dia: hoy, hora: v.hora, insumoId: l.insumoId, cantidad: -l.cantidad, motivo: 'venta', detalle: it.nombre }))
  }

  // Cuentas abiertas en las canchas que se están jugando o recién terminaron
  const cuentas: Cuenta[] = []
  for (const res of reservas.filter((x) => x.dia === hoy && x.estado === 'señada' && x.inicio <= ahora && x.inicio + negocio.duracion + 90 > ahora)) {
    const primero = res.titular.split(' ')[0]
    const nom = [primero, ...[...nombres].sort(() => r() - 0.5).filter((n) => n !== primero).slice(0, 3)]
    const consumos: Consumo[] = []
    const n = 2 + Math.floor(r() * 4)
    for (let i = 0; i < n; i++) {
      const it = itemAzar()
      consumos.push({ id: `cc${res.id}${i}`, itemId: it.id, quien: r() < 0.3 ? null : nom[Math.floor(r() * nom.length)], hora: Math.min(res.inicio + 10 + i * 12, ahora) })
    }
    cuentas.push({ reservaId: res.id, nombres: nom, consumos, pagos: [], modo: r() < 0.5 ? 'partes' : 'persona', partes: 4 })
  }

  const solicitudes: Solicitud[] = [
    { id: 's1', nombre: 'Cami Heredia', telefono: '351 622-1098', dow: 2, inicio: 1200, creada: sumarDias(hoy, -1) },
    { id: 's2', nombre: 'Gonza Funes', telefono: '351 488-7730', dow: 4, inicio: 1290, creada: hoy },
  ]

  // Cierres de caja de los días anteriores, con alguna diferencia chica como pasa en la realidad
  // Quién tuvo la caja cada día: Marcos y Vicky en la semana, Leo el finde
  const cajeroDe = (dia: string) => {
    const dow = deClave(dia).getDay()
    return dow === 0 || dow === 6 ? 'Leo' : dow % 2 ? 'Marcos' : 'Vicky'
  }
  const parcial: Estado = {
    version: VERSION, generado: hoy, reservas, fijos, ventas, solicitudes, competencias: [], stock, movimientos, compras, gastos, cuentas,
    cierres: [], retiros: [], aperturas: [], productos, insumos,
  }
  // Aperturas: cada día el cajero abre a las 8 con el cambio contado (hoy, solo si ya abrió)
  for (let d = -45; d <= 0; d++) {
    const dia = sumarDias(hoy, d)
    if (d === 0 && ahora < 470) continue
    parcial.aperturas.push({ dia, hora: 470 + Math.floor(r() * 15), monto: negocio.cajaInicial, cajero: cajeroDe(dia) })
  }
  // Retiros de efectivo: cuando se junta mucha plata en la caja, el encargado saca para depositar
  const retiros: Retiro[] = []
  for (let d = -45; d <= 0; d++) {
    const dia = sumarDias(hoy, d)
    const efectivo = efectivoEsperado(parcial, dia) - negocio.cajaInicial
    const h = 1170 + Math.floor(r() * 60)
    if (d === 0 && h > ahora) continue
    if (efectivo > 120000 && r() < 0.7) {
      retiros.push({ id: `rt${retiros.length}`, dia, hora: h, tipo: 'retiro', monto: Math.floor((efectivo * 0.6) / 50000) * 50000, motivo: 'Retiro para depositar en el banco', quien: cajeroDe(dia) })
    }
    if (r() < 0.12) retiros.push({ id: `rt${retiros.length}`, dia, hora: 600, tipo: 'ingreso', monto: 10000, motivo: 'Cambio extra en billetes chicos', quien: cajeroDe(dia) })
  }
  parcial.retiros = retiros
  const cierres: Cierre[] = []
  for (let d = -45; d <= -1; d++) {
    const dia = sumarDias(hoy, d)
    const dif = r() < 0.8 ? 0 : [-500, 1000, -2000, 500, -1500][Math.floor(r() * 5)]
    const ap = parcial.aperturas.find((a) => a.dia === dia)!
    cierres.push({ dia, apertura: ap.monto, contado: efectivoEsperado(parcial, dia) + dif, hora: 1465 + Math.floor(r() * 25), cajero: cajeroDe(dia), abrio: ap.hora })
  }
  return { ...parcial, competencias: competenciasDeMuestra(hoy, r), cierres }
}

/** Dos ligas en curso y el torneo del fin de semana pasado, con resultados hasta hoy. */
function competenciasDeMuestra(hoy: string, r: () => number): Competencia[] {
  // Cada competencia arma sus parejas con apellidos sin repetir
  const todos = [...apellidos, 'Gómez', 'Paz', 'Olmos', 'Villarreal', 'Ríos', 'Aguirre', 'Molina', 'Castro', 'Maldonado', 'Rojas', 'Peralta', 'Arias']
  // Para el torneo grande hacen falta 64 apellidos distintos
  const muchos = [
    ...todos, 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Suárez', 'Torres', 'Juárez', 'Ruiz', 'Álvarez', 'Ojeda', 'Paredes', 'Ponce', 'Ríos', 'Navarro',
    'Coronel', 'Ibarra', 'Godoy', 'Figueroa', 'Correa', 'Cáceres', 'Ortiz', 'Domínguez', 'Morales', 'Vargas', 'Bravo', 'Mansilla', 'Toledo', 'Rivero',
    'Barrionuevo', 'Avendaño', 'Bazán', 'Tapia', 'Leiva', 'Zárate', 'Lucero', 'Montenegro', 'Arce', 'Salas', 'Cuello',
  ].filter((x, i, l) => l.indexOf(x) === i)
  const parejas = (n: number, pre: string, lista = todos): Pareja[] => {
    const mazo = [...lista].sort(() => r() - 0.5)
    return Array.from({ length: n }, (_, i) => ({ id: `${pre}${i}`, nombre: `${mazo[i * 2]} / ${mazo[i * 2 + 1]}` }))
  }
  const jugar = (c: Competencia, hasta: string) => {
    c.partidos = c.partidos.map((p) => (p.dia < hasta && p.a && p.b ? { ...p, sets: setsAlAzar(r) } : p))
  }
  const dow = deClave(hoy).getDay()
  const sabadoPasado = sumarDias(hoy, -((dow + 1) % 7 || 7))

  const liga: Competencia = { id: 'liga-primavera', nombre: 'Liga de Primavera', formato: 'liga', categoria: '7ma caballeros', parejas: [], partidos: [] }
  liga.parejas = parejas(8, 'lp')
  liga.partidos = fixtureLiga(liga.parejas, sumarDias(sabadoPasado, -21), 840)
  jugar(liga, hoy)

  const damas: Competencia = { id: 'liga-damas', nombre: 'Liga de Damas', formato: 'liga', categoria: '8va damas', parejas: [], partidos: [] }
  damas.parejas = parejas(6, 'ld')
  const miercoles = sumarDias(hoy, ((3 - dow + 7) % 7) - 14)
  damas.partidos = fixtureLiga(damas.parejas, miercoles, 1110)
  jugar(damas, hoy)

  const torneo: Competencia = { id: 'torneo-octubre', nombre: 'Torneo del mes', formato: 'torneo', categoria: '6ta libre', parejas: [], partidos: [] }
  torneo.parejas = parejas(12, 'tm')
  torneo.partidos = fixtureTorneo(torneo.parejas, sabadoPasado)
  // La llave se juega en orden: primero zonas, después cada ronda con los que pasaron
  jugar(torneo, hoy)
  for (const ronda of ['Cuartos', 'Semifinal', 'Final']) {
    const resueltos = resolverLlave(torneo)
    torneo.partidos = torneo.partidos.map((p) => {
      const x = resueltos.find((q) => q.id === p.id)!
      return p.ronda === ronda && x.a && x.b && p.dia < hoy ? { ...p, sets: setsAlAzar(r) } : p
    })
  }
  // Copa grande de 32 parejas: 16avos, octavos y cuartos jugados; semis y final este sábado
  const copa: Competencia = { id: 'copa-tres-muros', nombre: 'Copa Tres Muros', formato: 'torneo', categoria: 'Suma 13 libre', parejas: [], partidos: [] }
  copa.parejas = parejas(32, 'cp', muchos)
  copa.partidos = fixtureEliminacion(copa.parejas, sabadoPasado)
  for (const ronda of ['16avos', 'Octavos', 'Cuartos', 'Semifinal', 'Final']) {
    const resueltos = resolverLlave(copa)
    copa.partidos = copa.partidos.map((p) => {
      const x = resueltos.find((q) => q.id === p.id)!
      return p.ronda === ronda && x.a && x.b && p.dia < hoy ? { ...p, a: x.a, b: x.b, sets: setsAlAzar(r) } : p
    })
  }
  return [liga, damas, copa, torneo]
}

function cargar(): Estado {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Estado | null
    if (e && e.version === VERSION && e.generado === hoyClave()) return e
  } catch {
    /* sin almacenamiento */
  }
  return generar()
}

let estado = cargar()
const oyentes = new Set<() => void>()
function guardar(e: Estado) {
  estado = e
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e))
  } catch {
    /* modo privado */
  }
  oyentes.forEach((f) => f())
}
const suscribir = (f: () => void) => {
  oyentes.add(f)
  return () => {
    oyentes.delete(f)
  }
}
export const useDatos = () => useSyncExternalStore(suscribir, () => estado)

// ——— Acciones ———
export const reiniciar = () => guardar(generar())

export function reservar(d: Omit<Reserva, 'id' | 'precio' | 'estado' | 'seña'> & { señada: boolean }) {
  const { señada, ...resto } = d
  const nueva: Reserva = { ...resto, id: `r${Date.now()}`, precio: precioDe(d.inicio), seña: señada ? negocio.seña : 0, estado: señada ? 'señada' : 'pendiente' }
  guardar({ ...estado, reservas: [...estado.reservas, nueva] })
  return nueva
}
export const actualizarReserva = (id: string, c: Partial<Reserva>) =>
  guardar({ ...estado, reservas: estado.reservas.map((x) => (x.id === id ? { ...x, ...c } : x)) })
/** Descuenta (o devuelve, con veces negativo) del stock los insumos de la receta de un producto. */
function moverStock(e: Estado, itemId: string, veces: number, detalle: string) {
  const lineas = explotar(e, itemId, 1)
  if (!lineas.length) return { stock: e.stock, movimientos: e.movimientos }
  const stock = { ...e.stock }
  const movs: MovStock[] = lineas.map((l, i) => {
    const cant = Math.round(l.cantidad * veces * 10) / 10
    stock[l.insumoId] = Math.round(((stock[l.insumoId] ?? 0) - cant) * 10) / 10
    return {
      id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}${i}`, dia: hoyClave(), hora: ahoraMin(), insumoId: l.insumoId, cantidad: -cant,
      motivo: veces > 0 ? 'venta' : 'ajuste', detalle: veces > 0 ? detalle : `${detalle} (se quitó de la cuenta)`,
    }
  })
  return { stock, movimientos: [...e.movimientos, ...movs] }
}

/** Venta de mostrador: se cobra en el momento y descuenta la receta. */
export function vender(v: Omit<Venta, 'id'>) {
  const it = productoDe(estado, v.itemId)
  guardar({ ...estado, ...moverStock(estado, v.itemId, v.cantidad ?? 1, it?.nombre ?? v.itemId), ventas: [...estado.ventas, { ...v, id: `v${Date.now()}` }] })
}

/** Cobra un ticket entero del mostrador: cada línea es una venta y descuenta su receta. */
export function venderTicket(lineas: { itemId: string; cantidad: number }[], metodo: Metodo, descuento = 0, cortesia = false) {
  let e = estado
  const ventas: Venta[] = []
  lineas.forEach((l, i) => {
    const it = productoDe(e, l.itemId)
    if (!it || l.cantidad <= 0) return
    e = { ...e, ...moverStock(e, l.itemId, l.cantidad, cortesia ? `${it.nombre} (invita la casa)` : it.nombre) }
    const monto = cortesia ? 0 : Math.round((it.precio * l.cantidad * (1 - descuento / 100)) / 100) * 100
    ventas.push({ id: `v${Date.now()}${i}`, dia: hoyClave(), hora: ahoraMin(), itemId: l.itemId, monto, metodo, cantidad: l.cantidad, ...(cortesia ? { cortesia } : {}), ...(descuento && !cortesia ? { descuento } : {}) })
  })
  guardar({ ...e, ventas: [...e.ventas, ...ventas] })
}

/** Anula una venta del mostrador: deja de sumar en la caja y el stock vuelve. */
export function anularVenta(id: string, motivo: string) {
  const v = estado.ventas.find((x) => x.id === id)
  if (!v || v.anulada) return
  const it = productoDe(estado, v.itemId)
  const stock = { ...estado.stock }
  const movs: MovStock[] = explotar(estado, v.itemId, v.cantidad ?? 1).map((l, i) => {
    stock[l.insumoId] = Math.round(((stock[l.insumoId] ?? 0) + l.cantidad) * 10) / 10
    return { id: `m${Date.now()}a${i}`, dia: hoyClave(), hora: ahoraMin(), insumoId: l.insumoId, cantidad: l.cantidad, motivo: 'ajuste', detalle: `${it?.nombre ?? ''} anulado: ${motivo.toLowerCase()}` }
  })
  guardar({ ...estado, stock, movimientos: [...estado.movimientos, ...movs], ventas: estado.ventas.map((x) => (x.id === id ? { ...x, anulada: motivo } : x)) })
}
/** Lo que se tira (se venció, se cayó): sale del stock y queda registrado aparte, con su costo. */
export function registrarMerma(insumoId: string, cantidad: number, motivo: string) {
  if (cantidad <= 0) return
  guardar({
    ...estado,
    stock: { ...estado.stock, [insumoId]: Math.round(((estado.stock[insumoId] ?? 0) - cantidad) * 10) / 10 },
    movimientos: [...estado.movimientos, { id: `m${Date.now()}`, dia: hoyClave(), hora: ahoraMin(), insumoId, cantidad: -cantidad, motivo: 'merma', detalle: motivo }],
  })
}
/** Reabrir una caja cerrada (por si hay que cobrar algo más): se borra el cierre y se vuelve a contar después. */
export const reabrirCaja = (dia: string) => guardar({ ...estado, cierres: estado.cierres.filter((c) => c.dia !== dia) })
export const abrirCaja = (monto: number, cajero: string) =>
  guardar({ ...estado, aperturas: [...estado.aperturas.filter((a) => a.dia !== hoyClave()), { dia: hoyClave(), hora: ahoraMin(), monto, cajero }] })
export function aperturaDe(e: Pick<Estado, 'aperturas'>, dia: string) {
  return (e.aperturas ?? []).find((a) => a.dia === dia)
}

// ——— Carta: productos, recetas e insumos ———
export function guardarProducto(p: ItemCantina) {
  const existe = estado.productos.some((x) => x.id === p.id)
  guardar({ ...estado, productos: existe ? estado.productos.map((x) => (x.id === p.id ? p : x)) : [...estado.productos, p] })
}
export const borrarProducto = (id: string) => guardar({ ...estado, productos: estado.productos.filter((x) => x.id !== id) })
export function guardarInsumo(i: Insumo) {
  const existe = estado.insumos.some((x) => x.id === i.id)
  guardar({ ...estado, insumos: existe ? estado.insumos.map((x) => (x.id === i.id ? i : x)) : [...estado.insumos, i], stock: { ...estado.stock, [i.id]: estado.stock[i.id] ?? 0 } })
}

// ——— Cuenta de la cancha ———
export const cuentaDe = (e: Estado, reservaId: string): Cuenta => {
  const c = e.cuentas.find((x) => x.reservaId === reservaId)
  if (c) return c
  const r = e.reservas.find((x) => x.id === reservaId)
  // En el pádel juegan cuatro: el titular y tres lugares para poner el nombre
  return { reservaId, nombres: [r ? r.titular.split(' ')[0] : 'Titular', 'Jugador 2', 'Jugador 3', 'Jugador 4'], consumos: [], pagos: [], modo: 'partes', partes: 4 }
}
const conCuenta = (e: Estado, c: Cuenta) => [...e.cuentas.filter((x) => x.reservaId !== c.reservaId), c]

export function agregarConsumo(reservaId: string, itemId: string, quien: string | null) {
  const c = cuentaDe(estado, reservaId)
  const it = productoDe(estado, itemId)!
  const nueva = { ...c, modo: quien && !c.pagos.length ? ('persona' as const) : c.modo, consumos: [...c.consumos, { id: `cc${Date.now()}${Math.random().toString(36).slice(2, 6)}`, itemId, quien, hora: ahoraMin() }] }
  guardar({ ...estado, ...moverStock(estado, itemId, 1, it.nombre), cuentas: conCuenta(estado, nueva) })
}
export function quitarConsumo(reservaId: string, consumoId: string) {
  const c = cuentaDe(estado, reservaId)
  const x = c.consumos.find((k) => k.id === consumoId)
  if (!x) return
  const it = productoDe(estado, x.itemId)
  guardar({ ...estado, ...moverStock(estado, x.itemId, -1, it?.nombre ?? x.itemId), cuentas: conCuenta(estado, { ...c, consumos: c.consumos.filter((k) => k.id !== consumoId) }) })
}
export const ajustarCuenta = (reservaId: string, cambios: Partial<Pick<Cuenta, 'nombres' | 'modo' | 'partes'>>) =>
  guardar({ ...estado, cuentas: conCuenta(estado, { ...cuentaDe(estado, reservaId), ...cambios }) })

/** Cambia el nombre de un jugador en toda la cuenta: lo que consumió y lo que pagó quedan a su nombre nuevo. */
export function renombrarJugador(reservaId: string, viejo: string, nuevo: string) {
  const c = cuentaDe(estado, reservaId)
  const n = nuevo.trim()
  if (!n || n === viejo || c.nombres.includes(n)) return
  guardar({
    ...estado,
    cuentas: conCuenta(estado, {
      ...c,
      nombres: c.nombres.map((x) => (x === viejo ? n : x)),
      consumos: c.consumos.map((x) => (x.quien === viejo ? { ...x, quien: n } : x)),
      pagos: c.pagos.map((x) => (x.nombre === viejo ? { ...x, nombre: n } : x)),
    }),
  })
}
/**
 * Cuántos pagan: los primeros N de los que juegan. No se borra a nadie de la lista,
 * así se puede volver atrás; lo que consumió alguien que no paga pasa a dividirse entre los que pagan.
 */
export function cuantosJuegan(reservaId: string, n: number) {
  const c = cuentaDe(estado, reservaId)
  const nombres = [...c.nombres]
  for (let i = nombres.length; i < n; i++) {
    let k = i + 1
    while (nombres.includes(`Jugador ${k}`)) k++
    nombres.push(`Jugador ${k}`)
  }
  guardar({ ...estado, cuentas: conCuenta(estado, { ...c, nombres, partes: n }) })
}

/** Una línea del ticket de cada jugador: qué es y cuánto le toca. */
export type LineaParte = { texto: string; monto: number; tipo: 'cancha' | 'suyo' | 'compartido' }

export function repartoCuenta(e: Estado, reservaId: string, modo?: Cuenta['modo']) {
  const r = e.reservas.find((x) => x.id === reservaId)!
  const c0 = cuentaDe(e, reservaId)
  const c = modo ? { ...c0, modo } : c0
  const precioDeItem = (id: string) => productoDe(e, id)?.precio ?? 0
  const nombreDe = (id: string) => productoDe(e, id)?.nombre ?? id
  const saldoCancha = r.estado === 'pagada' && !r.porCuenta ? 0 : r.precio - r.seña
  const consumos = c.consumos.reduce((s, x) => s + precioDeItem(x.itemId), 0)
  const total = saldoCancha + consumos
  // Pagan los primeros N de los que juegan (por defecto, todos)
  const gente = (c.nombres.length ? c.nombres : ['Titular']).slice(0, Math.max(1, Math.min(c.partes || c.nombres.length, c.nombres.length || 1)))
  const n = gente.length
  /** Agrupa consumos iguales: "2 × Agua 500 ml". */
  const agrupar = (lista: Consumo[]) => {
    const m = new Map<string, number>()
    for (const x of lista) m.set(x.itemId, (m.get(x.itemId) ?? 0) + 1)
    return [...m].map(([id, k]) => ({ id, k, nombre: nombreDe(id), precio: precioDeItem(id) }))
  }

  // Lo que le toca a cada uno, línea por línea (sin redondear)
  const compartidos = c.modo === 'partes' ? c.consumos : c.consumos.filter((k) => !k.quien || !gente.includes(k.quien))
  const totalCompartido = compartidos.reduce((s, x) => s + precioDeItem(x.itemId), 0)
  const listaCompartida = agrupar(compartidos).map((x) => `${x.k > 1 ? `${x.k} × ` : ''}${x.nombre}`).join(', ')
  const crudas: LineaParte[][] = gente.map((g) => {
    const lineas: LineaParte[] = []
    if (saldoCancha) lineas.push({ texto: n === 1 ? 'La cancha' : `Su parte de la cancha (1/${n})`, monto: saldoCancha / n, tipo: 'cancha' })
    if (c.modo === 'persona')
      for (const x of agrupar(c.consumos.filter((k) => k.quien === g))) lineas.push({ texto: `${x.k > 1 ? `${x.k} × ` : ''}${x.nombre}`, monto: x.precio * x.k, tipo: 'suyo' })
    if (totalCompartido)
      lineas.push({
        texto: c.modo === 'partes' ? `${n === 1 ? 'Lo consumido' : `Su parte de lo consumido (1/${n})`}: ${listaCompartida}` : `${n === 1 ? 'Lo de todos' : `Su parte de lo de todos (1/${n})`}: ${listaCompartida}`,
        monto: totalCompartido / n,
        tipo: 'compartido',
      })
    return lineas
  })

  // Se redondea a $100 repartiendo justo (cada uno queda redondeado para arriba o para abajo) y entre todos suman exacto el total
  const crudos = crudas.map((l) => l.reduce((s, x) => s + x.monto, 0))
  const pisos = crudos.map((x) => Math.floor(x / 100) * 100)
  let sobra = total - pisos.reduce((s, x) => s + x, 0)
  const extra = new Array(n).fill(0)
  for (const i of crudos.map((_, i) => i).sort((a, b) => crudos[b] - pisos[b] - (crudos[a] - pisos[a]))) {
    if (sobra < 100) break
    extra[i] += 100
    sobra -= 100
  }
  extra[n - 1] += sobra
  const ideal = gente.map((g, i) => {
    const crudo = crudos[i]
    const monto = pisos[i] + extra[i]
    const lineas = crudas[i].map((l) => ({ ...l, monto: Math.round(l.monto) }))
    const suyo = lineas.filter((l) => l.tipo === 'suyo').map((l) => l.texto)
    const detalle = c.modo === 'partes' ? (n === 1 ? 'Toda la cancha y lo consumido' : `1/${n} de la cancha y lo consumido`) : suyo.length ? `Su parte de la cancha + ${suyo.join(', ')}` : 'Su parte de la cancha'
    return { nombre: g, ideal: Math.max(0, monto), lineas, detalle, redondeado: Math.abs(monto - crudo) >= 1 ? Math.round(crudo) : null }
  })

  // Lo que ya pagó cada uno se descuenta: si se cargó algo después de que alguien pagó, le queda la diferencia
  const partes = ideal.map((x) => {
    const pagado = c.pagos.filter((p) => p.nombre === x.nombre).reduce((s, p) => s + p.monto, 0)
    return { nombre: x.nombre, detalle: x.detalle, lineas: x.lineas, redondeado: x.redondeado, ideal: x.ideal, pagado, monto: Math.max(0, x.ideal - pagado) }
  })
  return { cuenta: c, saldoCancha, consumos, total, partes, pagado: c.pagos.reduce((s, p) => s + p.monto, 0) }
}

/** Cobra la parte de una persona. Cuando pagaron todos, el turno queda pagado y lo consumido pasa a ventas. */
export function cobrarParte(reservaId: string, nombre: string, monto: number, metodo: Metodo) {
  const c = cuentaDe(estado, reservaId)
  const nueva = { ...c, pagos: [...c.pagos, { nombre, monto, metodo, hora: ahoraMin() }] }
  const rep = repartoCuenta({ ...estado, cuentas: conCuenta(estado, nueva) }, reservaId)
  // Se cierra cuando lo cobrado cubre el total (la cancha y todo lo consumido)
  const completo = rep.pagado >= rep.total
  if (!completo) return guardar({ ...estado, cuentas: conCuenta(estado, nueva) })
  const ventas: Venta[] = c.consumos.map((x, i) => ({
    id: `v${Date.now()}${i}`, dia: hoyClave(), hora: x.hora, itemId: x.itemId, monto: productoDe(estado, x.itemId)?.precio ?? 0,
    metodo, cantidad: 1, reservaId, quien: x.quien ?? undefined,
  }))
  // Si la cancha ya estaba paga de antes (se pagó al llegar), queda como estaba: esta cuenta era solo lo consumido
  const r = estado.reservas.find((x) => x.id === reservaId)!
  const yaPaga = r.estado === 'pagada' && !r.porCuenta
  guardar({
    ...estado,
    cuentas: conCuenta(estado, { ...nueva, cerrada: true }),
    ventas: [...estado.ventas, ...ventas],
    reservas: yaPaga ? estado.reservas : estado.reservas.map((x) => (x.id === reservaId ? { ...x, estado: 'pagada' as const, porCuenta: true, metodo } : x)),
  })
}

// ——— Inventario y caja ———
export function cargarCompra(proveedor: string, items: { insumoId: string; cantidad: number; costo: number }[], metodo: Metodo) {
  const id = `co${Date.now()}`
  const total = Math.round(items.reduce((s, x) => s + x.cantidad * x.costo, 0))
  const stock = { ...estado.stock }
  items.forEach((x) => (stock[x.insumoId] = (stock[x.insumoId] ?? 0) + x.cantidad))
  // Si el proveedor cambió el precio, el costo del insumo se actualiza y las recetas se recalculan solas
  const insumos = estado.insumos.map((i) => {
    const it = items.find((x) => x.insumoId === i.id)
    return it && it.costo !== i.costo ? { ...i, costo: it.costo } : i
  })
  guardar({
    ...estado,
    stock,
    insumos,
    compras: [...estado.compras, { id, dia: hoyClave(), proveedor, items, total, metodo }],
    gastos: [...estado.gastos, { id: `g${Date.now()}`, dia: hoyClave(), hora: ahoraMin(), categoria: 'Mercadería', concepto: `Compra a ${proveedor}`, monto: total, metodo, compraId: id }],
    movimientos: [
      ...estado.movimientos,
      ...items.map((x, i) => ({ id: `m${Date.now()}${i}`, dia: hoyClave(), hora: ahoraMin(), insumoId: x.insumoId, cantidad: x.cantidad, motivo: 'compra' as const, detalle: proveedor })),
    ],
  })
}
export function ajustarStock(insumoId: string, contado: number, detalle = 'Conteo físico') {
  const dif = contado - (estado.stock[insumoId] ?? 0)
  if (!dif) return
  guardar({
    ...estado,
    stock: { ...estado.stock, [insumoId]: contado },
    movimientos: [...estado.movimientos, { id: `m${Date.now()}`, dia: hoyClave(), hora: ahoraMin(), insumoId, cantidad: dif, motivo: 'ajuste', detalle }],
  })
}
export const registrarGasto = (g: Omit<Gasto, 'id' | 'dia' | 'hora'>) =>
  guardar({ ...estado, gastos: [...estado.gastos, { ...g, id: `g${Date.now()}`, dia: hoyClave(), hora: ahoraMin() }] })
export const registrarRetiro = (x: Omit<Retiro, 'id' | 'dia' | 'hora'>) =>
  guardar({ ...estado, retiros: [...estado.retiros, { ...x, id: `rt${Date.now()}`, dia: hoyClave(), hora: ahoraMin() }] })
export const cerrarCaja = (dia: string, contado: number, cajero: string) =>
  guardar({ ...estado, cierres: [...estado.cierres.filter((c) => c.dia !== dia), { dia, apertura: aperturaDe(estado, dia)?.monto ?? negocio.cajaInicial, contado, hora: ahoraMin(), cajero, abrio: aperturaDe(estado, dia)?.hora ?? 480 }] })

export const pedirFijo = (s: Omit<Solicitud, 'id' | 'creada'>) =>
  guardar({ ...estado, solicitudes: [...estado.solicitudes, { ...s, id: `s${Date.now()}`, creada: hoyClave() }] })

/** Acepta una solicitud: crea el turno fijo y reserva las próximas 4 semanas en la cancha libre. */
export function aceptarSolicitud(id: string, canchaId: string) {
  const s = estado.solicitudes.find((x) => x.id === id)
  if (!s) return
  const fijo: Fijo = { id: `f${Date.now()}`, canchaId, dow: s.dow, inicio: s.inicio, titular: s.nombre, telefono: s.telefono, desde: hoyClave() }
  const nuevas: Reserva[] = []
  for (let d = 0; d < 28; d++) {
    const dia = sumarDias(hoyClave(), d)
    if (deClave(dia).getDay() !== s.dow) continue
    if (ocupada(estado, canchaId, dia, s.inicio)) continue
    nuevas.push({ id: `r${Date.now()}${d}`, canchaId, dia, inicio: s.inicio, titular: s.nombre, telefono: s.telefono, precio: precioDe(s.inicio), seña: 0, estado: 'señada', origen: 'fijo', fijoId: fijo.id })
  }
  guardar({ ...estado, fijos: [...estado.fijos, fijo], reservas: [...estado.reservas, ...nuevas], solicitudes: estado.solicitudes.filter((x) => x.id !== id) })
}
export const rechazarSolicitud = (id: string) => guardar({ ...estado, solicitudes: estado.solicitudes.filter((x) => x.id !== id) })
export const darDeBajaFijo = (id: string) =>
  guardar({
    ...estado,
    fijos: estado.fijos.filter((f) => f.id !== id),
    reservas: estado.reservas.map((x) => (x.fijoId === id && x.dia >= hoyClave() && x.estado !== 'pagada' ? { ...x, estado: 'cancelada' } : x)),
  })

export const crearCompetencia = (c: Competencia) => guardar({ ...estado, competencias: [...estado.competencias, c] })
export const borrarCompetencia = (id: string) => guardar({ ...estado, competencias: estado.competencias.filter((c) => c.id !== id) })
export const cargarResultado = (competenciaId: string, partidoId: string, sets: Sets | undefined) =>
  guardar({
    ...estado,
    competencias: estado.competencias.map((c) =>
      c.id === competenciaId ? { ...c, partidos: c.partidos.map((p) => (p.id === partidoId ? { ...p, sets } : p)) } : c,
    ),
  })

// ——— Consultas ———

export type LineaCaja = { id: string; hora: number; tipo: 'cancha' | 'cantina' | 'gasto' | 'retiro'; concepto: string; detalle: string; metodo: Metodo; monto: number; reserva?: string; venta?: string; anulada?: boolean }

export function productoDe(e: Pick<Estado, 'productos'>, id: string) {
  return e.productos.find((x) => x.id === id)
}
export function insumoDe(e: Pick<Estado, 'insumos'>, id: string) {
  return e.insumos.find((x) => x.id === id)
}

/** Todo lo que entró y salió de la caja en un día. Los gastos y retiros van en negativo. */
export function movimientosCaja(e: Estado, dia: string): LineaCaja[] {
  const cancha = (id: string) => negocio.canchas.find((c) => c.id === id)!.nombre
  const lineas: LineaCaja[] = []
  for (const r of e.reservas.filter((x) => x.dia === dia && x.estado !== 'cancelada')) {
    if (r.seña > 0)
      lineas.push({ id: `s${r.id}`, hora: dia === hoyClave() ? Math.min(Math.max(480, r.inicio - 120), Math.max(480, ahoraMin())) : Math.max(480, r.inicio - 120), tipo: 'cancha', concepto: `${cancha(r.canchaId)} · ${r.titular}`, detalle: 'Seña del turno', metodo: 'transferencia', monto: r.seña, reserva: r.id })
    if (r.estado === 'pagada' && !r.porCuenta)
      lineas.push({ id: r.id, hora: r.inicio + negocio.duracion, tipo: 'cancha', concepto: `${cancha(r.canchaId)} · ${r.titular}`, detalle: 'Saldo del turno', metodo: r.metodo ?? 'efectivo', monto: r.precio - r.seña, reserva: r.id })
  }
  for (const c of e.cuentas) {
    const r = e.reservas.find((x) => x.id === c.reservaId)
    if (!r || r.dia !== dia) continue
    c.pagos.forEach((p, i) =>
      lineas.push({ id: `p${c.reservaId}${i}`, hora: p.hora, tipo: 'cancha', concepto: `${cancha(r.canchaId)} · ${p.nombre}`, detalle: 'Su parte de la cancha y la cantina', metodo: p.metodo, monto: p.monto, reserva: r.id }),
    )
  }
  for (const v of e.ventas.filter((x) => x.dia === dia && !x.reservaId)) {
    const it = productoDe(e, v.itemId)
    const n = v.cantidad ?? 1
    const detalle = v.anulada ? `Anulada: ${v.anulada.toLowerCase()}` : v.cortesia ? 'Invita la casa' : v.descuento ? `Cantina · ${v.descuento} % de descuento` : `Cantina · ${it?.categoria ?? ''}`
    lineas.push({ id: v.id, hora: v.hora, tipo: 'cantina', concepto: `${n > 1 ? `${n} × ` : ''}${it?.nombre ?? v.itemId}`, detalle, metodo: v.metodo, monto: v.anulada || v.cortesia ? 0 : v.monto, venta: v.id, anulada: !!v.anulada })
  }
  for (const g of e.gastos.filter((x) => x.dia === dia))
    lineas.push({ id: g.id, hora: g.hora, tipo: 'gasto', concepto: g.concepto, detalle: g.categoria, metodo: g.metodo, monto: -g.monto })
  for (const x of (e.retiros ?? []).filter((k) => k.dia === dia))
    lineas.push({ id: x.id, hora: x.hora, tipo: 'retiro', concepto: x.motivo, detalle: `${x.tipo === 'retiro' ? 'Retiro' : 'Ingreso'} de efectivo · ${x.quien}`, metodo: 'efectivo', monto: x.tipo === 'retiro' ? -x.monto : x.monto })
  return lineas.sort((a, b) => b.hora - a.hora)
}

/** Lo que tendría que haber en efectivo en la caja al cerrar. */
export function efectivoEsperado(e: Estado, dia: string) {
  return (aperturaDe(e, dia)?.monto ?? negocio.cajaInicial) + movimientosCaja(e, dia).filter((l) => l.metodo === 'efectivo').reduce((s, l) => s + l.monto, 0)
}

/** El resumen de un día de caja: lo que entró, lo que salió (sin contar retiros, que no son gastos) y el arqueo. */
export function resumenCaja(e: Estado, dia: string) {
  const lineas = movimientosCaja(e, dia)
  const ventas = lineas.filter((l) => l.monto > 0 && l.tipo !== 'retiro')
  const salidas = lineas.filter((l) => l.monto < 0 && l.tipo !== 'retiro')
  const retiros = lineas.filter((l) => l.tipo === 'retiro')
  const entro = ventas.reduce((s, l) => s + l.monto, 0)
  const salio = -salidas.reduce((s, l) => s + l.monto, 0) || 0
  // Lo que se consumió en las canchas se cobra junto con el turno, pero es plata de la cantina
  const consumidoEnCanchas = e.ventas.filter((v) => v.dia === dia && v.reservaId && !v.anulada).reduce((s, v) => s + v.monto, 0)
  const canchas = Math.max(0, ventas.filter((l) => l.tipo === 'cancha').reduce((s, l) => s + l.monto, 0) - consumidoEnCanchas)
  const esperado = efectivoEsperado(e, dia)
  const cierre = e.cierres.find((c) => c.dia === dia)
  return { lineas, ventas, salidas, retiros, entro, salio, canchas, cantina: entro - canchas, esperado, cierre, diferencia: cierre ? cierre.contado - esperado : null }
}

/**
 * Lo que se descuenta del stock al vender `veces` unidades de un producto.
 * Abre los combos (productos dentro de productos) y suma la merma de cada insumo.
 */
export function explotarReceta(e: Pick<Estado, 'productos' | 'insumos'>, receta: LineaReceta[], veces = 1, prof = 0): { insumoId: string; cantidad: number }[] {
  const suma = new Map<string, number>()
  for (const l of receta) {
    if (l.productoId) {
      const p = productoDe(e, l.productoId)
      if (!p || prof > 3) continue
      for (const x of explotarReceta(e, p.receta, l.cantidad * veces, prof + 1)) suma.set(x.insumoId, (suma.get(x.insumoId) ?? 0) + x.cantidad)
    } else if (l.insumoId) {
      const merma = insumoDe(e, l.insumoId)?.merma ?? 0
      suma.set(l.insumoId, (suma.get(l.insumoId) ?? 0) + (l.cantidad / (1 - merma)) * veces)
    }
  }
  return [...suma].map(([insumoId, cantidad]) => ({ insumoId, cantidad: Math.round(cantidad * 10) / 10 }))
}
export function explotar(e: Pick<Estado, 'productos' | 'insumos'>, itemId: string, veces = 1) {
  return explotarReceta(e, productoDe(e, itemId)?.receta ?? [], veces)
}

/** Costo de una receta (aunque no esté guardada todavía), su margen y para cuántos alcanza el stock de hoy. */
export function costeoReceta(e: Estado, receta: LineaReceta[], precio: number) {
  const lineas = explotarReceta(e, receta)
  const costo = lineas.reduce((s, l) => s + l.cantidad * (insumoDe(e, l.insumoId)?.costo ?? 0), 0)
  let alcanza = Infinity
  let limita: string | null = null
  for (const l of lineas) {
    const n = Math.max(0, Math.floor((e.stock[l.insumoId] ?? 0) / l.cantidad))
    if (n < alcanza) {
      alcanza = n
      limita = l.insumoId
    }
  }
  return { costo, margen: precio ? (precio - costo) / precio : 0, ganancia: precio - costo, foodCost: precio ? costo / precio : 0, alcanza, limita }
}
export function costeo(e: Estado, itemId: string) {
  const it = productoDe(e, itemId)
  return costeoReceta(e, it?.receta ?? [], it?.precio ?? 0)
}

/** Unidades vendidas de cada producto desde un día (incluye lo consumido en las canchas). */
export function vendidosDesde(e: Estado, desde: string) {
  const m = new Map<string, number>()
  for (const v of e.ventas) if (v.dia >= desde && !v.anulada) m.set(v.itemId, (m.get(v.itemId) ?? 0) + (v.cantidad ?? 1))
  return m
}

export const ocupada = (e: Estado, canchaId: string, dia: string, inicio: number) =>
  e.reservas.some((x) => x.canchaId === canchaId && x.dia === dia && x.inicio === inicio && x.estado !== 'cancelada')

export function libres(e: Estado, dia: string) {
  const minimo = dia === hoyClave() ? ahoraMin() + 10 : 0
  return negocio.turnos.flatMap((inicio) =>
    inicio < minimo ? [] : negocio.canchas.filter((c) => !ocupada(e, c.id, dia, inicio)).map((c) => ({ inicio, cancha: c })),
  )
}
