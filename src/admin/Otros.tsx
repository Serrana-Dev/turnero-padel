import { useMemo, useState } from 'react'
import { negocio } from '../config/negocio'
import { capital, deClave, diaMes, fechaCorta, fechaLarga, hora, hoyClave, pct, pesos, sumarDias } from '../lib/formato'
import { aceptarSolicitud, darDeBajaFijo, metodos, ocupada, rechazarSolicitud, useDatos, vender, type Metodo } from '../lib/datos'
import { usePanel } from './Panel'

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
      <div className="titulo-fila">
        <div>
          <h1>Turnos fijos</h1>
          <p>{e.fijos.length} parejas juegan todas las semanas · unos {pesos(ingresoMensual)} asegurados por mes</p>
        </div>
      </div>

      {e.solicitudes.length > 0 && (
        <section className="tarjeta tarjeta-destacada">
          <div className="tarjeta-cabeza"><h2>Pedidos desde la web</h2></div>
          <table className="tabla">
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

      <table className="tabla">
        <thead><tr><th>Día</th><th className="num">Hora</th><th>Cancha</th><th>Titular</th><th>Desde</th><th /></tr></thead>
        <tbody>
          {ordenados.map((f) => (
            <tr key={f.id}>
              <td>{dias[f.dow]}</td>
              <td className="num">{hora(f.inicio)}</td>
              <td>{negocio.canchas.find((c) => c.id === f.canchaId)!.nombre}</td>
              <td><strong>{f.titular}</strong><small>{f.telefono}</small></td>
              <td>{capital(fechaCorta(f.desde))} {f.desde.slice(0, 4)}</td>
              <td className="num"><button className="boton boton-chico" onClick={() => darDeBajaFijo(f.id)}>Dar de baja</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ——— Caja y cantina ———

export function Caja() {
  const e = useDatos()
  const { verReserva } = usePanel()
  const hoy = hoyClave()
  const [dia, setDia] = useState(hoy)
  const [metodo, setMetodo] = useState<Metodo>('mercadopago')

  const lineas = useMemo(() => {
    const deReservas = e.reservas
      .filter((r) => r.dia === dia && r.estado !== 'cancelada' && (r.estado === 'pagada' || r.seña > 0))
      .map((r) => ({
        id: r.id, reserva: r.id, hora: r.inicio, concepto: `${negocio.canchas.find((c) => c.id === r.canchaId)!.nombre} · ${r.titular}`,
        detalle: r.estado === 'pagada' ? 'Turno completo' : 'Seña', metodo: (r.metodo ?? 'mercadopago') as Metodo,
        monto: r.estado === 'pagada' ? r.precio : r.seña,
      }))
    const deCantina = e.ventas.filter((v) => v.dia === dia).map((v) => ({
      id: v.id, reserva: undefined as string | undefined, hora: v.hora, concepto: negocio.cantina.find((c) => c.id === v.itemId)?.nombre ?? v.itemId,
      detalle: 'Cantina', metodo: v.metodo, monto: v.monto,
    }))
    return [...deReservas, ...deCantina].sort((a, b) => b.hora - a.hora)
  }, [e, dia])

  const total = lineas.reduce((s, l) => s + l.monto, 0)
  const canchas = lineas.filter((l) => l.reserva).reduce((s, l) => s + l.monto, 0)

  return (
    <div className="pantalla">
      <div className="titulo-fila">
        <div>
          <h1>Caja y cantina</h1>
          <p>{capital(fechaLarga(dia))}</p>
        </div>
        <div className="segmentos">
          <button onClick={() => setDia(sumarDias(dia, -1))} aria-label="Día anterior">←</button>
          <button className={dia === hoy ? 'activa' : ''} onClick={() => setDia(hoy)}>Hoy</button>
          <button onClick={() => setDia(sumarDias(dia, 1))} disabled={dia >= hoy} aria-label="Día siguiente">→</button>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi kpi-principal"><span>Total del día</span><strong>{pesos(total)}</strong><small>{pesos(canchas)} en canchas · {pesos(total - canchas)} en cantina</small></div>
        {(Object.keys(metodos) as Metodo[]).map((m) => (
          <div className="kpi" key={m}><span>{metodos[m]}</span><strong>{pesos(lineas.filter((l) => l.metodo === m).reduce((s, l) => s + l.monto, 0))}</strong><small>{lineas.filter((l) => l.metodo === m).length} movimientos</small></div>
        ))}
      </div>
      <section className="tarjeta">
        <div className="tarjeta-cabeza">
          <h2>Vender en la cantina</h2>
          <div className="segmentos">
            {(Object.keys(metodos) as Metodo[]).map((m) => <button key={m} className={metodo === m ? 'activa' : ''} onClick={() => setMetodo(m)}>{metodos[m]}</button>)}
          </div>
        </div>
        <div className="cantina">
          {negocio.cantina.map((it) => (
            <button key={it.id} className="boton" disabled={dia !== hoy} onClick={() => vender({ dia, hora: new Date().getHours() * 60 + new Date().getMinutes(), itemId: it.id, monto: it.precio, metodo })}>
              {it.nombre} <span className="tenue">{pesos(it.precio)}</span>
            </button>
          ))}
        </div>
      </section>
      <table className="tabla">
        <thead><tr><th className="num">Hora</th><th>Concepto</th><th>Medio</th><th className="num">Monto</th></tr></thead>
        <tbody>
          {lineas.map((l) => (
            <tr key={l.id} className={l.reserva ? 'fila-clic' : ''} onClick={() => l.reserva && verReserva(l.reserva)}>
              <td className="num">{hora(l.hora)}</td>
              <td><strong>{l.concepto}</strong><small>{l.detalle}</small></td>
              <td>{metodos[l.metodo]}</td>
              <td className="num">{pesos(l.monto)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td /><td>Total</td><td /><td className="num">{pesos(total)}</td></tr></tfoot>
      </table>
    </div>
  )
}

// ——— Reportes ———

export function Reportes() {
  const e = useDatos()
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
    const cantina = e.ventas.filter((v) => v.dia >= desde).reduce((s, v) => s + v.monto, 0)
    const origen = (['web', 'whatsapp', 'fijo'] as const).map((o) => ({ o, n: periodo.filter((x) => x.origen === o).length }))
    const siesta = calor.flatMap((f) => f.celdas.slice(3, 6))
    return { periodo, calor, porCancha, ingresos, ingresosAntes, cantina, origen, siesta: siesta.reduce((a, b) => a + b, 0) / siesta.length }
  }, [e, desde, hoy])

  const cambio = r.ingresosAntes ? (r.ingresos - r.ingresosAntes) / r.ingresosAntes : 0
  const ocupacion = r.periodo.length / (28 * negocio.canchas.length * negocio.turnos.length)
  const maxCancha = Math.max(...r.porCancha.map((x) => x.total))

  return (
    <div className="pantalla">
      <div className="titulo-fila">
        <div>
          <h1>Reportes</h1>
          <p>Últimas 4 semanas, del {diaMes(desde)} al {diaMes(hoy)}, contra las 4 anteriores</p>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><span>Ingresos por canchas</span><strong>{pesos(r.ingresos)}</strong><small className={cambio >= 0 ? 'bien' : 'mal'}>{cambio >= 0 ? '+' : '−'}{pct(Math.abs(cambio))} contra las 4 semanas anteriores</small></div>
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
              {f.celdas.map((v, i) => (
                <span key={i} className={`calor-celda ${v >= 0.55 ? 'calor-oscura' : ''}`} style={{ ['--v' as string]: v }} title={`${dias[f.dow]} ${hora(negocio.turnos[i])}: ${pct(v)}`}>
                  {Math.round(v * 100)}
                </span>
              ))}
            </div>
          ))}
        </div>
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
    </div>
  )
}
