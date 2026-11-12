// Cantina y stock: los productos con su receta, los insumos que se descuentan solos, las compras y los movimientos.
import { useMemo, useState } from 'react'
import { AlertTriangle, PackagePlus, Plus, Trash2 } from 'lucide-react'
import { negocio, type Insumo } from '../config/negocio'
import { ajustarStock, cargarCompra, costeo, metodos, useDatos, type Metodo } from '../lib/datos'
import { capital, fechaCorta, hora, hoyClave, pct, pesos, sumarDias } from '../lib/formato'
import { Dialogo } from '../lib/ui'

/** 1500 g → "1,5 kg", 3800 ml → "3,8 L", 12 u → "12 u." */
export function cantidad(n: number, unidad: Insumo['unidad']) {
  const f = (x: number) => x.toLocaleString('es-AR', { maximumFractionDigits: 1 })
  if (unidad === 'g') return Math.abs(n) >= 1000 ? `${f(n / 1000)} kg` : `${f(n)} g`
  if (unidad === 'ml') return Math.abs(n) >= 1000 ? `${f(n / 1000)} L` : `${f(n)} ml`
  return `${f(n)} u.`
}
const insumo = (id: string) => negocio.insumos.find((x) => x.id === id)!
export const bajoMinimo = (stock: Record<string, number>) => negocio.insumos.filter((x) => (stock[x.id] ?? 0) < x.minimo)

type Pestana = 'recetas' | 'insumos' | 'compras' | 'movimientos'

export function Inventario() {
  const e = useDatos()
  const hoy = hoyClave()
  const [pestana, setPestana] = useState<Pestana>('recetas')
  const [compra, setCompra] = useState<{ insumoId: string; cantidad: number; costo: number }[] | null>(null)
  const [contar, setContar] = useState<string | null>(null)

  const faltan = bajoMinimo(e.stock)
  const valor = negocio.insumos.reduce((s, x) => s + (e.stock[x.id] ?? 0) * x.costo, 0)
  const ventasHoy = e.ventas.filter((v) => v.dia === hoy)
  const margenMedio = negocio.cantina.filter((c) => c.receta.length).reduce((s, c) => s + costeo(e, c.id).margen, 0) / negocio.cantina.filter((c) => c.receta.length).length
  const pedido = () => setCompra(faltan.map((x) => ({ insumoId: x.id, cantidad: Math.max(x.minimo * 2 - (e.stock[x.id] ?? 0), x.minimo), costo: x.costo })))

  return (
    <div className="pantalla">
      <div className="titulo-fila">
        <div>
          <h1>Cantina y stock</h1>
          <p>Cada producto tiene su receta: al venderlo se descuentan solos los insumos.</p>
        </div>
        <button className="boton boton-primario" onClick={() => setCompra([{ insumoId: negocio.insumos[0].id, cantidad: 1, costo: negocio.insumos[0].costo }])}>
          <PackagePlus size={16} aria-hidden="true" /> Cargar compra
        </button>
      </div>

      <div className="kpis">
        <div className="kpi"><span>Stock valorizado</span><strong>{pesos(valor)}</strong><small>a costo de compra</small></div>
        <div className="kpi"><span>Para reponer</span><strong className={faltan.length ? 'mal' : 'bien'}>{faltan.length}</strong><small>insumos bajo el mínimo</small></div>
        <div className="kpi"><span>Vendido hoy</span><strong>{pesos(ventasHoy.reduce((s, v) => s + v.monto, 0))}</strong><small>{ventasHoy.length === 1 ? "1 producto" : `${ventasHoy.length} productos`} en la cantina</small></div>
        <div className="kpi"><span>Margen de la carta</span><strong>{pct(margenMedio)}</strong><small>promedio, según las recetas</small></div>
      </div>

      {faltan.length > 0 && (
        <div className="reponer">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>
            <strong>Hay que reponer:</strong>{' '}
            {faltan.map((x) => `${x.nombre} (quedan ${cantidad(e.stock[x.id] ?? 0, x.unidad)})`).join(' · ')}
          </p>
          <button className="boton boton-chico" onClick={pedido}>Armar el pedido</button>
        </div>
      )}

      <div className="pestanas-admin" role="tablist">
        {([['recetas', 'Productos y recetas'], ['insumos', 'Insumos'], ['compras', 'Compras'], ['movimientos', 'Movimientos de stock']] as [Pestana, string][]).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={pestana === k} className={pestana === k ? 'activa' : ''} onClick={() => setPestana(k)}>
            {t}
            {k === 'insumos' && faltan.length > 0 && <span className="insignia">{faltan.length}</span>}
          </button>
        ))}
      </div>

      {pestana === 'recetas' && <Recetas />}
      {pestana === 'insumos' && <Insumos contar={setContar} />}
      {pestana === 'compras' && <Compras />}
      {pestana === 'movimientos' && <Movimientos />}

      <DialogoCompra filas={compra} cerrar={() => setCompra(null)} />
      <DialogoContar id={contar} cerrar={() => setContar(null)} />
    </div>
  )
}

