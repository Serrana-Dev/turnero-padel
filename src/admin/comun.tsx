// Piezas que comparten la cantina, el stock y la caja: íconos de productos, cantidades, buscador y la barra de submódulos.
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Beer, Croissant, CupSoda, GlassWater, Hamburger, Hand, Layers, Martini, Milk, Package, Sandwich, Search, Snowflake, Utensils, Wine, X,
  type LucideIcon,
} from 'lucide-react'
import type { Categoria, Insumo, ItemCantina } from '../config/negocio'
import type { Estado } from '../lib/datos'
import { pesos } from '../lib/formato'

/** 1500 g → "1,5 kg", 3800 ml → "3,8 L", 12 u → "12 u." */
export function cantidad(n: number, unidad: Insumo['unidad']) {
  const f = (x: number) => x.toLocaleString('es-AR', { maximumFractionDigits: 1 })
  if (unidad === 'g') return Math.abs(n) >= 1000 ? `${f(n / 1000)} kg` : `${f(n)} g`
  if (unidad === 'ml') return Math.abs(n) >= 1000 ? `${f(n / 1000)} L` : `${f(n)} ml`
  return `${f(n)} u.`
}
export const unidadLarga = (u: Insumo['unidad']) => (u === 'u' ? 'unidades' : u === 'g' ? 'gramos' : 'mililitros')
export const precioUnidad = (x: Insumo) => (x.unidad === 'u' ? 'por unidad' : x.unidad === 'g' ? 'el kilo' : 'el litro')
export const costoMostrado = (x: Insumo) => (x.unidad === 'u' ? x.costo : x.costo * 1000)

export const bajoMinimo = (e: Pick<Estado, 'insumos' | 'stock'>) => e.insumos.filter((x) => (e.stock[x.id] ?? 0) < x.minimo)

// ——— Colores e íconos de los productos (como las fichas de un mostrador) ———
export const categorias: Categoria[] = ['Bebidas', 'Tragos', 'Cocina', 'Combos', 'Deportes']
export const colorCategoria: Record<Categoria, string> = {
  Bebidas: '#2f6fd6',
  Tragos: '#b4532a',
  Cocina: '#e2f24b',
  Combos: '#0a1d42',
  Deportes: '#12804a',
}
export const muestras = ['#2f6fd6', '#0a1d42', '#e2f24b', '#12804a', '#b4532a', '#d6336c', '#7c4dcc', '#5b6b82']
/** Texto oscuro sobre los colores claros, blanco sobre el resto. */
export const tintaSobre = (color: string) => (['#e2f24b'].includes(color) ? '#0a1d42' : '#ffffff')
export const colorDe = (p: Pick<ItemCantina, 'color' | 'categoria'>) => p.color ?? colorCategoria[p.categoria]

/** La paleta de pádel, dibujada: no hay ícono de paleta en la librería. */
function Paleta({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M12 2.5c4 0 6.5 2.8 6.5 6.6 0 3.9-2.9 6.4-6.5 6.4S5.5 13 5.5 9.1C5.5 5.3 8 2.5 12 2.5Z" />
      <path d="M10.6 15.4 10 21.5h4l-.6-6.1" />
      <circle cx="10" cy="7.5" r=".6" fill="currentColor" />
      <circle cx="14" cy="7.5" r=".6" fill="currentColor" />
      <circle cx="12" cy="10.5" r=".6" fill="currentColor" />
    </svg>
  )
}
function Pelota({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M4.5 7.2c3 1.6 4.5 3 4.5 4.8s-1.5 3.2-4.5 4.8M19.5 7.2c-3 1.6-4.5 3-4.5 4.8s1.5 3.2 4.5 4.8" />
    </svg>
  )
}
const iconos: Record<string, LucideIcon | ((p: { size?: number }) => ReactNode)> = {
  agua: GlassWater,
  isotonica: Milk,
  cerveza: Beer,
  gaseosa: CupSoda,
  trago: Martini,
  jarra: Wine,
  hamburguesa: Hamburger,
  sanguche: Sandwich,
  papas: Utensils,
  tostado: Croissant,
  combo: Layers,
  balde: Snowflake,
  pelota: Pelota,
  grip: Hand,
  paleta: Paleta,
}
export const nombresIconos = Object.keys(iconos)

