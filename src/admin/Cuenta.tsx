// La cuenta de la cancha: lo que consumieron los que juegan, dividido en partes iguales o cada uno lo suyo.
import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { negocio } from '../config/negocio'
import { agregarConsumo, ajustarCuenta, cobrarParte, metodos, quitarConsumo, repartoCuenta, useDatos, type Metodo } from '../lib/datos'
import { hora, pesos } from '../lib/formato'

export function CuentaCancha({ reservaId }: { reservaId: string }) {
  const e = useDatos()
  const r = e.reservas.find((x) => x.id === reservaId)!
  const rep = repartoCuenta(e, reservaId)
  const c = rep.cuenta
  const [para, setPara] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [cat, setCat] = useState<'Bebidas' | 'Tragos' | 'Cocina' | 'Deportes'>('Bebidas')
  const [metodo, setMetodo] = useState<Record<string, Metodo>>({})
  const cerrada = r.estado === 'pagada' && r.porCuenta
  const pagoDe = (n: string) => c.pagos.find((p) => p.nombre === n)
  const nombre = (id: string) => negocio.cantina.find((x) => x.id === id)?.nombre ?? id
  const precio = (id: string) => negocio.cantina.find((x) => x.id === id)?.precio ?? 0

  const sumarNombre = () => {
    const n = nuevo.trim()
    if (!n || c.nombres.includes(n)) return
    ajustarCuenta(reservaId, { nombres: [...c.nombres, n] })
    setNuevo('')
  }

  return (
    <section className="cuenta-cancha" aria-label="Cuenta de la cancha">
      <div className="cuenta-cabeza">
        <h3>Cuenta de la cancha</h3>
        <span className="tenue">{c.consumos.length} {c.consumos.length === 1 ? 'consumo' : 'consumos'}</span>
      </div>

      {/* Quiénes juegan */}
      <div className="jugadores">
        {c.nombres.map((n) => (
          <span key={n} className="jugador">
            {n}
            {!cerrada && c.nombres.length > 1 && !pagoDe(n) && (
              <button aria-label={`Quitar a ${n}`} onClick={() => ajustarCuenta(reservaId, { nombres: c.nombres.filter((x) => x !== n) })}><X size={12} /></button>
            )}
          </span>
        ))}
        {!cerrada && c.nombres.length < 6 && (
          <form className="jugador-nuevo" onSubmit={(ev) => { ev.preventDefault(); sumarNombre() }}>
            <input value={nuevo} onChange={(ev) => setNuevo(ev.target.value)} placeholder="Agregar nombre" aria-label="Nombre de quien juega" />
            <button className="btn-icono" aria-label="Agregar"><Plus size={16} /></button>
          </form>
        )}
      </div>

      {/* Cargar consumos */}
      {!cerrada && (
        <div className="cargar">
          <div className="cargar-para">
            <span className="tenue">Cargar a</span>
            <div className="chips">
              <button className={para === null ? 'activa' : ''} onClick={() => setPara(null)}>Todos</button>
              {c.nombres.map((n) => <button key={n} className={para === n ? 'activa' : ''} onClick={() => setPara(n)}>{n}</button>)}
            </div>
          </div>
          <div className="pestanas-chicas">
            {(['Bebidas', 'Tragos', 'Cocina', 'Deportes'] as const).map((k) => <button key={k} className={cat === k ? 'activa' : ''} onClick={() => setCat(k)}>{k}</button>)}
          </div>
          <div className="productos-grilla productos-chicos">
            {negocio.cantina.filter((x) => x.categoria === cat).map((it) => (
              <button key={it.id} className="producto-boton" onClick={() => agregarConsumo(reservaId, it.id, para)}>
                <strong>{it.nombre}</strong>
                <span>{pesos(it.precio)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {c.consumos.length > 0 && (
        <ul className="consumos">
          {c.consumos.map((x) => (
            <li key={x.id}>
              <span className="consumo-hora">{hora(x.hora)}</span>
              <span className="consumo-nombre">{nombre(x.itemId)}</span>
              <span className={`consumo-quien ${x.quien ? '' : 'todos'}`}>{x.quien ?? 'Todos'}</span>
              <span className="consumo-precio">{pesos(precio(x.itemId))}</span>
              {!cerrada && !c.pagos.length && <button className="btn-icono" aria-label="Quitar" onClick={() => quitarConsumo(reservaId, x.id)}><X size={14} /></button>}
            </li>
          ))}
        </ul>
      )}

      {/* Cómo se divide */}
      <div className="dividir">
        <div className="segmentos segmentos-ancho">
          <button className={c.modo === 'partes' ? 'activa' : ''} disabled={cerrada || c.pagos.length > 0} onClick={() => ajustarCuenta(reservaId, { modo: 'partes' })}>Dividir en partes iguales</button>
          <button className={c.modo === 'persona' ? 'activa' : ''} disabled={cerrada || c.pagos.length > 0} onClick={() => ajustarCuenta(reservaId, { modo: 'persona' })}>Cada uno lo suyo</button>
        </div>
        {c.modo === 'partes' && !cerrada && !c.pagos.length && (
          <div className="chips chips-partes">
            <span className="tenue">Entre</span>
            {[2, 3, 4].map((n) => <button key={n} className={c.partes === n ? 'activa' : ''} onClick={() => ajustarCuenta(reservaId, { partes: n })}>{n}</button>)}
          </div>
        )}
      </div>

      {rep.total === 0 && !cerrada && <p className="ayuda">El turno ya está pagado. Si consumen algo, cargalo y se cobra acá.</p>}
      {(rep.total > 0 || cerrada) && (
      <>
      <dl className="ficha ficha-compacta">
        <div><dt>Saldo de la cancha</dt><dd>{pesos(rep.saldoCancha)}</dd></div>
        <div><dt>Cantina</dt><dd>{pesos(rep.consumos)}</dd></div>
        <div className="ficha-total"><dt>Total a cobrar</dt><dd>{pesos(rep.total)}</dd></div>
      </dl>

      <ul className="partes">
        {rep.partes.map((p) => {
          const pago = pagoDe(p.nombre)
          return (
            <li key={p.nombre} className={pago ? 'parte-paga' : ''}>
              <span className="parte-texto">
                <strong>{p.nombre}</strong>
                <small>{p.detalle}</small>
              </span>
              <span className="parte-monto">{pesos(pago?.monto ?? p.monto)}</span>
              {pago ? (
                <span className="estado estado-pagada"><Check size={12} aria-hidden="true" /> {metodos[pago.metodo]}</span>
              ) : (
                <span className="parte-cobro">
                  <select aria-label={`Medio de pago de ${p.nombre}`} value={metodo[p.nombre] ?? 'efectivo'} onChange={(ev) => setMetodo({ ...metodo, [p.nombre]: ev.target.value as Metodo })}>
                    {Object.entries(metodos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="boton boton-chico boton-primario" disabled={p.monto <= 0} onClick={() => cobrarParte(reservaId, p.nombre, p.monto, metodo[p.nombre] ?? 'efectivo')}>Cobrar</button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      </>
      )}
      {cerrada && <p className="aviso-ok">Pagaron todos: el turno quedó cobrado y lo de la cantina ya descontó el stock.</p>}
    </section>
  )
}
