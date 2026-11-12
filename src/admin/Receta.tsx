// El armador de recetas: qué lleva una porción, cuánto cuesta, cuánto deja y a qué precio conviene venderlo.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Copy, Minus, Plus, Search, Trash2 } from 'lucide-react'
import type { Categoria, ItemCantina, LineaReceta } from '../config/negocio'
import { borrarProducto, costeoReceta, explotarReceta, guardarProducto, insumoDe, productoDe, useDatos } from '../lib/datos'
import { pct, pesos } from '../lib/formato'
import { cantidad, categorias, coincide, colorDe, IconoProducto, IconoSuelto, muestras, nombresIconos, tintaSobre } from './comun'

const paleta = ['#e2f24b', '#2f6fd6', '#7fb2ff', '#12804a', '#f08a4b', '#d6336c', '#9b7be0', '#8ea2c8']

/** Cuánto sube o baja cada toque del +/−: de a 1 las unidades, de a 10 los gramos y mililitros. */
const paso = (u: 'u' | 'g' | 'ml' | 'p') => (u === 'u' || u === 'p' ? 1 : 10)

/** Cada producto arma su propio editor: al pasar de uno a otro (o a uno nuevo) arranca de cero. */
export function Receta() {
  const { id = 'nuevo' } = useParams()
  return <EditorReceta key={id} id={id} />
}

