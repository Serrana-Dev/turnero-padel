// La cuenta de la cancha: lo que consumieron los que juegan, dividido en partes iguales o cada uno lo suyo.
import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import type { Categoria } from '../config/negocio'
import { agregarConsumo, ajustarCuenta, cobrarParte, cuantosJuegan, metodos, quitarConsumo, renombrarJugador, repartoCuenta, useDatos, type Metodo } from '../lib/datos'
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
  const cerrada = r.estado === 'pagada' && !!r.porCuenta
  const prod = (id: string) => e.productos.find((x) => x.id === id)
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
            {c.nombres.map((n) => <button key={n} className={para === n ? 'activa' : ''} onClick={() => setPara(n)}>{n}</button>)}
          </div>
          <Buscador valor={q} cambiar={setQ} texto="Buscar en la cantina" />
          {!q && (
            <div className="pestanas-chicas">
              {categorias.map((k) => <button key={k} className={cat === k ? 'activa' : ''} onClick={() => setCat(k)}>{k}</button>)}
            </div>
          )}
          <div className="productos-grilla productos-chicos">
            {e.productos.filter((x) => !x.pausado && (q ? coincide(x.nombre, q) : x.categoria === cat)).map((it) => (
              <button key={it.id} className="producto-boton" onClick={() => agregarConsumo(reservaId, it.id, para)}>
                <IconoProducto p={it} tam={30} icono={16} />
                <span className="producto-boton-texto"><strong>{it.nombre}</strong><span>{pesos(it.precio)}</span></span>
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
  const cerrada = r.estado === 'pagada' && !!r.porCuenta
  const cajaCerrada = e.cierres.some((x) => x.dia === hoyClave())
  const bloqueado = cerrada || c.pagos.length > 0

  if (rep.total === 0 && !cerrada) return <p className="ayuda cuenta-vacia">El turno ya está pagado y no consumieron nada. Si piden algo, cargalo en Consumos y se cobra acá.</p>

  return (
    <section className="cuenta-cancha" aria-label="Cobrar la cancha">
      <div className="cuenta-resumen">
        <div><span>Cancha</span><strong>{pesos(rep.saldoCancha)}</strong></div>
        <div><span>Cantina</span><strong>{pesos(rep.consumos)}</strong></div>
        <div className="cuenta-resumen-total"><span>Total</span><strong>{pesos(rep.total)}</strong></div>
      </div>

      <div className="segmentos segmentos-ancho">
        <button className={c.modo === 'partes' ? 'activa' : ''} disabled={bloqueado} onClick={() => ajustarCuenta(reservaId, { modo: 'partes' })}>Partes iguales</button>
        <button className={c.modo === 'persona' ? 'activa' : ''} disabled={bloqueado} onClick={() => ajustarCuenta(reservaId, { modo: 'persona' })}>Cada uno lo suyo</button>
      </div>
      <p className="ayuda">
        {c.modo === 'partes' ? 'La cancha y todo lo consumido se divide igual entre los que pagan.' : 'La cancha y lo que es "para todos" se divide; lo que pidió cada uno lo paga él.'}
      </p>
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
          return (
            <li key={p.nombre} className={pago ? 'parte-paga' : ''}>
              <span className="jugador-avatar" aria-hidden="true">{pago ? <Check size={15} /> : p.nombre.startsWith('Jugador') ? p.nombre.slice(-1) : p.nombre[0]}</span>
              <span className="parte-texto">
                <strong>{p.nombre}</strong>
                <small>{p.detalle}{p.pagado > 0 && p.monto > 0 ? ` · ya pagó ${pesos(p.pagado)}, le falta esto` : ''}</small>
              </span>
              <span className="parte-monto">{pesos(pago ? p.pagado : p.monto)}</span>
              {pago ? (
                <span className="estado estado-pagada">{p.pagado > 0 ? `Pagó · ${metodos[pago.metodo]}` : 'No debe nada'}</span>
              ) : (
                <span className="parte-cobro">
                  <select aria-label={`Medio de pago de ${p.nombre}`} value={metodo[p.nombre] ?? 'efectivo'} onChange={(ev) => setMetodo({ ...metodo, [p.nombre]: ev.target.value as Metodo })}>
                    {Object.entries(metodos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {(metodo[p.nombre] ?? 'efectivo') === 'efectivo' && p.monto > 0 && (
                    <button type="button" className={`boton boton-chico ${abierto === p.nombre ? 'activo' : ''}`} onClick={() => setAbierto(abierto === p.nombre ? null : p.nombre)}>Vuelto</button>
                  )}
                  <button className="boton boton-chico boton-amarillo" disabled={cajaCerrada || p.monto <= 0 || (paga[p.nombre] != null && (paga[p.nombre] as number) < p.monto)} onClick={() => { cobrarParte(reservaId, p.nombre, p.monto, metodo[p.nombre] ?? 'efectivo'); setAbierto(null) }}>Cobrar</button>
                </span>
              )}
              {!pago && abierto === p.nombre && (metodo[p.nombre] ?? 'efectivo') === 'efectivo' && (
                <div className="parte-vuelto"><Vuelto total={p.monto} paga={paga[p.nombre] ?? null} cambiar={(n) => setPaga({ ...paga, [p.nombre]: n })} /></div>
              )}
            </li>
          )
        })}
      </ul>
      {cajaCerrada && !cerrada && <p className="aviso-linea">La caja de hoy ya se cerró: para cobrar, primero hay que volver a abrirla.</p>}
      {cerrada && (
        <div className="cuenta-cerrada">
          <p className="aviso-ok">Pagaron todos: la cancha y lo consumido quedaron cobrados, y la cantina ya descontó el stock.</p>
          <button
            className="boton boton-wsp"
            onClick={() => {
              const cancha = negocio.canchas.find((x) => x.id === r.canchaId)!.nombre
              const lineas = rep.partes.map((p) => `• ${p.nombre}: ${pesos(p.pagado)}`).join('\n')
              const consumido = c.consumos.map((x) => e.productos.find((k) => k.id === x.itemId)?.nombre).filter(Boolean).join(', ')
              abrirWhatsApp(`${negocio.nombre} · ${cancha} ${hora(r.inicio)}\nCancha ${pesos(rep.saldoCancha)}${consumido ? ` + cantina ${pesos(rep.consumos)} (${consumido})` : ''}\nTotal ${pesos(rep.total)}\n${lineas}\n¡Gracias por venir!`)
            }}
          >
            Mandar el detalle por WhatsApp
          </button>
        </div>
      )}
    </section>
  )
}
