// Compras y proveedores: lo que entra a la cantina, a quién se le compra y cuánto se gasta en cada uno.
import { useMemo, useState } from 'react'
import { MessageCircle, PackagePlus, Plus, Trash2, Truck } from 'lucide-react'
import { negocio } from '../config/negocio'
import { cargarCompra, insumoDe, metodos, useDatos, type Metodo } from '../lib/datos'
import { capital, fechaCorta, hoyClave, pesos, sumarDias } from '../lib/formato'
import { Dialogo } from '../lib/ui'
import { bajoMinimo, Buscador, Cabecera, cantidad, coincide, costoMostrado, precioUnidad } from './comun'

type Fila = { insumoId: string; cantidad: number; costo: number }

export function Compras() {
  const e = useDatos()
  const [vista, setVista] = useState<'compras' | 'proveedores'>('compras')
  const [q, setQ] = useState('')
  const [nueva, setNueva] = useState<{ prov: string; filas: Fila[] } | null>(null)
  const desde = sumarDias(hoyClave(), -29)
  const delMes = e.compras.filter((c) => c.dia >= desde)
  const totalMes = delMes.reduce((s, c) => s + c.total, 0)
  const lista = [...e.compras]
    .filter((c) => !q || coincide(c.proveedor, q) || c.items.some((x) => coincide(insumoDe(e, x.insumoId)?.nombre ?? '', q)))
    .sort((a, b) => b.dia.localeCompare(a.dia))
    .slice(0, 60)
  const abrir = (prov = negocio.proveedores[0].nombre) => {
    const primero = e.insumos.find((x) => x.proveedor === prov) ?? e.insumos[0]
    setNueva({ prov, filas: [{ insumoId: primero.id, cantidad: 1, costo: primero.costo }] })
  }

  return (
    <div className="pantalla">
      <Cabecera
        seccion="cantina"
        titulo="Compras y proveedores"
        cuentas={{ '/admin/subproductos': bajoMinimo(e).length }}
        frase={<>En los últimos 30 días se compraron <strong>{pesos(totalMes)}</strong> en {delMes.length} entregas de {negocio.proveedores.length} proveedores.</>}
      >
        <button className="boton boton-primario" onClick={() => abrir()}><PackagePlus size={16} aria-hidden="true" /> Cargar compra</button>
      </Cabecera>

      <div className="herramientas">
        <Buscador valor={q} cambiar={setQ} texto="Buscar proveedor o subproducto" />
        <div className="segmentos" role="group">
          <button className={vista === 'compras' ? 'activa' : ''} onClick={() => setVista('compras')}>Compras</button>
          <button className={vista === 'proveedores' ? 'activa' : ''} onClick={() => setVista('proveedores')}><Truck size={15} aria-hidden="true" /> Proveedores</button>
        </div>
      </div>

      {vista === 'compras' ? (
        <ul className="compras-lista">
          {lista.map((c) => (
            <li key={c.id} className="compra-tarjeta">
              <div className="compra-fecha">
                <strong>{c.dia === hoyClave() ? 'Hoy' : capital(fechaCorta(c.dia))}</strong>
                <small>{metodos[c.metodo]}</small>
              </div>
              <div className="compra-texto">
                <strong>{c.proveedor}</strong>
                <small>{c.items.map((x) => { const i = insumoDe(e, x.insumoId); return i ? `${cantidad(x.cantidad, i.unidad)} ${i.nombre.toLowerCase()}` : '' }).join(' · ')}</small>
              </div>
              <strong className="compra-monto">{pesos(c.total)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="proveedores">
          {negocio.proveedores
            .filter((p) => !q || coincide(p.nombre, q) || coincide(p.rubro, q))
            .map((p) => {
              const suyas = e.compras.filter((c) => c.proveedor === p.nombre).sort((a, b) => b.dia.localeCompare(a.dia))
              const mes = suyas.filter((c) => c.dia >= desde).reduce((s, c) => s + c.total, 0)
              const subs = e.insumos.filter((x) => x.proveedor === p.nombre)
              const faltan = subs.filter((x) => (e.stock[x.id] ?? 0) < x.minimo)
              return (
                <li key={p.nombre} className="proveedor">
                  <header>
                    <span className="proveedor-inicial" aria-hidden="true">{p.nombre[0]}</span>
                    <span>
                      <strong>{p.nombre}</strong>
                      <small>{p.rubro}</small>
                    </span>
                  </header>
                  <dl>
                    <div><dt>Este mes</dt><dd>{pesos(mes)}</dd></div>
                    <div><dt>Última entrega</dt><dd>{suyas[0] ? capital(fechaCorta(suyas[0].dia)) : '—'}</dd></div>
                    <div><dt>Entrega</dt><dd>{p.entrega}</dd></div>
                  </dl>
                  <p className="proveedor-subs">
                    {subs.map((x) => (
                      <span key={x.id} className={(e.stock[x.id] ?? 0) < x.minimo ? 'falta' : ''}>{x.nombre}</span>
                    ))}
                  </p>
                  <footer>
                    <a className="boton boton-chico boton-wsp" href={`https://wa.me/54${p.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={14} aria-hidden="true" /> {p.contacto.split(' ')[0]}</a>
                    <button className="boton boton-chico" onClick={() => abrir(p.nombre)}>Cargar compra</button>
                    {faltan.length > 0 && <span className="estado estado-pendiente">{faltan.length} para reponer</span>}
                  </footer>
                </li>
              )
            })}
        </ul>
      )}

      {nueva && <FormCompra prov={nueva.prov} inicial={nueva.filas} cerrar={() => setNueva(null)} />}
    </div>
  )
}

export function FormCompra({ prov: provInicial, inicial, cerrar }: { prov: string; inicial: Fila[]; cerrar: () => void }) {
  const e = useDatos()
  const [prov, setProv] = useState(provInicial)
  const [filas, setFilas] = useState(inicial)
  const [metodo, setMetodo] = useState<Metodo>('transferencia')
  const total = useMemo(() => filas.reduce((s, f) => s + f.cantidad * f.costo, 0), [filas])
  const cambiar = (i: number, c: Partial<Fila>) => setFilas(filas.map((f, j) => (j === i ? { ...f, ...c } : f)))
  const opciones = [...e.insumos].sort((a, b) => Number(b.proveedor === prov) - Number(a.proveedor === prov))
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Cargar compra" ancho={660}>
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
            <select value={prov} onChange={(ev) => setProv(ev.target.value)}>{negocio.proveedores.map((p) => <option key={p.nombre}>{p.nombre}</option>)}</select>
          </label>
          <label className="campo">
            Se pagó con
            <select value={metodo} onChange={(ev) => setMetodo(ev.target.value as Metodo)}>{Object.entries(metodos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
        </div>
        <div className="compra-filas">
          {filas.map((f, i) => {
            const ins = insumoDe(e, f.insumoId)!
            const div = ins.unidad === 'u' ? 1 : 1000
            const subio = f.costo > ins.costo * 1.001
            return (
              <div className="compra-fila compra-fila-4" key={i}>
                <label className="campo">
                  Subproducto
                  <select value={f.insumoId} onChange={(ev) => cambiar(i, { insumoId: ev.target.value, costo: insumoDe(e, ev.target.value)!.costo })}>
                    {opciones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </select>
                </label>
                <label className="campo">
                  Cantidad ({ins.unidad === 'u' ? 'u.' : ins.unidad})
                  <input type="number" inputMode="decimal" min={0} value={f.cantidad} onChange={(ev) => cambiar(i, { cantidad: Number(ev.target.value) })} />
                </label>
                <label className="campo">
                  Precio {precioUnidad(ins)}
                  <input type="number" inputMode="decimal" min={0} value={Math.round(f.costo * div * 100) / 100} onChange={(ev) => cambiar(i, { costo: Number(ev.target.value) / div })} />
                  {subio && <small className="mal">Antes {pesos(costoMostrado(ins))}: se actualizan los costos de las recetas</small>}
                </label>
                <p className="compra-subtotal">{pesos(f.cantidad * f.costo)}</p>
                <button type="button" className="btn-icono" aria-label="Quitar" onClick={() => setFilas(filas.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              </div>
            )
          })}
          <button type="button" className="boton boton-chico" onClick={() => { const x = opciones[0]; setFilas([...filas, { insumoId: x.id, cantidad: 1, costo: x.costo }]) }}>
            <Plus size={14} aria-hidden="true" /> Otro subproducto
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
