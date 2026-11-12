// Productos y recetas: la carta con lo que cuesta hacer cada cosa, lo que deja y para cuántos alcanza el stock.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutGrid, Map as MapaIcono, Plus } from 'lucide-react'
import type { Categoria } from '../config/negocio'
import { costeo, insumoDe, productoDe, useDatos, vendidosDesde, type Estado } from '../lib/datos'
import { hoyClave, pct, pesos, sumarDias } from '../lib/formato'
import { bajoMinimo, Buscador, Cabecera, categorias, Chips, coincide, colorDe, IconoProducto } from './comun'

type Vista = 'tarjetas' | 'mapa'
type Orden = 'vendidos' | 'margen' | 'nombre'

/** Los ingredientes de un producto en una línea corta: "1 pan · 1 medallón · 1 cheddar". */
export function resumenReceta(e: Estado, id: string) {
  const p = productoDe(e, id)
  if (!p) return ''
  return p.receta
    .map((l) => {
      if (l.productoId) return `${l.cantidad > 1 ? `${l.cantidad} × ` : ''}${productoDe(e, l.productoId)?.nombre ?? '?'}`
      const i = insumoDe(e, l.insumoId!)
      if (!i) return '?'
      const corto = i.nombre.split(' (')[0].toLowerCase()
      return i.unidad === 'u' ? `${l.cantidad} ${corto}` : `${l.cantidad} ${i.unidad} ${corto}`
    })
    .join(' · ')
}