function Recetas() {
  const e = useDatos()
  const hoy = hoyClave()
  const vendidos = (id: string) => e.ventas.filter((v) => v.dia === hoy && v.itemId === id).length
  const categorias = ['Cocina', 'Tragos', 'Bebidas', 'Deportes'] as const
  return (
    <div className="recetas">
      {categorias.map((cat) => (
        <section key={cat}>
          <h2 className="subtitulo">{cat}</h2>
          <ul className="recetas-grilla">
            {negocio.cantina.filter((c) => c.categoria === cat).map((c) => {
              const k = costeo(e, c.id)
              return (
                <li key={c.id} className="receta">
                  <div className="receta-cabeza">
                    <strong>{c.nombre}</strong>
                    <span className="receta-precio">{pesos(c.precio)}</span>
                  </div>
                  {c.receta.length ? (
                    <ul className="receta-lineas">
                      {c.receta.map((l) => {
                        const ins = insumo(l.insumoId)
                        const poco = (e.stock[l.insumoId] ?? 0) < ins.minimo
                        return (
                          <li key={l.insumoId} className={poco ? 'receta-poco' : ''}>
                            <span>{cantidad(l.cantidad, ins.unidad)}</span> {ins.nombre}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="ayuda">Servicio, no descuenta stock.</p>
                  )}
                  <div className="receta-pie">
                    {c.receta.length > 0 && (
                      <>
                        <span>Costo {pesos(k.costo)}</span>
                        <span className={k.margen > 0.6 ? 'bien' : ''}>Margen {pct(k.margen)}</span>
                        <span className={k.alcanza < 8 ? 'mal' : ''}>{k.alcanza === 0 ? 'Sin stock' : `Alcanza para ${k.alcanza}`}</span>
                      </>
                    )}
                    <span className="tenue">{vendidos(c.id)} hoy</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Insumos({ contar }: { contar: (id: string) => void }) {
  const e = useDatos()
  return (
    <div className="tabla-marco">
      <table className="tabla tabla-insumos">
        <thead>
          <tr><th>Insumo</th><th>Stock</th><th className="num">Mínimo</th><th className="num">Costo</th><th className="num">Valor</th><th /></tr>
        </thead>
        <tbody>
          {(['Cocina', 'Bebidas', 'Deportes'] as const).flatMap((rubro) =>
            negocio.insumos.filter((x) => x.rubro === rubro).map((x) => {
              const st = e.stock[x.id] ?? 0
              const nivel = Math.min(1, st / (x.minimo * 2.5))
              const estado = st <= 0 ? 'sin' : st < x.minimo ? 'bajo' : 'ok'
              return (
                <tr key={x.id}>
                  <td><strong>{x.nombre}</strong><small>{rubro}</small></td>
                  <td>
                    <div className="nivel">
                      <span className={`nivel-barra nivel-${estado}`}><i style={{ width: `${nivel * 100}%` }} /></span>
                      <span className="nivel-texto">{cantidad(st, x.unidad)}</span>
                      {estado !== 'ok' && <span className={`estado estado-${estado === 'sin' ? 'cancelada' : 'pendiente'}`}>{estado === 'sin' ? 'Sin stock' : 'Reponer'}</span>}
                    </div>
                  </td>
                  <td className="num">{cantidad(x.minimo, x.unidad)}</td>
                  <td className="num">{pesos(x.unidad === 'u' ? x.costo : x.costo * 1000)}<small>{x.unidad === 'u' ? 'por unidad' : x.unidad === 'g' ? 'el kilo' : 'el litro'}</small></td>
                  <td className="num">{pesos(st * x.costo)}</td>
                  <td className="num"><button className="boton boton-chico" onClick={() => contar(x.id)}>Contar</button></td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </div>
  )
}

function Compras() {
  const e = useDatos()
  const desde = sumarDias(hoyClave(), -30)
  const lista = e.compras.filter((c) => c.dia >= desde).sort((a, b) => b.dia.localeCompare(a.dia))
  const porProv = negocio.proveedores.map((p) => ({ p, total: lista.filter((c) => c.proveedor === p).reduce((s, c) => s + c.total, 0) })).sort((a, b) => b.total - a.total)
  const max = Math.max(...porProv.map((x) => x.total), 1)
  return (
    <div className="grilla-rail">
      <div className="tabla-marco">
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Proveedor</th><th>Qué trajo</th><th>Medio</th><th className="num">Total</th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td>{capital(fechaCorta(c.dia))}</td>
                <td><strong>{c.proveedor}</strong></td>
                <td><small>{c.items.map((x) => `${cantidad(x.cantidad, insumo(x.insumoId).unidad)} ${insumo(x.insumoId).nombre.toLowerCase()}`).join(', ')}</small></td>
                <td>{metodos[c.metodo]}</td>
                <td className="num">{pesos(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <aside className="rail">
        <h2 className="rail-titulo">Compras de los últimos 30 días</h2>
        <div className="tarjeta">
          <ul className="barras-h">
            {porProv.map(({ p, total }) => (
              <li key={p}>
                <span>{p}</span>
                <span className="barras-h-barra"><i style={{ width: `${(total / max) * 100}%` }} /></span>
                <strong>{pesos(total)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function Movimientos() {
  const e = useDatos()
  const lista = [...e.movimientos].sort((a, b) => (b.dia + String(b.hora).padStart(4, '0')).localeCompare(a.dia + String(a.hora).padStart(4, '0'))).slice(0, 120)
  return (
    <div className="tabla-marco">
      <table className="tabla">
        <thead><tr><th>Cuándo</th><th>Insumo</th><th>Motivo</th><th className="num">Cantidad</th></tr></thead>
        <tbody>
          {lista.map((m) => {
            const ins = insumo(m.insumoId)
            return (
              <tr key={m.id}>
                <td>{m.dia === hoyClave() ? 'Hoy' : capital(fechaCorta(m.dia))} {hora(m.hora)}</td>
                <td><strong>{ins.nombre}</strong></td>
                <td>
                  <span className={`estado ${m.motivo === 'compra' ? 'estado-pagada' : m.motivo === 'venta' ? 'estado-señada' : ''}`}>{m.motivo === 'compra' ? 'Compra' : m.motivo === 'venta' ? 'Venta' : 'Ajuste'}</span>
                  <small>{m.detalle}</small>
                </td>
                <td className={`num ${m.cantidad > 0 ? 'bien' : ''}`}>{m.cantidad > 0 ? '+' : '−'}{cantidad(Math.abs(m.cantidad), ins.unidad)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DialogoCompra({ filas, cerrar }: { filas: { insumoId: string; cantidad: number; costo: number }[] | null; cerrar: () => void }) {
  return filas ? <FormCompra inicial={filas} cerrar={cerrar} /> : <Dialogo abierto={false} cerrar={cerrar} titulo="">{null}</Dialogo>
}

function FormCompra({ inicial, cerrar }: { inicial: { insumoId: string; cantidad: number; costo: number }[]; cerrar: () => void }) {
  const [prov, setProv] = useState(negocio.proveedores[0])
  const [filas, setFilas] = useState(inicial)
  const [metodo, setMetodo] = useState<Metodo>('transferencia')
  const total = useMemo(() => filas.reduce((s, f) => s + f.cantidad * f.costo, 0), [filas])
  const cambiar = (i: number, c: Partial<(typeof filas)[number]>) => setFilas(filas.map((f, j) => (j === i ? { ...f, ...c } : f)))
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Cargar compra" ancho={620}>
      <form
        className="formulario"
        onSubmit={(ev) => {
          ev.preventDefault()
          cargarCompra(prov, filas.filter((f) => f.cantidad > 0), metodo)
          cerrar()
        }}
      >
        <div className="campos-2">
          <label className="campo">
            Proveedor
            <select value={prov} onChange={(ev) => setProv(ev.target.value)}>{negocio.proveedores.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <label className="campo">
            Se pagó con
            <select value={metodo} onChange={(ev) => setMetodo(ev.target.value as Metodo)}>{Object.entries(metodos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
        </div>
        <div className="compra-filas">
          {filas.map((f, i) => {
            const ins = insumo(f.insumoId)
            return (
              <div className="compra-fila" key={i}>
                <label className="campo">
                  Insumo
                  <select value={f.insumoId} onChange={(ev) => cambiar(i, { insumoId: ev.target.value, costo: insumo(ev.target.value).costo })}>
                    {negocio.insumos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </select>
                </label>
                <label className="campo">
                  Cantidad ({ins.unidad === 'u' ? 'unidades' : ins.unidad})
                  <input type="number" inputMode="decimal" min={0} value={f.cantidad} onChange={(ev) => cambiar(i, { cantidad: Number(ev.target.value) })} />
                </label>
                <p className="compra-subtotal">{pesos(f.cantidad * f.costo)}</p>
                <button type="button" className="btn-icono" aria-label="Quitar" onClick={() => setFilas(filas.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              </div>
            )
          })}
          <button type="button" className="boton boton-chico" onClick={() => setFilas([...filas, { insumoId: negocio.insumos[0].id, cantidad: 1, costo: negocio.insumos[0].costo }])}>
            <Plus size={14} aria-hidden="true" /> Otro insumo
          </button>
        </div>
        <p className="compra-total">Total <strong>{pesos(total)}</strong></p>
        <p className="ayuda">Al guardar, el stock sube y la compra queda como gasto de Mercadería en la caja.</p>
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario" disabled={!filas.length}>Guardar compra</button>
        </div>
      </form>
    </Dialogo>
  )
}

function DialogoContar({ id, cerrar }: { id: string | null; cerrar: () => void }) {
  const e = useDatos()
  const [valor, setValor] = useState<string>('')
  const ins = id ? insumo(id) : null
  return (
    <Dialogo abierto={!!ins} cerrar={() => { setValor(''); cerrar() }} titulo={ins ? `Contar ${ins.nombre.toLowerCase()}` : ''}>
      {ins && (
        <form
          className="formulario"
          onSubmit={(ev) => {
            ev.preventDefault()
            if (valor !== '') ajustarStock(ins.id, Number(valor))
            setValor('')
            cerrar()
          }}
        >
          <p className="ayuda">El sistema dice que hay {cantidad(e.stock[ins.id] ?? 0, ins.unidad)}. Si al contar hay otra cantidad, se corrige y queda registrado como ajuste.</p>
          <label className="campo">
            Hay en la cantina ({ins.unidad === 'u' ? 'unidades' : ins.unidad})
            <input type="number" inputMode="decimal" min={0} autoFocus value={valor} onChange={(ev) => setValor(ev.target.value)} />
          </label>
          <div className="acciones-fila">
            <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
            <button className="boton boton-primario">Guardar conteo</button>
          </div>
        </form>
      )}
    </Dialogo>
  )
}
