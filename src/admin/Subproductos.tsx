// Subproductos y stock: lo que se compra (pan, medallones, fernet) y se descuenta solo con cada venta.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ClipboardList, History, Pencil, Plus, Send } from 'lucide-react'
import { negocio, type Insumo, type Rubro } from '../config/negocio'
import { ajustarStock, cargarCompra, guardarInsumo, insumoDe, useDatos, type Estado } from '../lib/datos'
import { capital, fechaCorta, hora, hoyClave, pesos } from '../lib/formato'
import { Dialogo } from '../lib/ui'
import { bajoMinimo, Buscador, Cabecera, cantidad, Chips, coincide, costoMostrado, precioUnidad, unidadLarga } from './comun'

type Filtro = 'todos' | Rubro | 'reponer'

/** Qué productos usan un subproducto (también dentro de combos). */
export function quienesLoUsan(e: Estado, insumoId: string) {
  return e.productos.filter((p) => p.receta.some((l) => l.insumoId === insumoId || (l.productoId && e.productos.find((x) => x.id === l.productoId)?.receta.some((m) => m.insumoId === insumoId))))
}

export function Subproductos() {
  const e = useDatos()
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [vista, setVista] = useState<'stock' | 'movimientos'>('stock')
  const [contar, setContar] = useState<string | null>(null)
  const [editar, setEditar] = useState<Insumo | null>(null)
  const [pedido, setPedido] = useState(false)
  const faltan = bajoMinimo(e)
  const valor = e.insumos.reduce((s, x) => s + Math.max(0, e.stock[x.id] ?? 0) * x.costo, 0)

  // Desde el armador de recetas se puede venir a crear un subproducto que no existe
  useEffect(() => {
    const n = sp.get('nuevo')
    if (n !== null) {
      setEditar({ id: '', nombre: n, unidad: 'u', costo: 0, minimo: 0, rubro: 'Cocina', proveedor: negocio.proveedores[0].nombre })
      setSp({}, { replace: true })
    }
  }, [sp, setSp])

  const lista = e.insumos
    .filter((x) => (filtro === 'todos' ? true : filtro === 'reponer' ? (e.stock[x.id] ?? 0) < x.minimo : x.rubro === filtro))
    .filter((x) => !q || coincide(x.nombre, q) || coincide(x.proveedor, q) || quienesLoUsan(e, x.id).some((p) => coincide(p.nombre, q)))

  return (
    <div className="pantalla">
      <Cabecera
        seccion="cantina"
        titulo="Subproductos y stock"
        cuentas={{ '/admin/subproductos': faltan.length }}
        frase={
          <>
            Lo que se compra y se descuenta solo con cada venta. Hay <strong>{pesos(valor)}</strong> en mercadería
            {faltan.length ? <> y <strong>{faltan.length} para reponer</strong>.</> : ', nada para reponer.'}
          </>
        }
      >
        <button className="boton" onClick={() => setEditar({ id: '', nombre: '', unidad: 'u', costo: 0, minimo: 0, rubro: 'Cocina', proveedor: negocio.proveedores[0].nombre })}>
          <Plus size={16} aria-hidden="true" /> Nuevo subproducto
        </button>
      </Cabecera>

      {faltan.length > 0 && (
        <div className="reponer">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>
            <strong>Hay que reponer {faltan.length}:</strong> {faltan.slice(0, 4).map((x) => `${x.nombre.toLowerCase()} (quedan ${cantidad(e.stock[x.id] ?? 0, x.unidad)})`).join(', ')}
            {faltan.length > 4 ? ' y más.' : '.'}
          </p>
          <button className="boton boton-chico boton-primario" onClick={() => setPedido(true)}><ClipboardList size={14} aria-hidden="true" /> Armar el pedido</button>
        </div>
      )}

      <div className="herramientas">
        <Buscador valor={q} cambiar={setQ} texto="Buscar subproducto, proveedor o producto que lo usa" />
        <div className="segmentos" role="group" aria-label="Vista">
          <button className={vista === 'stock' ? 'activa' : ''} onClick={() => setVista('stock')}>Stock</button>
          <button className={vista === 'movimientos' ? 'activa' : ''} onClick={() => setVista('movimientos')}><History size={15} aria-hidden="true" /> Movimientos</button>
        </div>
      </div>

      {vista === 'stock' ? (
        <>
          <Chips<Filtro>
            opciones={[['todos', 'Todos'], ['Cocina', 'Cocina'], ['Bebidas', 'Bebidas'], ['Deportes', 'Deportes'], ['reponer', 'Para reponer']]}
            valor={filtro}
            cambiar={setFiltro}
            cuentas={{ todos: e.insumos.length, reponer: faltan.length, Cocina: e.insumos.filter((x) => x.rubro === 'Cocina').length, Bebidas: e.insumos.filter((x) => x.rubro === 'Bebidas').length, Deportes: e.insumos.filter((x) => x.rubro === 'Deportes').length }}
          />
          {lista.length === 0 ? (
            <p className="vacio-grande">No hay subproductos que coincidan.</p>
          ) : (
            <ul className="subs-lista">
              {lista.map((x) => {
                const st = e.stock[x.id] ?? 0
                const nivel = Math.min(1, Math.max(0, st) / (x.minimo * 2.5 || 1))
                const estado = st <= 0 ? 'sin' : st < x.minimo ? 'bajo' : 'ok'
                const usan = quienesLoUsan(e, x.id)
                return (
                  <li key={x.id} className={`sub sub-${estado}`}>
                    <div className="sub-nombre">
                      <strong>{x.nombre}</strong>
                      <small>{x.rubro} · {x.proveedor}{x.merma ? ` · merma ${Math.round(x.merma * 100)} %` : ''}</small>
                    </div>
                    <div className="sub-nivel">
                      <span className={`nivel-barra nivel-${estado}`}><i style={{ width: `${nivel * 100}%` }} /></span>
                      <span className="sub-cant">
                        <strong>{cantidad(st, x.unidad)}</strong>
                        <small>{estado === 'sin' ? 'sin stock' : estado === 'bajo' ? `mínimo ${cantidad(x.minimo, x.unidad)}` : `mínimo ${cantidad(x.minimo, x.unidad)}`}</small>
                      </span>
                    </div>
                    <div className="sub-usan">
                      {usan.length ? (
                        <small>Lo usan: {usan.slice(0, 3).map((p) => p.nombre).join(', ')}{usan.length > 3 ? ` y ${usan.length - 3} más` : ''}</small>
                      ) : (
                        <small className="tenue">Ningún producto lo usa todavía</small>
                      )}
                    </div>
                    <div className="sub-costo">
                      <strong>{pesos(costoMostrado(x))}</strong>
                      <small>{precioUnidad(x)}</small>
                    </div>
                    <div className="sub-acciones">
                      <button className="boton boton-chico" onClick={() => setContar(x.id)}>Contar</button>
                      <button className="btn-icono" aria-label={`Editar ${x.nombre}`} onClick={() => setEditar(x)}><Pencil size={16} /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : (
        <Movimientos q={q} />
      )}

      {contar && <DialogoContar id={contar} cerrar={() => setContar(null)} />}
      {editar && <DialogoSubproducto inicial={editar} cerrar={() => setEditar(null)} />}
      {pedido && <DialogoPedido cerrar={() => setPedido(false)} />}
    </div>
  )
}

function Movimientos({ q }: { q: string }) {
  const e = useDatos()
  const lista = [...e.movimientos]
    .filter((m) => !q || coincide(insumoDe(e, m.insumoId)?.nombre ?? '', q) || coincide(m.detalle, q))
    .sort((a, b) => (b.dia + String(b.hora).padStart(4, '0')).localeCompare(a.dia + String(a.hora).padStart(4, '0')))
    .slice(0, 150)
  return (
    <ul className="movs-stock">
      {lista.map((m) => {
        const ins = insumoDe(e, m.insumoId)
        if (!ins) return null
        return (
          <li key={m.id}>
            <span className={`mov-tipo mov-tipo-${m.motivo}`}>{m.motivo === 'compra' ? 'Compra' : m.motivo === 'venta' ? 'Venta' : 'Ajuste'}</span>
            <span className="movs-stock-texto">
              <strong>{ins.nombre}</strong>
              <small>{m.dia === hoyClave() ? 'Hoy' : capital(fechaCorta(m.dia))} {hora(m.hora)} · {m.detalle}</small>
            </span>
            <span className={`movs-stock-cant ${m.cantidad > 0 ? 'bien' : ''}`}>{m.cantidad > 0 ? '+' : '−'}{cantidad(Math.abs(m.cantidad), ins.unidad)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function DialogoContar({ id, cerrar }: { id: string; cerrar: () => void }) {
  const e = useDatos()
  const [valor, setValor] = useState('')
  const ins = insumoDe(e, id)!
  const sistema = e.stock[ins.id] ?? 0
  const dif = valor === '' ? null : Number(valor) - sistema
  return (
    <Dialogo abierto cerrar={cerrar} titulo={`Contar ${ins.nombre.toLowerCase()}`}>
      <form
        className="formulario"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (valor !== '') ajustarStock(ins.id, Number(valor))
          cerrar()
        }}
      >
        <p className="ayuda">El sistema dice que hay <strong>{cantidad(sistema, ins.unidad)}</strong>. Si al contar hay otra cantidad, se corrige y queda registrado como ajuste.</p>
        <label className="campo">
          Hay en la cantina ({unidadLarga(ins.unidad)})
          <input type="number" inputMode="decimal" min={0} autoFocus value={valor} onChange={(ev) => setValor(ev.target.value)} />
        </label>
        {dif !== null && dif !== 0 && (
          <p className={`arqueo ${dif > 0 ? 'arqueo-sobra' : 'arqueo-falta'}`}>
            {dif > 0 ? 'Sobran' : 'Faltan'} {cantidad(Math.abs(dif), ins.unidad)}: {pesos(Math.abs(dif) * ins.costo)} a costo.
          </p>
        )}
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario" disabled={valor === ''}>Guardar conteo</button>
        </div>
      </form>
    </Dialogo>
  )
}

function DialogoSubproducto({ inicial, cerrar }: { inicial: Insumo; cerrar: () => void }) {
  const nuevo = !inicial.id
  const [x, setX] = useState<Insumo>(inicial)
  // El costo se carga como se compra: por unidad, por kilo o por litro
  const [costo, setCosto] = useState(String(costoMostrado(inicial) || ''))
  const set = (c: Partial<Insumo>) => setX({ ...x, ...c })
  return (
    <Dialogo abierto cerrar={cerrar} titulo={nuevo ? 'Nuevo subproducto' : `Editar ${inicial.nombre.toLowerCase()}`} ancho={560}>
      <form
        className="formulario"
        onSubmit={(ev) => {
          ev.preventDefault()
          const c = Number(costo) || 0
          guardarInsumo({ ...x, id: x.id || `i${Date.now()}`, nombre: x.nombre.trim(), costo: x.unidad === 'u' ? c : c / 1000 })
          cerrar()
        }}
      >
        <label className="campo">
          Nombre
          <input value={x.nombre} onChange={(ev) => set({ nombre: ev.target.value })} placeholder="Ej.: Pan de hamburguesa" required autoFocus />
        </label>
        <div className="campo">
          Se cuenta en
          <div className="segmentos segmentos-ancho">
            {(['u', 'g', 'ml'] as const).map((u) => (
              <button key={u} type="button" className={x.unidad === u ? 'activa' : ''} onClick={() => set({ unidad: u })}>{u === 'u' ? 'Unidades' : u === 'g' ? 'Gramos (kg)' : 'Mililitros (L)'}</button>
            ))}
          </div>
        </div>
        <div className="campos-2">
          <label className="campo">
            Costo {x.unidad === 'u' ? 'por unidad' : x.unidad === 'g' ? 'por kilo' : 'por litro'}
            <input type="number" inputMode="decimal" min={0} value={costo} onChange={(ev) => setCosto(ev.target.value)} required />
          </label>
          <label className="campo">
            Avisar cuando queden menos de ({x.unidad === 'u' ? 'u.' : x.unidad})
            <input type="number" inputMode="decimal" min={0} value={x.minimo} onChange={(ev) => set({ minimo: Number(ev.target.value) })} />
          </label>
        </div>
        <div className="campos-2">
          <label className="campo">
            Rubro
            <select value={x.rubro} onChange={(ev) => set({ rubro: ev.target.value as Rubro })}>
              <option>Cocina</option><option>Bebidas</option><option>Deportes</option>
            </select>
          </label>
          <label className="campo">
            Proveedor
            <select value={x.proveedor} onChange={(ev) => set({ proveedor: ev.target.value })}>{negocio.proveedores.map((p) => <option key={p.nombre}>{p.nombre}</option>)}</select>
          </label>
        </div>
        <label className="campo">
          Merma: cuánto se pierde al prepararlo ({Math.round((x.merma ?? 0) * 100)} %)
          <input type="range" min={0} max={40} value={Math.round((x.merma ?? 0) * 100)} onChange={(ev) => set({ merma: Number(ev.target.value) / 100 })} />
        </label>
        <p className="ayuda">Ej.: del lomo se limpia la grasa y se pierde un 12 %. Con la merma, el costo de cada receta y lo que se descuenta del stock son los reales.</p>
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario" disabled={!x.nombre.trim()}>{nuevo ? 'Crear subproducto' : 'Guardar'}</button>
        </div>
      </form>
    </Dialogo>
  )
}

/** El pedido de lo que falta, separado por proveedor, para mandarlo por WhatsApp o cargarlo cuando llega. */
function DialogoPedido({ cerrar }: { cerrar: () => void }) {
  const e = useDatos()
  const inicial = useMemo(
    () => Object.fromEntries(bajoMinimo(e).map((x) => [x.id, Math.ceil(Math.max(x.minimo * 2 - (e.stock[x.id] ?? 0), x.minimo) / (x.unidad === 'u' ? 1 : 500)) * (x.unidad === 'u' ? 1 : 500)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [cant, setCant] = useState<Record<string, number>>(inicial)
  const [hechos, setHechos] = useState<string[]>([])
  const porProv = negocio.proveedores
    .map((p) => ({ p, items: Object.keys(cant).map((id) => insumoDe(e, id)!).filter((x) => x.proveedor === p.nombre) }))
    .filter((g) => g.items.length)
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Pedido de reposición" ancho={640}>
      <p className="ayuda">Armado con lo que está bajo el mínimo, para llegar al doble. Cambiá las cantidades si querés.</p>
      <div className="pedido">
        {porProv.map(({ p, items }) => {
          const total = items.reduce((s, x) => s + (cant[x.id] ?? 0) * x.costo, 0)
          const texto = `Hola ${p.contacto.split(' ')[0]}! Te paso el pedido de ${negocio.nombre}:\n${items.map((x) => `• ${cantidad(cant[x.id] ?? 0, x.unidad)} de ${x.nombre.toLowerCase()}`).join('\n')}\nGracias!`
          const listo = hechos.includes(p.nombre)
          return (
            <section key={p.nombre} className={`pedido-prov ${listo ? 'pedido-listo' : ''}`}>
              <header>
                <strong>{p.nombre}</strong>
                <small>{p.entrega} · {p.contacto}</small>
              </header>
              <ul>
                {items.map((x) => (
                  <li key={x.id}>
                    <span>{x.nombre}</span>
                    <input type="number" inputMode="decimal" min={0} value={cant[x.id]} onChange={(ev) => setCant({ ...cant, [x.id]: Number(ev.target.value) })} aria-label={`Cantidad de ${x.nombre}`} />
                    <span className="tenue">{x.unidad === 'u' ? 'u.' : x.unidad}</span>
                  </li>
                ))}
              </ul>
              <footer>
                <span>Aprox. <strong>{pesos(total)}</strong></span>
                <a className="boton boton-chico boton-wsp" href={`https://wa.me/54${p.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
                  <Send size={14} aria-hidden="true" /> Pedir por WhatsApp
                </a>
                <button
                  className="boton boton-chico"
                  disabled={listo}
                  onClick={() => {
                    cargarCompra(p.nombre, items.map((x) => ({ insumoId: x.id, cantidad: cant[x.id] ?? 0, costo: x.costo })).filter((x) => x.cantidad > 0), 'transferencia')
                    setHechos([...hechos, p.nombre])
                  }}
                >
                  {listo ? 'Llegó ✓' : 'Ya llegó: cargar'}
                </button>
              </footer>
            </section>
          )
        })}
      </div>
      <div className="acciones-fila"><button className="boton boton-primario" onClick={cerrar}>Listo</button></div>
    </Dialogo>
  )
}
