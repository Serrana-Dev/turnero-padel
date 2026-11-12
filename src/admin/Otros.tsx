import { Cabecera, IconoProducto } from './comun'
import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { negocio } from '../config/negocio'
import { deClave, diaMes, hora, hoyClave, pct, pesos, sumarDias } from '../lib/formato'
import { aceptarSolicitud, costeo, darDeBajaFijo, insumoDe, metodos, movimientosCaja, ocupada, productoDe, rechazarSolicitud, useDatos, type Metodo } from '../lib/datos'

const mesCorto = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' })
const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ——— Turnos fijos ———

export function Fijos() {
  const e = useDatos()
  const [cancha, setCancha] = useState<Record<string, string>>({})
  const hoy = hoyClave()
  const ordenados = [...e.fijos].sort((a, b) => ((a.dow + 6) % 7) * 2000 + a.inicio - (((b.dow + 6) % 7) * 2000 + b.inicio))
  const ingresoMensual = e.fijos.reduce((s, f) => s + (f.inicio >= negocio.pico ? negocio.precios.pico : negocio.precios.valle) * 4, 0)

  // Para cada solicitud, la primera cancha libre las próximas 4 semanas
  const proximo = (dow: number) => {
    const d = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i)).find((x) => deClave(x).getDay() === dow)!
    return d
  }

  return (
    <div className="pantalla">
      <Cabecera seccion="canchas" titulo="Turnos fijos" cuentas={{ '/admin/fijos': e.solicitudes.length }} frase={<><strong>{e.fijos.length} parejas</strong> juegan todas las semanas: unos <strong>{pesos(ingresoMensual)}</strong> asegurados por mes.</>} />

      {e.solicitudes.length > 0 && (
        <section className="tarjeta tarjeta-destacada">
          <div className="tarjeta-cabeza"><h2>Pedidos desde la web</h2></div>
          <table className="tabla tabla-tarjetas tabla-pedidos">
            <thead><tr><th>Quién</th><th>Quiere</th><th>Cancha</th><th /></tr></thead>
            <tbody>
              {e.solicitudes.map((s) => {
                const dia = proximo(s.dow)
                const libresC = negocio.canchas.filter((c) => !ocupada(e, c.id, dia, s.inicio))
                const elegida = cancha[s.id] ?? libresC[0]?.id
                return (
                  <tr key={s.id}>
                    <td><strong>{s.nombre}</strong><small>{s.telefono} · pedido {s.creada === hoy ? 'hoy' : diaMes(s.creada)}</small></td>
                    <td>{dias[s.dow]} a las {hora(s.inicio)}</td>
                    <td>
                      {libresC.length ? (
                        <select className="select-chico" value={elegida} onChange={(ev) => setCancha({ ...cancha, [s.id]: ev.target.value })} aria-label="Cancha">
                          {libresC.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      ) : <span className="mal">Ese horario está completo</span>}
                    </td>
                    <td className="num">
                      <span className="acciones-fila">
                        <button className="boton boton-chico" onClick={() => rechazarSolicitud(s.id)}>Rechazar</button>
                        <button className="boton boton-chico boton-primario" disabled={!elegida} onClick={() => elegida && aceptarSolicitud(s.id, elegida)}>Aceptar</button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="ayuda">Al aceptar, se reservan solas las próximas cuatro semanas.</p>
        </section>
      )}

      <div className="fijos-semana">
        {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const delDia = ordenados.filter((f) => f.dow === dow)
          if (!delDia.length) return null
          return (
            <section key={dow} className="fijos-dia">
              <h2>{dias[dow]} <span>{delDia.length} {delDia.length === 1 ? 'turno' : 'turnos'}</span></h2>
              <ul>
                {delDia.map((f) => (
                  <li key={f.id}>
                    <span className="fijo-hora">{hora(f.inicio)}</span>
                    <span className="fijo-texto">
                      <strong>{f.titular}</strong>
                      <small>{negocio.canchas.find((c) => c.id === f.canchaId)!.nombre} · desde {mesCorto.format(deClave(f.desde)).replace('.', '')}</small>
                      <small>{f.telefono}</small>
                    </span>
                    <button className="boton boton-chico" onClick={() => darDeBajaFijo(f.id)}>Dar de baja</button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

// ——— Reportes ———

export function Reportes() {
  const e = useDatos()
  const [sel, setSel] = useState<{ dow: number; i: number } | null>(null)
  const hoy = hoyClave()
  const desde = sumarDias(hoy, -27)

  const r = useMemo(() => {
    const periodo = e.reservas.filter((x) => x.dia >= desde && x.dia <= hoy && x.estado !== 'cancelada')
    const antes = e.reservas.filter((x) => x.dia >= sumarDias(desde, -28) && x.dia < desde && x.estado !== 'cancelada')
    // Mapa de calor: día de semana × turno
    const orden = [1, 2, 3, 4, 5, 6, 0]
    const calor = orden.map((dow) => {
      const fechas = Array.from({ length: 28 }, (_, i) => sumarDias(desde, i)).filter((d) => deClave(d).getDay() === dow)
      return {
        dow,
        celdas: negocio.turnos.map((t) => {
          const n = periodo.filter((x) => x.inicio === t && fechas.includes(x.dia)).length
          return n / (fechas.length * negocio.canchas.length)
        }),
      }
    })
    const porCancha = negocio.canchas.map((c) => {
      const suyas = periodo.filter((x) => x.canchaId === c.id)
      return { c, n: suyas.length, total: suyas.reduce((s, x) => s + x.precio, 0) }
    })
    const ingresos = periodo.reduce((s, x) => s + x.precio, 0)
    const ingresosAntes = antes.reduce((s, x) => s + x.precio, 0)
    const cantina = e.ventas.filter((v) => v.dia >= desde && !v.anulada).reduce((s, v) => s + v.monto, 0)
    const origen = (['web', 'whatsapp', 'fijo'] as const).map((o) => ({ o, n: periodo.filter((x) => x.origen === o).length }))
    const siesta = calor.flatMap((f) => f.celdas.slice(3, 6))
    const fechasDe = (dow: number) => Array.from({ length: 28 }, (_, i) => sumarDias(desde, i)).filter((d) => deClave(d).getDay() === dow)
    return { periodo, calor, porCancha, ingresos, ingresosAntes, cantina, origen, fechasDe, siesta: siesta.reduce((a, b) => a + b, 0) / siesta.length }
  }, [e, desde, hoy])

  const cambio = r.ingresosAntes ? (r.ingresos - r.ingresosAntes) / r.ingresosAntes : 0
  const ocupacion = r.periodo.length / (28 * negocio.canchas.length * negocio.turnos.length)
  const maxCancha = Math.max(...r.porCancha.map((x) => x.total))

  return (
    <div className="pantalla">
      <Cabecera seccion="plata" titulo="Reportes" frase={<>Últimas 4 semanas, del {diaMes(desde)} al {diaMes(hoy)}, contra las 4 anteriores.</>}>
        <button className="boton boton-primario" onClick={() => descargarExcel(e, desde, hoy)}><Download size={16} aria-hidden="true" /> Descargar Excel</button>
      </Cabecera>
      <div className="kpis">
        <div className="kpi"><span>Facturado en canchas</span><strong>{pesos(r.ingresos)}</strong><small className={Math.abs(cambio) < 0.005 ? '' : cambio > 0 ? 'bien' : 'mal'}>{Math.abs(cambio) < 0.005 ? 'Igual que las 4 semanas anteriores' : `${cambio > 0 ? '+' : '−'}${pct(Math.abs(cambio))} contra las 4 semanas anteriores`}</small></div>
        <div className="kpi"><span>Ocupación</span><strong>{pct(ocupacion)}</strong><small>{r.periodo.length} turnos jugados o reservados</small></div>
        <div className="kpi"><span>Cantina</span><strong>{pesos(r.cantina)}</strong><small>{pct(r.cantina / (r.ingresos + r.cantina))} de lo facturado</small></div>
        <div className="kpi"><span>Siesta (12:30 a 17:00)</span><strong className="mal">{pct(r.siesta)}</strong><small>ocupación: horario para promocionar</small></div>
      </div>

      <section className="tarjeta">
        <div className="tarjeta-cabeza">
          <h2>Ocupación por día y horario</h2>
          <p className="ayuda">Más oscuro, más lleno.</p>
        </div>
        <div className="calor" style={{ ['--turnos' as string]: negocio.turnos.length }}>
          <span />
          {negocio.turnos.map((t) => <span key={t} className="calor-hora">{hora(t)}</span>)}
          {r.calor.map((f) => (
            <div key={f.dow} className="calor-fila">
              <span className="calor-dia">{dias[f.dow].slice(0, 3)}</span>
              {f.celdas.map((v, i) => {
                const elegida = sel?.dow === f.dow && sel.i === i
                const total = r.fechasDe(f.dow).length * negocio.canchas.length
                return (
                  <button
                    key={i}
                    className={`calor-celda ${v >= 0.55 ? 'calor-oscura' : ''} ${elegida ? 'calor-elegida' : ''}`}
                    style={{ ['--v' as string]: v }}
                    onClick={() => setSel(elegida ? null : { dow: f.dow, i })}
                    aria-label={`${dias[f.dow]} ${hora(negocio.turnos[i])}: ${pct(v)} ocupado. Ver detalle`}
                  >
                    {Math.round(v * 100)}
                    <span className="calor-tip" role="tooltip">
                      <strong>{dias[f.dow]} {hora(negocio.turnos[i])}</strong>
                      {pct(v)} ocupado · {Math.round(v * total)} de {total} turnos
                      <em>Tocá para ver el detalle</em>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {sel ? <DetalleHorario dow={sel.dow} inicio={negocio.turnos[sel.i]} desde={desde} hoy={hoy} cerrar={() => setSel(null)} /> : <p className="ayuda calor-pista">Pasá el mouse o tocá un cuadro para ver el detalle de ese horario.</p>}
      </section>

      <div className="grilla-2">
        <section className="tarjeta">
          <div className="tarjeta-cabeza"><h2>Por cancha</h2></div>
          <ul className="ranking">
            {r.porCancha.map((x) => (
              <li key={x.c.id}>
                <span className="ranking-nombre">{x.c.nombre}<small>{x.n} turnos · {x.c.techada ? 'techada' : 'aire libre'}</small></span>
                <span className="ranking-barra"><span style={{ width: `${(x.total / maxCancha) * 100}%` }} /></span>
                <span className="ranking-valor">{pesos(x.total)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="tarjeta">
          <div className="tarjeta-cabeza"><h2>Cómo reservan</h2></div>
          <ul className="ranking">
            {r.origen.map((x) => (
              <li key={x.o}>
                <span className="ranking-nombre">{x.o === 'web' ? 'Web' : x.o === 'whatsapp' ? 'WhatsApp' : 'Turno fijo'}</span>
                <span className="ranking-barra ranking-gris"><span style={{ width: `${(x.n / r.periodo.length) * 100}%` }} /></span>
                <span className="ranking-valor">{pct(x.n / r.periodo.length)}</span>
              </li>
            ))}
          </ul>
          <p className="ayuda">Cada reserva por la web es un WhatsApp menos para contestar.</p>
        </section>
      </div>
      <ReporteCantina desde={desde} hoy={hoy} />
    </div>
  )
}

/** El detalle de un horario del mapa: cuánto se llena, cuánto deja, quién reserva y qué hacer. */
function DetalleHorario({ dow, inicio, desde, hoy, cerrar }: { dow: number; inicio: number; desde: string; hoy: string; cerrar: () => void }) {
  const e = useDatos()
  const fechas = Array.from({ length: 28 }, (_, i) => sumarDias(desde, i)).filter((d) => deClave(d).getDay() === dow && d <= hoy)
  const delHorario = e.reservas.filter((x) => x.inicio === inicio && fechas.includes(x.dia) && x.estado !== 'cancelada')
  const capacidad = fechas.length * negocio.canchas.length
  const ocupacion = capacidad ? delHorario.length / capacidad : 0
  const facturado = delHorario.reduce((s, x) => s + x.precio, 0)
  const cantina = e.ventas.filter((v) => fechas.includes(v.dia) && v.hora >= inicio && v.hora < inicio + negocio.duracion && !v.anulada).reduce((s, v) => s + v.monto, 0)
  const porCancha = negocio.canchas.map((c) => ({ c, n: delHorario.filter((x) => x.canchaId === c.id).length }))
  const maxC = Math.max(...porCancha.map((x) => x.n), 1)
  const origen = (['web', 'whatsapp', 'fijo'] as const).map((o) => ({ o, n: delHorario.filter((x) => x.origen === o).length }))
  // Los que más vienen a esa hora
  const veces = new Map<string, number>()
  for (const x of delHorario) veces.set(x.titular, (veces.get(x.titular) ?? 0) + 1)
  const fieles = [...veces].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const consejo =
    ocupacion >= 0.85 ? 'Se llena casi siempre: podés subir un poco la tarifa o abrir lista de espera.'
    : ocupacion >= 0.55 ? 'Buen horario: conviene ofrecerlo como turno fijo a los que vienen seguido.'
    : ocupacion >= 0.3 ? 'Horario a medias: una promo por WhatsApp a los clientes de siempre lo puede llenar.'
    : 'Horario flojo: probá una tarifa más baja, clases o un americano para ocupar las canchas.'
  return (
    <section className="detalle-horario" aria-label="Detalle del horario">
      <header>
        <div>
          <h3>{dias[dow]} a las {hora(inicio)}</h3>
          <p>Últimas 4 semanas · {fechas.length} {fechas.length === 1 ? 'día' : 'días'}</p>
        </div>
        <button className="btn-icono" onClick={cerrar} aria-label="Cerrar el detalle">×</button>
      </header>
      <div className="detalle-numeros">
        <div className="detalle-grande"><span>Ocupación</span><strong>{pct(ocupacion)}</strong><small>{delHorario.length} de {capacidad} turnos</small></div>
        <div><span>Facturado en canchas</span><strong>{pesos(facturado)}</strong><small>{pesos(fechas.length ? facturado / fechas.length : 0)} por día</small></div>
        <div><span>Cantina en ese horario</span><strong>{pesos(cantina)}</strong><small>lo que se vendió mientras jugaban</small></div>
      </div>
      <div className="detalle-cols">
        <div>
          <h4>La cancha más pedida</h4>
          <ul className="detalle-barras">
            {porCancha.map((x) => (
              <li key={x.c.id}><span>{x.c.nombre}</span><i><b style={{ width: `${(x.n / maxC) * 100}%` }} /></i><strong>{x.n}</strong></li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Cómo reservaron</h4>
          <ul className="detalle-barras">
            {origen.map((x) => (
              <li key={x.o}><span>{x.o === 'web' ? 'Web' : x.o === 'whatsapp' ? 'WhatsApp' : 'Turno fijo'}</span><i><b style={{ width: `${delHorario.length ? (x.n / delHorario.length) * 100 : 0}%` }} /></i><strong>{x.n}</strong></li>
            ))}
          </ul>
          {fieles.length > 0 && <p className="detalle-fieles">Vienen seguido: {fieles.map(([n, k]) => `${n.split(' ')[0]} (${k})`).join(', ')}</p>}
        </div>
      </div>
      <p className="detalle-consejo">{consejo}</p>
    </section>
  )
}

/** La cantina en el período: qué se vende, cuánto deja, cómo pagan y lo que se pierde. */
function ReporteCantina({ desde, hoy }: { desde: string; hoy: string }) {
  const e = useDatos()
  const ventas = e.ventas.filter((v) => v.dia >= desde && v.dia <= hoy && !v.anulada)
  const porProd = new Map<string, { n: number; plata: number }>()
  for (const v of ventas) {
    const x = porProd.get(v.itemId) ?? { n: 0, plata: 0 }
    x.n += v.cantidad ?? 1
    x.plata += v.monto
    porProd.set(v.itemId, x)
  }
  const ranking = [...porProd].map(([id, x]) => ({ p: productoDe(e, id), ...x, deja: x.n * costeo(e, id).ganancia })).filter((x) => x.p).sort((a, b) => b.plata - a.plata).slice(0, 8)
  const max = Math.max(...ranking.map((x) => x.plata), 1)
  const porMetodo = (Object.keys(metodos) as Metodo[]).map((m) => ({ m, t: ventas.filter((v) => v.metodo === m && !v.reservaId).reduce((s, v) => s + v.monto, 0) }))
  const totalMet = porMetodo.reduce((s, x) => s + x.t, 0) || 1
  const cortesias = ventas.filter((v) => v.cortesia).reduce((s, v) => s + (v.cantidad ?? 1) * costeo(e, v.itemId).costo, 0)
  const mermas = e.movimientos.filter((m) => m.motivo === 'merma' && m.dia >= desde).reduce((s, m) => s + Math.abs(m.cantidad) * (insumoDe(e, m.insumoId)?.costo ?? 0), 0)
  const anuladas = e.ventas.filter((v) => v.dia >= desde && v.anulada).length
  return (
    <div className="grilla-2">
      <section className="tarjeta">
        <div className="tarjeta-cabeza"><h2>Lo más vendido de la cantina</h2><span className="tenue">plata que entró · lo que deja</span></div>
        <ul className="ranking ranking-cantina">
          {ranking.map((x) => (
            <li key={x.p!.id}>
              <span className="ranking-nombre"><IconoProducto p={x.p!} tam={26} icono={14} /> {x.p!.nombre}<small>{x.n} u. · deja {pesos(x.deja)}</small></span>
              <span className="ranking-barra"><span style={{ width: `${(x.plata / max) * 100}%` }} /></span>
              <span className="ranking-valor">{pesos(x.plata)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="tarjeta">
        <div className="tarjeta-cabeza"><h2>Cómo pagan en el mostrador</h2></div>
        <div className="apilada">
          {porMetodo.map((x) => <i key={x.m} style={{ flexGrow: x.t, background: x.m === 'efectivo' ? '#e2f24b' : '#2f6fd6' }} />)}
        </div>
        <ul className="lista-simple">
          {porMetodo.map((x) => <li key={x.m}><span>{metodos[x.m]}</span><strong>{pesos(x.t)} · {pct(x.t / totalMet)}</strong></li>)}
        </ul>
        <div className="tarjeta-cabeza tarjeta-cabeza-sep"><h2>Lo que no entró</h2></div>
        <ul className="lista-simple">
          <li><span>Invitó la casa<small>a costo de los insumos</small></span><strong>{pesos(cortesias)}</strong></li>
          <li><span>Mermas<small>lo que se venció o se cayó</small></span><strong>{pesos(mermas)}</strong></li>
          <li><span>Ventas anuladas<small>con motivo, en la caja de cada día</small></span><strong>{anuladas}</strong></li>
        </ul>
      </section>
    </div>
  )
}

/** Baja un Excel (CSV) con todos los movimientos de caja del período, listo para el contador. */
function descargarExcel(e: ReturnType<typeof useDatos>, desde: string, hasta: string) {
  const filas = [['Fecha', 'Hora', 'Tipo', 'Concepto', 'Detalle', 'Medio de pago', 'Monto']]
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
    for (const l of [...movimientosCaja(e, d)].reverse()) {
      filas.push([d, hora(l.hora), l.tipo === 'cancha' ? 'Cancha' : l.tipo === 'cantina' ? 'Cantina' : l.tipo === 'gasto' ? 'Gasto' : 'Retiro/ingreso', l.concepto, l.detalle, metodos[l.metodo], String(l.monto)])
    }
  }
  const csv = '\ufeff' + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `caja-${desde}-al-${hasta}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
