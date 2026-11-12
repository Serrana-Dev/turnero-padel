// La cuenta de la cancha: lo que consumieron los que juegan, dividido en partes iguales o cada uno lo suyo.
import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import type { Categoria } from '../config/negocio'
import { agregarConsumo, ajustarCuenta, cobrarParte, cuantosJuegan, metodos, quitarConsumo, reabrirCaja, renombrarJugador, repartoCuenta, useDatos, type Metodo } from '../lib/datos'
import { hora, hoyClave, pesos } from '../lib/formato'
import { negocio } from '../config/negocio'
import { abrirWhatsApp, Buscador, categorias, coincide, IconoProducto, Vuelto } from './comun'

/** Los que juegan, con el nombre editable ahí mismo. */
function Jugadores({ reservaId, bloqueado }: { reservaId: string; bloqueado: boolean }) {
  const e = useDatos()
  const c = repartoCuenta(e, reservaId).cuenta
  return (
    <div className="jugadores-editables">
      {c.nombres.map((n, i) => {
        const pago = c.pagos.some((p) => p.nombre === n)
        return (
          <label key={n} className={`jugador-campo ${i === 0 ? 'jugador-titular' : ''}`}>
            <span className="jugador-avatar" aria-hidden="true">{n.startsWith('Jugador') ? i + 1 : n[0]}</span>
            <input
              defaultValue={n.startsWith('Jugador') ? '' : n}
              placeholder={`Jugador ${i + 1}`}
              disabled={bloqueado || pago}
              aria-label={`Nombre del jugador ${i + 1}`}
              onBlur={(ev) => renombrarJugador(reservaId, n, ev.target.value || n)}
              onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
            />
            {pago && <Check size={14} aria-label="Pagó" />}
          </label>
        )
      })}
    </div>
  )
}