function EditorReceta({ id }: { id: string }) {
  const e = useDatos()
  const [sp] = useSearchParams()
  const ir = useNavigate()
  const original = productoDe(e, id)
  const nuevo = !original
  const [p, setP] = useState<ItemCantina>(
    () => original ?? { id: `p${Date.now()}`, nombre: sp.get('nombre') ?? '', precio: 0, categoria: 'Cocina', receta: [], icono: 'hamburguesa' },
  )
  const [objetivo, setObjetivo] = useState(30)
  const [guardado, setGuardado] = useState(false)
  const [sim, setSim] = useState(0)

  const k = costeoReceta(e, p.receta, p.precio)
  const sugerido = k.costo ? Math.ceil(k.costo / (objetivo / 100) / 500) * 500 : 0
  const cambio = JSON.stringify(original) !== JSON.stringify(p)
  const set = (c: Partial<ItemCantina>) => {
    setP({ ...p, ...c })
    setGuardado(false)
  }
  const setLinea = (i: number, c: Partial<LineaReceta>) => set({ receta: p.receta.map((l, j) => (j === i ? { ...l, ...c } : l)) })
  const quitar = (i: number) => set({ receta: p.receta.filter((_, j) => j !== i) })

  // Costo de cada línea, para la barra de composición
  const lineas = p.receta.map((l) => {
    const sub = explotarReceta(e, [l])
    const costo = sub.reduce((s, x) => s + x.cantidad * (insumoDe(e, x.insumoId)?.costo ?? 0), 0)
    if (l.productoId) {
      const pr = productoDe(e, l.productoId)
      return { l, nombre: pr?.nombre ?? '?', unidad: 'p' as const, costo, merma: 0, detalle: pr ? `Producto · ${pesos(pr.precio)} suelto` : '' }
    }
    const i = insumoDe(e, l.insumoId!)
    return { l, nombre: i?.nombre ?? '?', unidad: i?.unidad ?? 'u', costo, merma: i?.merma ?? 0, detalle: i ? `${pesos(i.unidad === 'u' ? i.costo : i.costo * 1000)} ${i.unidad === 'u' ? 'c/u' : i.unidad === 'g' ? 'el kg' : 'el litro'}` : '' }
  })
  const valido = p.nombre.trim().length > 1 && p.precio > 0

  const guardar = () => {
    if (!valido) return
    guardarProducto({ ...p, nombre: p.nombre.trim() })
    setGuardado(true)
    if (nuevo) ir(`/admin/productos/${p.id}`, { replace: true })
  }

  return (
    <div className="pantalla receta-editor">
      <div className="receta-arriba">
        <Link to="/admin/productos" className="volver-chico"><ArrowLeft size={16} aria-hidden="true" /> Productos y recetas</Link>
        {!nuevo && (
          <div className="receta-arriba-acciones">
            <button className="boton boton-chico" onClick={() => { const copia = { ...p, id: `p${Date.now()}`, nombre: `${p.nombre} (copia)` }; guardarProducto(copia); ir(`/admin/productos/${copia.id}`) }}>
              <Copy size={14} aria-hidden="true" /> Duplicar
            </button>
            <button className="boton boton-chico boton-peligro" onClick={() => { borrarProducto(p.id); ir('/admin/productos') }}>
              <Trash2 size={14} aria-hidden="true" /> Borrar
            </button>
          </div>
        )}
      </div>

      {/* Cabecera del producto: así se ve en el mostrador */}
      <section className="receta-heroe" style={{ ['--color' as string]: colorDe(p), ['--tinta' as string]: tintaSobre(colorDe(p)) }}>
        <IconoProducto p={p} tam={76} icono={38} />
        <div className="receta-heroe-campos">
          <input className="receta-nombre" value={p.nombre} onChange={(ev) => set({ nombre: ev.target.value })} placeholder="Nombre del producto" aria-label="Nombre del producto" autoFocus={nuevo} />
          <div className="chips-filtro chips-heroe" role="group" aria-label="Categoría">
            {categorias.map((c) => (
              <button key={c} type="button" className={p.categoria === c ? 'activa' : ''} onClick={() => set({ categoria: c as Categoria, color: undefined })}>{c}</button>
            ))}
          </div>
        </div>
        <label className="receta-precio-campo">
          <span>Precio de venta</span>
          <span className="con-signo">
            $<input type="number" inputMode="numeric" min={0} step={100} value={p.precio || ''} onChange={(ev) => set({ precio: Number(ev.target.value) })} placeholder="0" />
          </span>
        </label>
      </section>

      <div className="receta-cuerpo">
        <div className="columna">
          <section className="tarjeta">
            <div className="tarjeta-cabeza">
              <h2>Qué lleva una porción</h2>
              <span className="tenue">{p.receta.length ? `${p.receta.length} ${p.receta.length === 1 ? 'cosa' : 'cosas'}` : ''}</span>
            </div>
            <Agregar agregar={(l) => set({ receta: [...p.receta.filter((x) => !(x.insumoId && x.insumoId === l.insumoId) && !(x.productoId && x.productoId === l.productoId)), l] })} excluir={p.id} />

            {p.receta.length === 0 ? (
              <div className="receta-vacia">
                <p><strong>Todavía no lleva nada.</strong> Buscá arriba los subproductos: pan, medallón, fernet… Cada vez que se venda, se descuentan solos del stock.</p>
                <p className="ayuda">Si es un servicio (como el alquiler de paleta) podés dejarlo vacío.</p>
              </div>
            ) : (
              <ol className="receta-filas">
                {lineas.map(({ l, nombre, unidad, costo, merma, detalle }, i) => (
                  <li key={(l.insumoId ?? '') + (l.productoId ?? '')} className="receta-fila">
                    <span className="receta-fila-color" style={{ background: paleta[i % paleta.length] }} aria-hidden="true" />
                    <span className="receta-fila-texto">
                      <strong>{nombre}{l.productoId && <em className="etiqueta-producto">producto</em>}</strong>
                      <small>{detalle}{merma ? ` · merma ${Math.round(merma * 100)} %` : ''}</small>
                    </span>
                    <span className="paso-a-paso">
                      <button type="button" aria-label={`Menos ${nombre}`} onClick={() => setLinea(i, { cantidad: Math.max(paso(unidad), l.cantidad - paso(unidad)) })}><Minus size={15} /></button>
                      <input type="number" inputMode="decimal" min={0} value={l.cantidad} onChange={(ev) => setLinea(i, { cantidad: Number(ev.target.value) })} aria-label={`Cantidad de ${nombre}`} />
                      <span className="paso-unidad">{unidad === 'p' ? 'u.' : unidad === 'u' ? 'u.' : unidad}</span>
                      <button type="button" aria-label={`Más ${nombre}`} onClick={() => setLinea(i, { cantidad: l.cantidad + paso(unidad) })}><Plus size={15} /></button>
                    </span>
                    <span className="receta-fila-costo">
                      <strong>{pesos(costo)}</strong>
                      <small>{k.costo ? pct(costo / k.costo) : '—'} del costo</small>
                    </span>
                    <button type="button" className="btn-icono" aria-label={`Quitar ${nombre}`} onClick={() => quitar(i)}><Trash2 size={16} /></button>
                  </li>
                ))}
              </ol>
            )}

            {p.receta.length > 0 && (
              <div className="composicion" aria-label="De qué está hecho el costo">
                {lineas.map(({ l, nombre, costo }, i) => (
                  <i key={(l.insumoId ?? '') + (l.productoId ?? '')} style={{ flexGrow: Math.max(costo, 0.0001), background: paleta[i % paleta.length] }} title={`${nombre}: ${pesos(costo)}`} />
                ))}
              </div>
            )}
          </section>

          {p.receta.length > 0 && (
            <section className="tarjeta">
              <div className="tarjeta-cabeza">
                <h2>Al vender 1 se descuenta del stock</h2>
                <button type="button" className="boton boton-chico" onClick={() => setSim(sim + 1)}>Simular venta</button>
              </div>
              <ul className={`descuento ${sim ? 'simulando' : ''}`} key={sim}>
                {explotarReceta(e, p.receta).map((x) => {
                  const i = insumoDe(e, x.insumoId)!
                  const st = e.stock[x.insumoId] ?? 0
                  return (
                    <li key={x.insumoId}>
                      <span className="descuento-cant">−{cantidad(x.cantidad, i.unidad)}</span>
                      <span>{i.nombre}{i.merma ? <small> (con {Math.round(i.merma * 100)} % de merma)</small> : null}</span>
                      <span className={st - (sim ? x.cantidad : 0) < i.minimo ? 'mal' : 'tenue'}>{sim ? `quedarían ${cantidad(st - x.cantidad, i.unidad)}` : `quedan ${cantidad(st, i.unidad)}`}</span>
                    </li>
                  )
                })}
              </ul>
              {p.receta.some((l) => l.productoId) && <p className="ayuda">Es un combo: se abre cada producto que lleva y se descuenta su receta.</p>}
            </section>
          )}

          <section className="tarjeta">
            <div className="tarjeta-cabeza">
              <h2>Cómo se ve en el mostrador</h2>
              <label className="interruptor-linea">
                <input type="checkbox" checked={!p.pausado} onChange={(ev) => set({ pausado: !ev.target.checked })} />
                {p.pausado ? 'Pausado' : 'A la venta'}
              </label>
            </div>
            <div className="apariencia">
              <div className="muestras" role="group" aria-label="Color">
                {muestras.map((m) => (
                  <button key={m} type="button" className={colorDe(p) === m ? 'activa' : ''} style={{ background: m }} aria-label={`Color ${m}`} onClick={() => set({ color: m })} />
                ))}
              </div>
              <div className="iconos-elegir" role="group" aria-label="Ícono">
                {nombresIconos.map((n) => (
                  <button key={n} type="button" className={p.icono === n ? 'activa' : ''} aria-label={`Ícono ${n}`} onClick={() => set({ icono: n })}>
                    <IconoSuelto nombre={n} />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* La ficha de costo, siempre a la vista */}
        <aside className="ficha-costo" aria-label="Ficha de costo">
          <div className="ficha-costo-numeros">
            <div><span>Cuesta hacerlo</span><strong>{pesos(k.costo)}</strong></div>
            <div><span>Se vende a</span><strong>{pesos(p.precio)}</strong></div>
            <div className="ficha-costo-gana"><span>Te deja por unidad</span><strong>{pesos(k.ganancia)}</strong></div>
          </div>
          <Medidor valor={k.foodCost} objetivo={objetivo / 100} />
          <p className="ficha-costo-frase">
            {!p.precio ? 'Poné el precio para ver cuánto deja.' : !k.costo ? 'Sin receta, todo lo que entra es ganancia.' : k.foodCost <= objetivo / 100 ? `Bien: el costo es el ${pct(k.foodCost)} del precio, menos que tu objetivo.` : `Ojo: el costo es el ${pct(k.foodCost)} del precio, más que tu objetivo del ${objetivo} %.`}
          </p>
          {k.costo > 0 && (
            <div className="sugerido">
              <label>
                <span>Quiero que el costo sea el <strong>{objetivo} %</strong> del precio</span>
                <input type="range" min={15} max={50} step={1} value={objetivo} onChange={(ev) => setObjetivo(Number(ev.target.value))} />
              </label>
              <div className="sugerido-fila">
                <span>Precio sugerido <strong>{pesos(sugerido)}</strong></span>
                <button type="button" className="boton boton-chico" disabled={sugerido === p.precio} onClick={() => set({ precio: sugerido })}>Usar este precio</button>
              </div>
            </div>
          )}
          {p.receta.length > 0 && (
            <p className="ficha-costo-stock">
              Con el stock de hoy alcanza para <strong>{k.alcanza === Infinity ? '—' : k.alcanza}</strong>
              {k.limita && <> · lo que primero se acaba: {insumoDe(e, k.limita)?.nombre.toLowerCase()}</>}
            </p>
          )}
          <div className="ficha-costo-guardar">
            <button className="boton boton-amarillo boton-ancho" disabled={!valido || (!cambio && !nuevo)} onClick={guardar}>
              {guardado && !cambio ? 'Guardado ✓' : nuevo ? 'Crear producto' : 'Guardar cambios'}
            </button>
            {!valido && <small>Falta el nombre o el precio.</small>}
          </div>
        </aside>
      </div>
    </div>
  )
}

/** El medidor del costo: verde si está por debajo del objetivo, amarillo cerca, rojo si se pasa. */
function Medidor({ valor, objetivo }: { valor: number; objetivo: number }) {
  const v = Math.min(1, Math.max(0, valor))
  const r = 52
  const largo = Math.PI * r
  const color = valor <= objetivo ? '#7ee2a8' : valor <= objetivo + 0.08 ? '#e2f24b' : '#ff8a80'
  const ang = Math.PI * (1 - objetivo)
  return (
    <div className="medidor">
      <svg viewBox="0 0 140 80" aria-hidden="true">
        <path d={`M ${70 - r} 72 A ${r} ${r} 0 0 1 ${70 + r} 72`} stroke="rgb(255 255 255 / 0.14)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={`M ${70 - r} 72 A ${r} ${r} 0 0 1 ${70 + r} 72`} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={`${largo * v} ${largo}`} />
        <line x1={70 + Math.cos(ang) * (r - 11)} y1={72 - Math.sin(ang) * (r - 11)} x2={70 + Math.cos(ang) * (r + 11)} y2={72 - Math.sin(ang) * (r + 11)} stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="medidor-texto">
        <strong>{pct(valor)}</strong>
        <span>de costo</span>
      </div>
    </div>
  )
}

/** Buscador para sumar subproductos (o productos, para armar combos) a la receta. */
function Agregar({ agregar, excluir }: { agregar: (l: LineaReceta) => void; excluir: string }) {
  const e = useDatos()
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fuera = (ev: MouseEvent) => !caja.current?.contains(ev.target as Node) && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])
  const subs = useMemo(() => e.insumos.filter((x) => !q || coincide(x.nombre, q) || coincide(x.rubro, q)), [e.insumos, q])
  const prods = useMemo(() => e.productos.filter((x) => x.id !== excluir && x.receta.length && (!q || coincide(x.nombre, q))), [e.productos, q, excluir])
  const elegir = (l: LineaReceta) => {
    agregar(l)
    setQ('')
    setAbierto(false)
  }
  return (
    <div className="agregar" ref={caja}>
      <label className="buscador-cantina buscador-grande">
        <Search size={18} aria-hidden="true" />
        <input
          value={q}
          onFocus={() => setAbierto(true)}
          onChange={(ev) => { setQ(ev.target.value); setAbierto(true) }}
          onKeyDown={(ev) => {
            if (ev.key === 'Escape') setAbierto(false)
            if (ev.key === 'Enter' && subs[0]) { ev.preventDefault(); elegir({ insumoId: subs[0].id, cantidad: subs[0].unidad === 'u' ? 1 : 100 }) }
          }}
          placeholder="Sumar un subproducto: pan, medallón, fernet…"
          aria-label="Sumar un subproducto"
        />
      </label>
      {abierto && (
        <div className="agregar-lista" role="listbox">
          {subs.length > 0 && <p className="agregar-grupo">Subproductos</p>}
          {subs.slice(0, 8).map((x) => (
            <button key={x.id} type="button" role="option" onClick={() => elegir({ insumoId: x.id, cantidad: x.unidad === 'u' ? 1 : 100 })}>
              <span>{x.nombre}</span>
              <small>{x.rubro} · {pesos(x.unidad === 'u' ? x.costo : x.costo * 1000)} {x.unidad === 'u' ? 'c/u' : x.unidad === 'g' ? 'el kg' : 'el L'} · hay {cantidad(e.stock[x.id] ?? 0, x.unidad)}</small>
            </button>
          ))}
          {prods.length > 0 && <p className="agregar-grupo">Productos (para armar un combo)</p>}
          {prods.slice(0, 5).map((x) => (
            <button key={x.id} type="button" role="option" onClick={() => elegir({ productoId: x.id, cantidad: 1 })}>
              <span><IconoProducto p={x} tam={22} icono={13} /> {x.nombre}</span>
              <small>{x.categoria} · {pesos(x.precio)}</small>
            </button>
          ))}
          {!subs.length && !prods.length && (
            <p className="agregar-nada">No hay nada con “{q}”. <Link to={`/admin/subproductos?nuevo=${encodeURIComponent(q)}`}>Crear el subproducto “{q}”</Link></p>
          )}
        </div>
      )}
    </div>
  )
}