export function Productos() {
  const e = useDatos()
  const ir = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Categoria | 'todos'>('todos')
  const [vista, setVista] = useState<Vista>('tarjetas')
  const [orden, setOrden] = useState<Orden>('vendidos')
  const vendidos = useMemo(() => vendidosDesde(e, sumarDias(hoyClave(), -29)), [e])

  const con = e.productos.filter((p) => p.receta.length)
  const margenMedio = con.reduce((s, p) => s + costeo(e, p.id).margen, 0) / Math.max(1, con.length)
  const estrella = [...e.productos].sort((a, b) => (vendidos.get(b.id) ?? 0) * costeo(e, b.id).ganancia - (vendidos.get(a.id) ?? 0) * costeo(e, a.id).ganancia)[0]
  const sinStock = e.productos.filter((p) => p.receta.length && costeo(e, p.id).alcanza < 6)

  // El buscador encuentra por nombre del producto y también por lo que lleva: "medallón" trae todas las hamburguesas
  const lista = e.productos
    .filter((p) => cat === 'todos' || p.categoria === cat)
    .filter((p) => !q || coincide(p.nombre, q) || coincide(resumenReceta(e, p.id), q) || coincide(p.categoria, q))
    .sort((a, b) =>
      orden === 'nombre' ? a.nombre.localeCompare(b.nombre) : orden === 'margen' ? costeo(e, b.id).margen - costeo(e, a.id).margen : (vendidos.get(b.id) ?? 0) - (vendidos.get(a.id) ?? 0),
    )
  const cuentas = Object.fromEntries(categorias.map((c) => [c, e.productos.filter((p) => p.categoria === c).length])) as Record<Categoria, number>

  return (
    <div className="pantalla">
      <Cabecera
        seccion="cantina"
        titulo="Productos y recetas"
        cuentas={{ '/admin/subproductos': bajoMinimo(e).length }}
        frase={
          <>
            {e.productos.length} productos con un margen promedio de <strong>{pct(margenMedio)}</strong>. El que más plata deja este mes: <strong>{estrella?.nombre}</strong>.
          </>
        }
      >
        <Link className="boton boton-primario" to="/admin/productos/nuevo">
          <Plus size={16} aria-hidden="true" /> Nuevo producto
        </Link>
      </Cabecera>

      {sinStock.length > 0 && (
        <p className="aviso-linea">
          <strong>Se están por acabar:</strong> {sinStock.map((p) => `${p.nombre} (${costeo(e, p.id).alcanza})`).join(', ')}. Mirá qué subproducto falta en cada receta.
        </p>
      )}

      <div className="herramientas">
        <Buscador valor={q} cambiar={setQ} texto="Buscar producto o lo que lleva" />
        <div className="herramientas-derecha">
          <select className="select-chico" value={orden} onChange={(ev) => setOrden(ev.target.value as Orden)} aria-label="Ordenar">
            <option value="vendidos">Más vendidos</option>
            <option value="margen">Mayor margen</option>
            <option value="nombre">De la A a la Z</option>
          </select>
          <div className="segmentos" role="group" aria-label="Vista">
            <button className={vista === 'tarjetas' ? 'activa' : ''} onClick={() => setVista('tarjetas')} aria-label="Ver tarjetas"><LayoutGrid size={16} aria-hidden="true" /> <span className="solo-ancho">Tarjetas</span></button>
            <button className={vista === 'mapa' ? 'activa' : ''} onClick={() => setVista('mapa')} aria-label="Ver el mapa de la carta"><MapaIcono size={16} aria-hidden="true" /> <span className="solo-ancho">Mapa de la carta</span></button>
          </div>
        </div>
      </div>
      <Chips<Categoria | 'todos'>
        opciones={[['todos', 'Todos'], ...categorias.map((c) => [c, c] as [Categoria, string])]}
        valor={cat}
        cambiar={setCat}
        cuentas={{ todos: e.productos.length, ...cuentas }}
      />

      {vista === 'mapa' ? (
        <MapaCarta vendidos={vendidos} />
      ) : lista.length === 0 ? (
        <div className="vacio-grande">
          <p>No hay productos que coincidan con “{q}”.</p>
          <button className="boton" onClick={() => ir(`/admin/productos/nuevo?nombre=${encodeURIComponent(q)}`)}><Plus size={16} aria-hidden="true" /> Crear “{q}”</button>
        </div>
      ) : (
        <ul className="productos-lista">
          {lista.map((p) => {
            const k = costeo(e, p.id)
            const v = vendidos.get(p.id) ?? 0
            const conReceta = p.receta.length > 0
            return (
              <li key={p.id}>
                <Link to={`/admin/productos/${p.id}`} className={`ficha-producto ${p.pausado ? 'pausado' : ''}`} style={{ ['--color' as string]: colorDe(p) }}>
                  <div className="ficha-producto-cabeza">
                    <IconoProducto p={p} />
                    <span className="ficha-producto-nombre">
                      <strong>{p.nombre}</strong>
                      <small>{p.categoria}{p.pausado ? ' · pausado' : ''}</small>
                    </span>
                    <span className="ficha-producto-precio">{pesos(p.precio)}</span>
                  </div>
                  <p className="ficha-producto-receta">{conReceta ? resumenReceta(e, p.id) : 'Servicio: no descuenta stock'}</p>
                  {conReceta && (
                    <div className="costo-barra" title={`Costo ${pesos(k.costo)} de ${pesos(p.precio)}`}>
                      <i style={{ width: `${Math.min(100, k.foodCost * 100)}%` }} />
                    </div>
                  )}
                  <div className="ficha-producto-pie">
                    {conReceta ? (
                      <>
                        <span>Costo <strong>{pesos(k.costo)}</strong></span>
                        <span className={`margen ${k.margen >= 0.65 ? 'margen-alto' : k.margen < 0.45 ? 'margen-bajo' : ''}`}>{pct(k.margen)} margen</span>
                      </>
                    ) : (
                      <span className="margen margen-alto">100% margen</span>
                    )}
                    <span className={k.alcanza < 6 ? 'mal' : 'tenue'}>{!conReceta ? '' : k.alcanza === 0 ? 'Sin stock' : `Alcanza ${k.alcanza > 999 ? '+999' : k.alcanza}`}</span>
                    <span className="tenue">{v} vendidos</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Mapa de la carta (lo que en gastronomía se llama ingeniería de menú):
 * cuánto se vende cada producto contra cuánto deja cada uno. Cuatro grupos con qué hacer en cada caso.
 */
function MapaCarta({ vendidos }: { vendidos: Map<string, number> }) {
  const e = useDatos()
  const puntos = e.productos.map((p) => ({ p, v: vendidos.get(p.id) ?? 0, g: costeo(e, p.id).ganancia }))
  const medV = puntos.reduce((s, x) => s + x.v, 0) / puntos.length
  const medG = puntos.reduce((s, x) => s + x.g, 0) / puntos.length
  const maxV = Math.max(...puntos.map((x) => x.v), 1) * 1.08
  const maxG = Math.max(...puntos.map((x) => x.g), 1) * 1.1
  const W = 640
  const H = 400
  const pad = { l: 16, r: 16, t: 16, b: 16 }
  const X = (v: number) => pad.l + (v / maxV) * (W - pad.l - pad.r)
  const Y = (g: number) => H - pad.b - (g / maxG) * (H - pad.t - pad.b)
  const grupo = (x: (typeof puntos)[number]) => (x.v >= medV ? (x.g >= medG ? 'estrella' : 'caballito') : x.g >= medG ? 'joya' : 'revisar')
  const grupos = [
    { k: 'estrella', t: 'Estrellas', d: 'Se venden mucho y dejan mucho. No los toques, mostralos primero.' },
    { k: 'caballito', t: 'Caballitos de batalla', d: 'Se venden mucho pero dejan poco. Subiles un poco el precio o achicá el costo.' },
    { k: 'joya', t: 'Joyitas escondidas', d: 'Dejan mucho pero se venden poco. Ofrecelos en la cancha o armá un combo.' },
    { k: 'revisar', t: 'Para revisar', d: 'Se venden poco y dejan poco. Pensá si vale la pena tenerlos.' },
  ]
  return (
    <div className="mapa-carta">
      <section className="tarjeta mapa-grafico">
        <div className="tarjeta-cabeza">
          <h2>Cuánto se vende contra cuánto deja</h2>
          <span className="tenue">últimos 30 días</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa de la carta: unidades vendidas contra ganancia por unidad">
          <rect x={X(medV)} y={pad.t} width={W - pad.r - X(medV)} height={Y(medG) - pad.t} className="cuadro cuadro-estrella" />
          <rect x={X(medV)} y={Y(medG)} width={W - pad.r - X(medV)} height={H - pad.b - Y(medG)} className="cuadro cuadro-caballito" />
          <rect x={pad.l} y={pad.t} width={X(medV) - pad.l} height={Y(medG) - pad.t} className="cuadro cuadro-joya" />
          <rect x={pad.l} y={Y(medG)} width={X(medV) - pad.l} height={H - pad.b - Y(medG)} className="cuadro cuadro-revisar" />
          <text x={W - pad.r - 10} y={pad.t + 22} textAnchor="end" className="cuadro-titulo">Estrellas</text>
          <text x={W - pad.r - 10} y={H - pad.b - 12} textAnchor="end" className="cuadro-titulo">Caballitos</text>
          <text x={pad.l + 10} y={pad.t + 22} className="cuadro-titulo">Joyitas</text>
          <text x={pad.l + 10} y={H - pad.b - 12} className="cuadro-titulo">Para revisar</text>
          {puntos.map(({ p, v, g }) => (
            <Link key={p.id} to={`/admin/productos/${p.id}`}>
              <g className="mapa-punto">
                <circle cx={X(v)} cy={Y(g)} r={9} fill={colorDe(p)} stroke="#0a1d42" strokeWidth={1.5} />
                <text x={X(v) + (X(v) > W - 150 ? -14 : 14)} y={Y(g) + 5} textAnchor={X(v) > W - 150 ? 'end' : 'start'}>{p.nombre.replace(' de jamón y queso', '').replace(' (1 L)', '')}</text>
              </g>
            </Link>
          ))}
        </svg>
        <p className="ayuda">Hacia la derecha, más vendidos. Hacia arriba, más ganancia por unidad. Las líneas son el promedio de la carta.</p>
      </section>
      <div className="mapa-grupos">
        {grupos.map((gr) => {
          const de = puntos.filter((x) => grupo(x) === gr.k).sort((a, b) => b.v * b.g - a.v * a.g)
          return (
            <section key={gr.k} className={`mapa-grupo grupo-${gr.k}`}>
              <h3>{gr.t} <span>{de.length}</span></h3>
              <p>{gr.d}</p>
              <ul>
                {de.map(({ p, v, g }) => (
                  <li key={p.id}>
                    <Link to={`/admin/productos/${p.id}`}>
                      <IconoProducto p={p} tam={28} icono={15} />
                      <span>{p.nombre}</span>
                      <small>{v} u. · deja {pesos(g)}</small>
                    </Link>
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