export function CuentaConsumos({ reservaId }: { reservaId: string }) {
  const e = useDatos()
  const r = e.reservas.find((x) => x.id === reservaId)!
  const c = repartoCuenta(e, reservaId).cuenta
  const [para, setPara] = useState<string | null>(null)
  const [cat, setCat] = useState<Categoria>('Bebidas')
  const [q, setQ] = useState('')
  const [aviso, setAviso] = useState<{ texto: string; n: number } | null>(null)
  const cerrada = !!c.cerrada || (r.estado === 'pagada' && !!r.porCuenta)
  const prod = (id: string) => e.productos.find((x) => x.id === id)
  // Si se renombró al que estaba elegido, se vuelve a "Para todos"
  const a = para && c.nombres.includes(para) ? para : null
  const cargar = (itemId: string) => {
    agregarConsumo(reservaId, itemId, a)
    setAviso({ texto: `${prod(itemId)?.nombre} cargado ${a ? `a ${a}` : 'para todos'}`, n: (aviso?.n ?? 0) + 1 })
  }
  const cuantos = (itemId: string) => c.consumos.filter((x) => x.itemId === itemId).length
  const total = c.consumos.reduce((s, x) => s + (prod(x.itemId)?.precio ?? 0), 0)

  return (
    <section className="cuenta-cancha" aria-label="Consumos de la cancha">
      <h3 className="cuenta-sub">Quiénes juegan</h3>
      <Jugadores reservaId={reservaId} bloqueado={cerrada} />

      {!cerrada && (
        <>
          <h3 className="cuenta-sub">Cargar a</h3>
          <div className="chips-filtro">
            <button className={a === null ? 'activa' : ''} onClick={() => setPara(null)}>Para todos</button>
            {c.nombres.map((n) => <button key={n} className={a === n ? 'activa' : ''} onClick={() => setPara(n)}>{n}</button>)}
          </div>
          <Buscador valor={q} cambiar={setQ} texto="Buscar en la cantina" />
          {!q && (
            <div className="pestanas-chicas">
              {categorias.map((k) => <button key={k} className={cat === k ? 'activa' : ''} onClick={() => setCat(k)}>{k}</button>)}
            </div>
          )}
          {aviso && <p className="aviso-carga" role="status" key={aviso.n}>{aviso.texto}. Se cobra al terminar.</p>}
          <div className="productos-grilla productos-chicos">
            {e.productos.filter((x) => !x.pausado && (q ? coincide(x.nombre, q) : x.categoria === cat)).map((it) => (
              <button key={it.id} className="producto-boton" onClick={() => cargar(it.id)}>
                <IconoProducto p={it} tam={30} icono={16} />
                <span className="producto-boton-texto"><strong>{it.nombre}</strong><span>{pesos(it.precio)}</span></span>
                {cuantos(it.id) > 0 && <span className="producto-cuenta">{cuantos(it.id)}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className="cuenta-sub">Lo que consumieron {c.consumos.length > 0 && <span className="tenue">{pesos(total)}</span>}</h3>
      {c.consumos.length === 0 ? (
        <p className="ayuda">Todavía nada. Tocá un producto y queda cargado a la cancha: se cobra todo junto al final.</p>
      ) : (
        <ul className="consumos">
          {c.consumos.map((x) => {
            const p = prod(x.itemId)
            return (
              <li key={x.id}>
                {p && <IconoProducto p={p} tam={26} icono={14} />}
                <span className="consumo-nombre">{p?.nombre ?? x.itemId}<small>{hora(x.hora)}</small></span>
                <span className={`consumo-quien ${x.quien ? '' : 'todos'}`}>{x.quien ?? 'Todos'}</span>
                <span className="consumo-precio">{pesos(p?.precio ?? 0)}</span>
                {!cerrada && !c.pagos.length && <button className="btn-icono" aria-label="Quitar" onClick={() => quitarConsumo(reservaId, x.id)}><X size={14} /></button>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function CuentaCobro({ reservaId }: { reservaId: string }) {
  const e = useDatos()
  const r = e.reservas.find((x) => x.id === reservaId)!
  const rep = repartoCuenta(e, reservaId)
  const c = rep.cuenta
  const [metodo, setMetodo] = useState<Record<string, Metodo>>({})
  const [paga, setPaga] = useState<Record<string, number | null>>({})
  const [abierto, setAbierto] = useState<string | null>(null)
  const cerrada = !!c.cerrada || (r.estado === 'pagada' && !!r.porCuenta)
  const cajaCerrada = e.cierres.some((x) => x.dia === hoyClave())
  const bloqueado = cerrada || c.pagos.length > 0
  // Cómo quedaría con cada forma de dividir, para elegir viendo los números
  const iguales = repartoCuenta(e, reservaId, 'partes').partes.map((p) => p.ideal)
  const suyos = repartoCuenta(e, reservaId, 'persona').partes.map((p) => p.ideal)
  const rango = (l: number[]) => (Math.min(...l) === Math.max(...l) ? `${pesos(l[0])} cada uno` : `de ${pesos(Math.min(...l))} a ${pesos(Math.max(...l))}`)
  const haySuyos = c.consumos.some((x) => x.quien && c.nombres.includes(x.quien))

  if (rep.total === 0 && !cerrada) return <p className="ayuda cuenta-vacia">El turno ya está pagado y no consumieron nada. Si piden algo, cargalo en Consumos y se cobra acá.</p>

  return (
    <section className="cuenta-cancha" aria-label="Cobrar la cancha">
      <div className="cuenta-resumen">
        <div><span>Cancha</span><strong>{pesos(rep.saldoCancha)}</strong></div>
        <div><span>Cantina</span><strong>{pesos(rep.consumos)}</strong></div>
        <div className="cuenta-resumen-total"><span>Total</span><strong>{pesos(rep.total)}</strong></div>
      </div>

      <h3 className="cuenta-sub">Cómo pagan</h3>
      <div className="modos-cobro" role="radiogroup" aria-label="Cómo pagan">
        <button role="radio" aria-checked={c.modo === 'partes'} className={`modo-cobro ${c.modo === 'partes' ? 'activo' : ''}`} disabled={bloqueado && c.modo !== 'partes'} onClick={() => ajustarCuenta(reservaId, { modo: 'partes' })}>
          <strong>Todos iguales</strong>
          <span>La cancha y lo consumido, dividido en partes iguales.</span>
          <em>{rango(iguales)}</em>
        </button>
        <button role="radio" aria-checked={c.modo === 'persona'} className={`modo-cobro ${c.modo === 'persona' ? 'activo' : ''}`} disabled={bloqueado && c.modo !== 'persona'} onClick={() => ajustarCuenta(reservaId, { modo: 'persona' })}>
          <strong>Cada uno lo suyo</strong>
          <span>La cancha se divide; cada uno paga lo que pidió{haySuyos ? '' : ' (cargá a nombre de cada uno en Consumos)'}.</span>
          <em>{rango(suyos)}</em>
        </button>
      </div>
      {!bloqueado && (
        <div className="chips-filtro chips-partes">
          <span className="tenue">Pagan</span>
          {[1, 2, 3, 4].map((n) => <button key={n} className={c.nombres.length === n ? 'activa' : ''} onClick={() => cuantosJuegan(reservaId, n)}>{n === 1 ? 'Uno solo' : n}</button>)}
          {c.nombres.length >= 4 && c.nombres.length < 6 && <button onClick={() => cuantosJuegan(reservaId, c.nombres.length + 1)} aria-label="Uno más"><Plus size={14} /></button>}
        </div>
      )}

      <ul className="partes">
        {rep.partes.map((p) => {
          const ultimo = [...c.pagos].reverse().find((x) => x.nombre === p.nombre)
          const pago = p.monto <= 0 ? ultimo ?? { metodo: 'efectivo' as Metodo, monto: 0 } : null
          const m = metodo[p.nombre] ?? 'efectivo'
          return (
            <li key={p.nombre} className={pago ? 'parte-paga' : ''}>
              <div className="parte-cabeza">
                <span className="jugador-avatar" aria-hidden="true">{pago ? <Check size={15} /> : p.nombre.startsWith('Jugador') ? p.nombre.slice(-1) : p.nombre[0]}</span>
                <strong className="parte-nombre">{p.nombre}</strong>
                <span className="parte-monto">{pesos(pago ? p.pagado : p.monto)}</span>
              </div>
              {/* El ticket de cada uno: qué está pagando, línea por línea */}
              <ul className="parte-lineas">
                {p.lineas.map((l, i) => (
                  <li key={i} className={`linea-${l.tipo}`}>
                    <span>{l.texto}</span>
                    <span>{l.monto < 0 ? `−${pesos(-l.monto)}` : pesos(l.monto)}</span>
                  </li>
                ))}
                <li className="linea-total">
                  <span>Total{p.redondeado !== null && <small> (redondeado de {pesos(p.redondeado)})</small>}</span>
                  <span>{pesos(p.ideal)}</span>
                </li>
                {p.pagado > 0 && p.monto > 0 && (
                  <>
                    <li className="linea-pagado"><span>Ya pagó</span><span>−{pesos(p.pagado)}</span></li>
                    <li className="linea-total"><span>Le falta</span><span>{pesos(p.monto)}</span></li>
                  </>
                )}
              </ul>
              {pago ? (
                <span className="estado estado-pagada parte-estado">{p.pagado > 0 ? `Pagó ${pesos(p.pagado)} · ${metodos[pago.metodo]}` : 'No debe nada'}</span>
              ) : (
                <div className="parte-cobro">
                  <div className="segmentos parte-metodo" role="radiogroup" aria-label={`Cómo paga ${p.nombre}`}>
                    {(Object.keys(metodos) as Metodo[]).map((k) => (
                      <button key={k} role="radio" aria-checked={m === k} className={m === k ? 'activa' : ''} onClick={() => { setMetodo({ ...metodo, [p.nombre]: k }); if (k !== 'efectivo') setAbierto(null) }}>{metodos[k]}</button>
                    ))}
                  </div>
                  {m === 'efectivo' && p.monto > 0 && (
                    <button type="button" className={`boton boton-chico ${abierto === p.nombre ? 'activo' : ''}`} onClick={() => setAbierto(abierto === p.nombre ? null : p.nombre)}>Vuelto</button>
                  )}
                  <button className="boton boton-chico boton-amarillo" disabled={cajaCerrada || p.monto <= 0 || (paga[p.nombre] != null && (paga[p.nombre] as number) < p.monto)} onClick={() => { cobrarParte(reservaId, p.nombre, p.monto, m); setAbierto(null) }}>
                    Cobrar {pesos(p.monto)}
                  </button>
                </div>
              )}
              {!pago && abierto === p.nombre && m === 'efectivo' && (
                <div className="parte-vuelto"><Vuelto total={p.monto} paga={paga[p.nombre] ?? null} cambiar={(n) => setPaga({ ...paga, [p.nombre]: n })} /></div>
              )}
            </li>
          )
        })}
      </ul>
      {cajaCerrada && !cerrada && (
        <p className="aviso-linea">
          La caja de hoy ya se cerró. <button className="enlace-boton" onClick={() => reabrirCaja(hoyClave())}>Reabrir la caja</button> para cobrar.
        </p>
      )}
      {cerrada && (
        <div className="cuenta-cerrada">
          <p className="aviso-ok">Pagaron todos: la cancha y lo consumido quedaron cobrados, y la cantina ya descontó el stock.</p>
          <button
            className="boton boton-wsp"
            onClick={() => {
              const cancha = negocio.canchas.find((x) => x.id === r.canchaId)!.nombre
              const lineas = rep.partes.map((p) => `• ${p.nombre}: ${pesos(p.pagado)} (${p.lineas.map((l) => l.texto).join(', ')})`).join('\n')
              abrirWhatsApp(`${negocio.nombre} · ${cancha} ${hora(r.inicio)}\nCancha ${pesos(rep.saldoCancha)} + cantina ${pesos(rep.consumos)} = ${pesos(rep.total)}\n${lineas}\n¡Gracias por venir!`)
            }}
          >
            Mandar el detalle por WhatsApp
          </button>
        </div>
      )}
    </section>
  )
}
