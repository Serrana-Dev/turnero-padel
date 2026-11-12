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
  const [para, setPara] = useState<number | null>(null)
  const [cat, setCat] = useState<Categoria>('Bebidas')
  const [q, setQ] = useState('')
  const [aviso, setAviso] = useState<{ texto: string; n: number } | null>(null)
  const cerrada = !!c.cerrada || (r.estado === 'pagada' && !!r.porCuenta)
  const prod = (id: string) => e.productos.find((x) => x.id === id)
  // El elegido se guarda por lugar: si se le cambia el nombre, sigue elegido
  const a = para !== null ? c.nombres[para] ?? null : null
  const cargar = (itemId: string) => {
    agregarConsumo(reservaId, itemId, a)
    setAviso({ texto: `Cargado: ${prod(itemId)?.nombre} → ${a ?? 'para todos'}`, n: (aviso?.n ?? 0) + 1 })
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
            <button className={para === null ? 'activa' : ''} onClick={() => setPara(null)}>Para todos</button>
            {c.nombres.map((n, i) => <button key={n} className={para === i ? 'activa' : ''} onClick={() => setPara(i)}>{n}</button>)}
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
      {!cerrada && c.pagos.length > 0 && <p className="ayuda">Ya empezaron a pagar: lo cargado no se puede quitar, pero se puede sumar (se le cobra la diferencia a cada uno).</p>}
    </section>
  )
}