export function IconoProducto({ p, tam = 44, icono = 22 }: { p: Pick<ItemCantina, 'icono' | 'color' | 'categoria'>; tam?: number; icono?: number }) {
  const I = iconos[p.icono] ?? Package
  const fondo = colorDe(p)
  return (
    <span className="icono-producto" style={{ width: tam, height: tam, background: fondo, color: tintaSobre(fondo) }} aria-hidden="true">
      <I size={icono} strokeWidth={1.9} />
    </span>
  )
}

/** Un ícono suelto (para elegir en el editor). */
export function IconoSuelto({ nombre, size = 20 }: { nombre: string; size?: number }) {
  const I = iconos[nombre] ?? Package
  return <I size={size} strokeWidth={1.9} />
}

// ——— Buscador ———
export function Buscador({ valor, cambiar, texto }: { valor: string; cambiar: (v: string) => void; texto: string }) {
  return (
    <label className="buscador-cantina">
      <Search size={17} aria-hidden="true" />
      <input type="search" value={valor} onChange={(ev) => cambiar(ev.target.value)} placeholder={texto} aria-label={texto} />
      {valor && (
        <button type="button" aria-label="Borrar búsqueda" onClick={() => cambiar('')}>
          <X size={15} />
        </button>
      )}
    </label>
  )
}
/** Compara sin tildes ni mayúsculas: "medallon" encuentra "Medallón". */
export const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const coincide = (texto: string, q: string) => normal(texto).includes(normal(q.trim()))

// ——— Submódulos: las pantallas hermanas de cada sección, como pestañas arriba ———
export type Hermana = { a: string; texto: string; cuenta?: number; fin?: boolean }
export const secciones: Record<'cantina' | 'plata', Hermana[]> = {
  cantina: [
    { a: '/admin/vender', texto: 'Vender' },
    { a: '/admin/productos', texto: 'Productos y recetas' },
    { a: '/admin/subproductos', texto: 'Subproductos y stock' },
    { a: '/admin/compras', texto: 'Compras y proveedores' },
  ],
  plata: [
    { a: '/admin/caja', texto: 'Caja de hoy', fin: true },
    { a: '/admin/caja/historial', texto: 'Historial de cajas' },
    { a: '/admin/gastos', texto: 'Gastos' },
    { a: '/admin/reportes', texto: 'Reportes' },
  ],
}

export function Submodulos({ seccion, cuentas = {} }: { seccion: keyof typeof secciones; cuentas?: Record<string, number> }) {
  return (
    <nav className={`submodulos submodulos-${seccion}`} aria-label={seccion === 'cantina' ? 'Cantina' : 'Plata'}>
      {secciones[seccion].map((h) => (
        <NavLink key={h.a} to={h.a} end={h.fin}>
          {h.texto}
          {!!cuentas[h.a] && <span className="insignia">{cuentas[h.a]}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

/** La cabecera de color de cada submódulo: título grande, la frase que importa y la acción principal. */
export function Cabecera({ seccion, titulo, frase, children, cuentas }: { seccion: keyof typeof secciones; titulo: string; frase: ReactNode; children?: ReactNode; cuentas?: Record<string, number> }) {
  return (
    <header className={`modulo modulo-${seccion}`}>
      <Submodulos seccion={seccion} cuentas={cuentas} />
      <div className="modulo-fila">
        <div>
          <h1>{titulo}</h1>
          <p>{frase}</p>
        </div>
        {children && <div className="modulo-acciones">{children}</div>}
      </div>
    </header>
  )
}

export function Chips<T extends string>({ opciones, valor, cambiar, cuentas }: { opciones: [T, string][]; valor: T; cambiar: (v: T) => void; cuentas?: Partial<Record<T, number>> }) {
  return (
    <div className="chips-filtro" role="group">
      {opciones.map(([k, t]) => (
        <button key={k} type="button" className={valor === k ? 'activa' : ''} aria-pressed={valor === k} onClick={() => cambiar(k)}>
          {t}
          {cuentas?.[k] !== undefined && <span>{cuentas[k]}</span>}
        </button>
      ))}
    </div>
  )
}

/** Un monto que sale: "−$4.000", o "$0" si no salió nada (nunca "−-$0"). */
export function Menos({ n }: { n: number }) {
  const v = Math.abs(n) < 0.5 ? 0 : Math.abs(n)
  return <>{v ? `−${pesos(v)}` : pesos(0)}</>
}
