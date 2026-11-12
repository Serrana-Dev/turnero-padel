// Vender: el mostrador de la cantina. Se arma el ticket tocando productos y se cobra o se carga a la cuenta de una cancha.
import { useMemo, useState } from 'react'
import { Check, ChevronUp, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { negocio, type Categoria } from '../config/negocio'
import { agregarConsumo, costeo, cuentaDe, metodos, useDatos, venderTicket, type Metodo } from '../lib/datos'
import { ahoraMin, hora, hoyClave, pesos } from '../lib/formato'
import { bajoMinimo, Buscador, Cabecera, categorias, Chips, coincide, colorDe, IconoProducto, tintaSobre } from './comun'
import { resumenReceta } from './Productos'

type Linea = { itemId: string; cantidad: number }

export function Vender() {
  const e = useDatos()
  const hoy = hoyClave()
  const ahora = ahoraMin()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Categoria | 'todos'>('todos')
  const [ticket, setTicket] = useState<Linea[]>([])
  const [destino, setDestino] = useState<'cobrar' | 'cancha'>('cobrar')
  const [metodo, setMetodo] = useState<Metodo>('efectivo')
  const [reservaId, setReservaId] = useState<string>('')
  const [quien, setQuien] = useState<string>('')
  const [hecho, setHecho] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)

  const ventasHoy = e.ventas.filter((v) => v.dia === hoy)
  const totalHoy = ventasHoy.reduce((s, v) => s + v.monto, 0)
  const lista = e.productos.filter((p) => !p.pausado && (cat === 'todos' || p.categoria === cat) && (!q || coincide(p.nombre, q) || coincide(resumenReceta(e, p.id), q)))
  const total = ticket.reduce((s, l) => s + (e.productos.find((p) => p.id === l.itemId)?.precio ?? 0) * l.cantidad, 0)
  const unidades = ticket.reduce((s, l) => s + l.cantidad, 0)

  // Las canchas que se pueden cargar: las que se están jugando y las que están por empezar o recién terminaron
  const canchas = useMemo(
    () =>
      e.reservas
        .filter((r) => r.dia === hoy && r.estado !== 'cancelada' && !(r.estado === 'pagada' && !r.porCuenta) && r.inicio - 60 <= ahora && r.inicio + negocio.duracion + 60 >= ahora)
        .sort((a, b) => a.inicio - b.inicio),
    [e.reservas, hoy, ahora],
  )
  const reservaElegida = canchas.find((r) => r.id === reservaId) ?? canchas[0]
  const nombres = reservaElegida ? cuentaDe(e, reservaElegida.id).nombres : []

  const sumar = (itemId: string, n = 1) => {
    setHecho(null)
    setTicket((t) => {
      const ya = t.find((l) => l.itemId === itemId)
      if (!ya) return n > 0 ? [...t, { itemId, cantidad: n }] : t
      return t.map((l) => (l.itemId === itemId ? { ...l, cantidad: l.cantidad + n } : l)).filter((l) => l.cantidad > 0)
    })
  }
  const cobrar = () => {
    if (!ticket.length) return
    if (destino === 'cobrar') {
      venderTicket(ticket, metodo)
      setHecho(`Cobrado ${pesos(total)} en ${metodos[metodo].toLowerCase()}. El stock ya se descontó.`)
    } else if (reservaElegida) {
      ticket.forEach((l) => { for (let i = 0; i < l.cantidad; i++) agregarConsumo(reservaElegida.id, l.itemId, quien || null) })
      const c = negocio.canchas.find((x) => x.id === reservaElegida.canchaId)!.nombre
      setHecho(`Cargado ${pesos(total)} a la ${c}${quien ? `, a nombre de ${quien}` : ''}. Se cobra al final del turno.`)
    }
    setTicket([])
    setAbierto(false)
  }

  return (
    <div className="pantalla pantalla-vender">
      <Cabecera seccion="cantina" titulo="Vender" cuentas={{ '/admin/subproductos': bajoMinimo(e).length }} frase={<>Hoy van <strong>{pesos(totalHoy)}</strong> en {ventasHoy.length} ventas de la cantina. Tocá los productos para armar el ticket.</>} />

      <div className="mostrador">
        <div className="mostrador-productos">
          <Buscador valor={q} cambiar={setQ} texto="Buscar producto" />
          <Chips<Categoria | 'todos'> opciones={[['todos', 'Todo'], ...categorias.map((c) => [c, c] as [Categoria, string])]} valor={cat} cambiar={setCat} />
          <ul className="teclas">
            {lista.map((p) => {
              const k = costeo(e, p.id)
              const en = ticket.find((l) => l.itemId === p.id)?.cantidad ?? 0
              const sin = p.receta.length > 0 && k.alcanza <= en
              return (
                <li key={p.id}>
                  <button className={`tecla ${en ? 'tecla-en' : ''}`} style={{ ['--color' as string]: colorDe(p), ['--tinta' as string]: tintaSobre(colorDe(p)) }} disabled={sin} onClick={() => sumar(p.id)}>
                    <IconoProducto p={p} tam={40} icono={21} />
                    <strong>{p.nombre}</strong>
                    <span className="tecla-precio">{pesos(p.precio)}</span>
                    {p.receta.length > 0 && k.alcanza < 10 && <span className="tecla-quedan">{k.alcanza === 0 ? 'Sin stock' : `Quedan ${k.alcanza}`}</span>}
                    {en > 0 && <span className="tecla-cuenta">{en}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <aside className={`ticket ${abierto ? 'ticket-abierto' : ''} ${ticket.length ? 'ticket-con' : ''}`} aria-label="Ticket">
          <button className="ticket-pestana" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
            <ShoppingBag size={18} aria-hidden="true" />
            <span>{unidades ? `${unidades} ${unidades === 1 ? 'producto' : 'productos'}` : 'Ticket vacío'}</span>
            <strong>{pesos(total)}</strong>
            <ChevronUp size={18} aria-hidden="true" className="ticket-flecha" />
          </button>
          <div className="ticket-cuerpo">
            <h2 className="ticket-titulo">Ticket <span className="tenue">{hora(ahora)}</span></h2>
            {ticket.length === 0 ? (
              <p className="ticket-vacio">{hecho ? <><Check size={16} aria-hidden="true" /> {hecho}</> : 'Tocá un producto para sumarlo.'}</p>
            ) : (
              <ul className="ticket-lineas">
                {ticket.map((l) => {
                  const p = e.productos.find((x) => x.id === l.itemId)!
                  return (
                    <li key={l.itemId}>
                      <span className="ticket-nombre">{p.nombre}<small>{pesos(p.precio)} c/u</small></span>
                      <span className="paso-a-paso paso-chico">
                        <button aria-label={`Uno menos de ${p.nombre}`} onClick={() => sumar(p.id, -1)}>{l.cantidad === 1 ? <Trash2 size={14} /> : <Minus size={14} />}</button>
                        <span>{l.cantidad}</span>
                        <button aria-label={`Uno más de ${p.nombre}`} onClick={() => sumar(p.id)}><Plus size={14} /></button>
                      </span>
                      <strong>{pesos(p.precio * l.cantidad)}</strong>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="ticket-destino segmentos segmentos-ancho">
              <button className={destino === 'cobrar' ? 'activa' : ''} onClick={() => setDestino('cobrar')}>Cobrar ahora</button>
              <button className={destino === 'cancha' ? 'activa' : ''} onClick={() => setDestino('cancha')} disabled={!canchas.length}>A la cuenta de una cancha</button>
            </div>
            {destino === 'cobrar' ? (
              <div className="chips-filtro chips-metodo" role="group" aria-label="Medio de pago">
                {(Object.keys(metodos) as Metodo[]).map((m) => <button key={m} className={metodo === m ? 'activa' : ''} onClick={() => setMetodo(m)}>{metodos[m]}</button>)}
              </div>
            ) : (
              <div className="ticket-cancha">
                <select className="select-chico" value={reservaElegida?.id ?? ''} onChange={(ev) => { setReservaId(ev.target.value); setQuien('') }} aria-label="Cancha">
                  {canchas.map((r) => <option key={r.id} value={r.id}>{negocio.canchas.find((c) => c.id === r.canchaId)!.nombre} · {hora(r.inicio)} · {r.titular}</option>)}
                </select>
                <div className="chips-filtro" role="group" aria-label="A nombre de">
                  <button className={!quien ? 'activa' : ''} onClick={() => setQuien('')}>Para todos</button>
                  {nombres.map((n) => <button key={n} className={quien === n ? 'activa' : ''} onClick={() => setQuien(n)}>{n}</button>)}
                </div>
              </div>
            )}
            <button className="boton boton-amarillo boton-ancho boton-cobrar" disabled={!ticket.length} onClick={cobrar}>
              {destino === 'cobrar' ? `Cobrar ${pesos(total)}` : `Cargar ${pesos(total)} a la cancha`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