export function CuentaCobro({ reservaId }: { reservaId: string }) {
  const e = useDatos()
  const r = e.reservas.find((x) => x.id === reservaId)!
  const rep = repartoCuenta(e, reservaId)
  const c = rep.cuenta
  const [metodo, setMetodo] = useState<Record<string, Metodo>>({})
  // Con cuánto paga cada uno: se guarda junto con el monto, así si el monto cambia se vuelve a preguntar
  const [paga, setPaga] = useState<Record<string, number | null>>({})
  const [abierto, setAbierto] = useState<string | null>(null)
  const [vueltos, setVueltos] = useState<Record<string, number>>({})
  const cerrada = !!c.cerrada || (r.estado === 'pagada' && !!r.porCuenta)
  const cajaCerrada = e.cierres.some((x) => x.dia === hoyClave())
  const bloqueado = cerrada || c.pagos.length > 0
  // Cómo quedaría con cada forma de dividir, para elegir viendo los números
  const iguales = repartoCuenta(e, reservaId, 'partes').partes.map((p) => p.ideal)
  const suyos = repartoCuenta(e, reservaId, 'persona').partes.map((p) => p.ideal)
  const rango = (l: number[]) => (Math.min(...l) === Math.max(...l) ? `${pesos(l[0])} cada uno` : `de ${pesos(Math.min(...l))} a ${pesos(Math.max(...l))}`)
  const haySuyos = c.consumos.some((x) => x.quien && c.nombres.includes(x.quien))
  const falta = rep.total - rep.pagado
  // Lo que se divide entre todos, una sola vez arriba (no repetido en cada tarjeta)
  const compartidos = c.modo === 'partes' ? c.consumos : c.consumos.filter((x) => !x.quien || !c.nombres.includes(x.quien))
  const agrupados = [...compartidos.reduce((m, x) => m.set(x.itemId, (m.get(x.itemId) ?? 0) + 1), new Map<string, number>())]
  const totalCompartido = compartidos.reduce((s, x) => s + (e.productos.find((k) => k.id === x.itemId)?.precio ?? 0), 0)
  const clave = (nombre: string, monto: number) => `${nombre}:${monto}`

  if (rep.total === 0 && !cerrada) return <p className="ayuda cuenta-vacia">El turno ya está pagado y no consumieron nada. Si piden algo, cargalo en Consumos y se cobra acá.</p>

  const textoWhatsApp = () => {
    const cancha = negocio.canchas.find((x) => x.id === r.canchaId)!.nombre
    const bloques = rep.partes.map((p) => [`*${p.nombre}: ${pesos(p.ideal)}*`, ...p.lineas.map((l) => `– ${l.texto}: ${pesos(l.monto)}`)].join('\n'))
    return `${negocio.nombre} · ${cancha} ${hora(r.inicio)}\nCancha ${pesos(rep.saldoCancha)} + cantina ${pesos(rep.consumos)} = ${pesos(rep.total)}\n\n${bloques.join('\n\n')}\n\nAlias para transferir: ${negocio.alias}`
  }

  return (
    <section className="cuenta-cancha" aria-label="Cobrar la cancha">
      <div className="cuenta-resumen">
        <div><span>Cancha</span><strong>{pesos(rep.saldoCancha)}</strong></div>
        <div><span>Cantina</span><strong>{pesos(rep.consumos)}</strong></div>
        {rep.pagado > 0 && !cerrada ? (
          <div className="cuenta-resumen-total"><span>Falta de {pesos(rep.total)}</span><strong>{pesos(falta)}</strong></div>
        ) : (
          <div className="cuenta-resumen-total"><span>Total</span><strong>{pesos(rep.total)}</strong></div>
        )}
      </div>

      <h3 className="cuenta-sub">Cómo pagan</h3>
      <div className="modos-cobro" role="radiogroup" aria-label="Cómo pagan">
        <button role="radio" aria-checked={c.modo === 'partes'} className={`modo-cobro ${c.modo === 'partes' ? 'activo' : ''}`} disabled={bloqueado && c.modo !== 'partes'} onClick={() => ajustarCuenta(reservaId, { modo: 'partes' })}>
          <strong>Todos iguales</strong>
          <span>La cancha y lo consumido, dividido en partes iguales.</span>
          {!bloqueado && <em>{rango(iguales)}</em>}
        </button>
        <button role="radio" aria-checked={c.modo === 'persona'} className={`modo-cobro ${c.modo === 'persona' ? 'activo' : ''}`} disabled={bloqueado && c.modo !== 'persona'} onClick={() => ajustarCuenta(reservaId, { modo: 'persona' })}>
          <strong>Cada uno lo suyo</strong>
          <span>La cancha se divide; cada uno paga lo que pidió{haySuyos ? '' : ' (cargá a nombre de cada uno en Consumos)'}.</span>
          {!bloqueado && <em>{rango(suyos)}</em>}
        </button>
      </div>
      {bloqueado && !cerrada && <p className="ayuda">Ya empezaron a pagar: la forma de dividir queda fija hasta que paguen todos.</p>}
      {!bloqueado && (
        <div className="chips-filtro chips-partes" title="Pagan los primeros de la lista de Quiénes juegan">
          <span className="tenue">Pagan</span>
          {[1, 2, 3, 4].map((n) => <button key={n} className={rep.partes.length === n ? 'activa' : ''} onClick={() => cuantosJuegan(reservaId, n)}>{n === 1 ? 'Uno solo' : n}</button>)}
          {rep.partes.length >= 4 && rep.partes.length < 6 && <button onClick={() => cuantosJuegan(reservaId, rep.partes.length + 1)} aria-label="Uno más"><Plus size={14} /></button>}
        </div>
      )}

      {totalCompartido > 0 && rep.partes.length > 1 && (
        <p className="compartido-arriba">
          <strong>{c.modo === 'partes' ? 'Lo consumido' : 'Lo de todos'}:</strong> {agrupados.map(([id, k]) => `${k > 1 ? `${k} × ` : ''}${e.productos.find((x) => x.id === id)?.nombre}`).join(', ')}
          <span> = {pesos(totalCompartido)} ÷ {rep.partes.length}</span>
        </p>
      )}

      <ul className="partes">
        {rep.partes.map((p) => {
          const susPagos = c.pagos.filter((x) => x.nombre === p.nombre)
          const pagoListo = p.monto <= 0
          const m = metodo[p.nombre] ?? 'efectivo'
          const conCuanto = paga[clave(p.nombre, p.monto)] ?? null
          return (
            <li key={p.nombre} className={pagoListo ? 'parte-paga' : ''}>
              <div className="parte-cabeza">
                <span className="jugador-avatar" aria-hidden="true">{pagoListo ? <Check size={15} /> : p.nombre.startsWith('Jugador') ? p.nombre.slice(-1) : p.nombre[0]}</span>
                <strong className="parte-nombre">{p.nombre}</strong>
                <span className="parte-monto">{pesos(pagoListo ? p.pagado : p.monto)}</span>
              </div>
              {/* El ticket de cada uno: qué está pagando, línea por línea */}
              <ul className="parte-lineas">
                {p.lineas.map((l, i) => (
                  <li key={i} className={`linea-${l.tipo}`}>
                    <span>{l.tipo === 'compartido' && rep.partes.length > 1 ? (c.modo === 'partes' ? `Su parte de lo consumido (1/${rep.partes.length})` : `Su parte de lo de todos (1/${rep.partes.length})`) : l.texto}</span>
                    <span>{pesos(l.monto)}</span>
                  </li>
                ))}
                {p.pagado > 0 && p.monto > 0 && (
                  <>
                    <li className="linea-total"><span>Total</span><span>{pesos(p.ideal)}</span></li>
                    <li className="linea-pagado"><span>Ya pagó</span><span>−{pesos(p.pagado)}</span></li>
                    <li className="linea-total"><span>Le falta</span><span>{pesos(p.monto)}</span></li>
                  </>
                )}
              </ul>
              {pagoListo ? (
                <p className="parte-estado">
                  <span className="estado estado-pagada">{p.pagado > 0 ? 'Pagó' : 'No debe nada'}</span>
                  {susPagos.map((x, i) => <span key={i} className="parte-pago">{metodos[x.metodo]} {pesos(x.monto)}</span>)}
                  {vueltos[p.nombre] ? <span className="parte-pago">vuelto {pesos(vueltos[p.nombre])}</span> : null}
                </p>
              ) : (
                <>
                  {abierto === p.nombre && m === 'efectivo' && (
                    <div className="parte-vuelto"><Vuelto total={p.monto} paga={conCuanto} cambiar={(n) => setPaga({ ...paga, [clave(p.nombre, p.monto)]: n })} /></div>
                  )}
                  <div className="parte-cobro">
                    <div className="segmentos parte-metodo" role="radiogroup" aria-label={`Cómo paga ${p.nombre}`}>
                      {(Object.keys(metodos) as Metodo[]).map((k) => (
                        <button key={k} role="radio" aria-checked={m === k} className={m === k ? 'activa' : ''} onClick={() => { setMetodo({ ...metodo, [p.nombre]: k }); if (k !== 'efectivo') setAbierto(null) }}>{metodos[k]}</button>
                      ))}
                    </div>
                    {m === 'efectivo' && (
                      <button type="button" className={`boton boton-chico ${abierto === p.nombre ? 'activo' : ''}`} onClick={() => setAbierto(abierto === p.nombre ? null : p.nombre)}>Vuelto</button>
                    )}
                    <button
                      className="boton boton-chico boton-amarillo"
                      disabled={cajaCerrada || p.monto <= 0 || (conCuanto != null && conCuanto < p.monto)}
                      onClick={() => {
                        cobrarParte(reservaId, p.nombre, p.monto, m)
                        if (m === 'efectivo' && conCuanto != null && conCuanto > p.monto) setVueltos({ ...vueltos, [p.nombre]: conCuanto - p.monto })
                        setAbierto(null)
                      }}
                    >
                      Cobrar {pesos(p.monto)}
                    </button>
                  </div>
                </>
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
      {cerrada && <p className="aviso-ok">Pagaron todos: la cancha y lo consumido quedaron cobrados, y la cantina ya descontó el stock.</p>}
      <button className="boton boton-wsp" onClick={() => abrirWhatsApp(textoWhatsApp())}>
        {cerrada ? 'Mandar el detalle por WhatsApp' : 'Mandar la cuenta por WhatsApp'}
      </button>
    </section>
  )
}
