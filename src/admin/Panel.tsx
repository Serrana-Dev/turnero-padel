import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import { BarChart3, CalendarRange, ChefHat, Globe, History, Menu, Package, Receipt, Repeat, RotateCcw, ShoppingBag, Trophy, Truck, Wallet } from 'lucide-react'
import { negocio } from '../config/negocio'
import { ahoraMin, capital, diaMes, fechaCorta, fechaLarga, hora, hoyClave, pesos, sumarDias } from '../lib/formato'
import { actualizarReserva, estados, reiniciar, repartoCuenta, resumenCaja, useDatos, type Reserva } from '../lib/datos'
import { CuentaCobro, CuentaConsumos } from './Cuenta'
import { bajoMinimo, Cabecera } from './comun'
import { Dialogo } from '../lib/ui'
import { CanchaDibujo } from '../lib/cancha'

type Ctx = { verReserva: (id: string) => void }
export const usePanel = () => useOutletContext<Ctx>()

// El menú en tres grupos: lo de las canchas, lo de la cantina y lo de la plata
const menu: { grupo: string; items: { a: string; texto: string; icono: typeof Wallet; fin?: boolean }[] }[] = [
  {
    grupo: 'Canchas',
    items: [
      { a: '/admin', texto: 'Canchas del día', icono: CalendarRange, fin: true },
      { a: '/admin/fijos', texto: 'Turnos fijos', icono: Repeat },
      { a: '/admin/torneos', texto: 'Torneos y ligas', icono: Trophy },
    ],
  },
  {
    grupo: 'Cantina',
    items: [
      { a: '/admin/vender', texto: 'Vender', icono: ShoppingBag },
      { a: '/admin/productos', texto: 'Productos y recetas', icono: ChefHat },
      { a: '/admin/subproductos', texto: 'Subproductos', icono: Package },
      { a: '/admin/compras', texto: 'Compras y proveedores', icono: Truck },
    ],
  },
  {
    grupo: 'Caja',
    items: [
      { a: '/admin/caja', texto: 'Caja de hoy', icono: Wallet, fin: true },
      { a: '/admin/caja/historial', texto: 'Historial de cajas', icono: History },
      { a: '/admin/gastos', texto: 'Gastos', icono: Receipt },
      { a: '/admin/reportes', texto: 'Reportes', icono: BarChart3 },
    ],
  },
]

/** En el celular: las cuatro cosas que más se usan, abajo, al alcance del pulgar. */
const barraCelu = [
  { a: '/admin', texto: 'Canchas', icono: CalendarRange, fin: true },
  { a: '/admin/vender', texto: 'Vender', icono: ShoppingBag },
  { a: '/admin/caja', texto: 'Caja', icono: Wallet },
  { a: '/admin/subproductos', texto: 'Stock', icono: Package },
]

/** El nombre de la pantalla en la que estás, para la barra de arriba del celular. */
function seccionActual(ruta: string) {
  if (ruta.startsWith('/admin/productos/')) return 'Receta'
  const todos = menu.flatMap((g) => g.items).sort((a, b) => b.a.length - a.a.length)
  return todos.find((x) => ruta === x.a || ruta.startsWith(x.a + '/'))?.texto ?? 'Panel'
}

export function Layout() {
  const e = useDatos()
  const [abierto, setAbierto] = useState(false)
  // Cada 30 segundos se redibuja: la cuenta regresiva de las canchas baja sola
  const [, setTic] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTic((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])
  const [reserva, setReserva] = useState<string | null>(null)
  const lugar = useLocation()
  const faltan = bajoMinimo(e).length
  useEffect(() => {
    document.title = `Panel · ${negocio.nombre}`
    setAbierto(false)
  }, [lugar.pathname])
  const ctx = useMemo<Ctx>(() => ({ verReserva: setReserva }), [])
  return (
    <div className="admin">
      <aside className={`lateral ${abierto ? 'lateral-abierta' : ''}`}>
        <div className="producto">
          <span className="producto-marca" aria-hidden="true">
            <svg viewBox="0 0 28 28" width="30" height="30"><rect x="1" y="5" width="26" height="18" rx="3" fill="currentColor" /><path d="M14 5v18M6 14h16M6 5v18M22 5v18" stroke="#fff" strokeWidth="1.6" fill="none" /></svg>
          </span>
          <span>
            <strong>{negocio.nombre}</strong>
            <small>{negocio.barrio}</small>
          </span>
        </div>
        <nav className="menu">
          {menu.map((g) => (
            <div key={g.grupo} className="menu-grupo">
              <p className="menu-grupo-titulo">{g.grupo}</p>
              {g.items.map(({ a, texto, icono: I, fin }) => (
                <NavLink key={a} to={a} end={fin}>
                  <I size={17} strokeWidth={1.8} aria-hidden="true" />
                  {texto}
                  {a === '/admin/fijos' && e.solicitudes.length > 0 && <span className="insignia" title="Pedidos de turno fijo">{e.solicitudes.length}</span>}
                  {a === '/admin/subproductos' && faltan > 0 && <span className="insignia" title="Para reponer">{faltan}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="lateral-pie">
          <NavLink to="/" className="menu-secundario"><Globe size={16} strokeWidth={1.8} aria-hidden="true" /> Ver la web de reservas</NavLink>
          <button className="menu-secundario" onClick={reiniciar}><RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" /> Reiniciar demo</button>
          <p className="hecho-con">Hecho con Turnero · demo</p>
        </div>
      </aside>
      <header className="superior">
        <button className="btn-icono solo-telefono" onClick={() => setAbierto(!abierto)} aria-label="Menú"><Menu size={20} /></button>
        <p className="superior-seccion">{seccionActual(lugar.pathname)}</p>
        <p className="superior-texto">{capital(fechaLarga(hoyClave()))}<span className="superior-detalle">, abierto de 8:00 a 00:30</span></p>
        <Link to="/" className="boton boton-chico">Reservar como cliente</Link>
      </header>
      <main className="hoja-admin">
        <Outlet context={ctx} />
      </main>
      <nav className="barra-celu" aria-label="Accesos rápidos">
        {barraCelu.map(({ a, texto, icono: I, fin }) => (
          <NavLink key={a} to={a} end={fin}>
            <I size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{texto}</span>
            {a === '/admin/subproductos' && faltan > 0 && <i className="barra-celu-punto" aria-label={`${faltan} para reponer`} />}
          </NavLink>
        ))}
        <button onClick={() => setAbierto(true)}>
          <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>
      {abierto && <button className="velo" aria-label="Cerrar el menú" onClick={() => setAbierto(false)} />}
      <DetalleReserva id={reserva} cerrar={() => setReserva(null)} />
    </div>
  )
}

function DetalleReserva({ id, cerrar }: { id: string | null; cerrar: () => void }) {
  const e = useDatos()
  const r = e.reservas.find((x) => x.id === id)
  const [pestana, setPestana] = useState<'turno' | 'consumos' | 'cobrar'>('turno')
  // Al abrir: si se está jugando o ya cargaron algo, directo a los consumos
  useEffect(() => {
    if (!r) return
    const ahora = ahoraMin()
    const hoy = r.dia === hoyClave()
    const enJuego = hoy && r.inicio <= ahora && ahora < r.inicio + negocio.duracion
    const termino = (r.dia < hoyClave() || (hoy && r.inicio + negocio.duracion <= ahora)) && r.estado !== 'pagada' && r.estado !== 'cancelada'
    // Terminó y no se cobró: directo a cobrar. Se está jugando: a cargar lo que consumen.
    setPestana(termino ? 'cobrar' : enJuego || e.cuentas.some((c) => c.reservaId === r.id && c.consumos.length) ? 'consumos' : 'turno')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!r) return <Dialogo abierto={false} cerrar={cerrar} titulo="">{null}</Dialogo>
  const cancha = negocio.canchas.find((c) => c.id === r.canchaId)!
  const fijo = e.fijos.find((f) => f.id === r.fijoId)
  const rep = repartoCuenta(e, r.id)
  const msj = encodeURIComponent(`Hola ${r.titular.split(' ')[0]}! Te esperamos ${fechaCorta(r.dia)} a las ${hora(r.inicio)} en la ${cancha.nombre} de ${negocio.nombre}.`)
  const falta = rep.total - rep.pagado
  return (
    <Dialogo abierto cerrar={cerrar} titulo={`${cancha.nombre} · ${hora(r.inicio)} a ${hora(r.inicio + negocio.duracion)}`} ancho={640}>
      <div className="reserva-heroe">
        <span>
          <strong>{r.titular}</strong>
          <small>{capital(fechaLarga(r.dia))}{r.origen === 'fijo' ? ' · turno fijo' : ''}</small>
        </span>
        <span className={`estado estado-${r.estado}`}>{estados[r.estado]}</span>
      </div>
      {r.estado !== 'cancelada' && (
        <div className="pestanas-reserva" role="tablist">
          <button role="tab" aria-selected={pestana === 'turno'} className={pestana === 'turno' ? 'activa' : ''} onClick={() => setPestana('turno')}>Turno</button>
          <button role="tab" aria-selected={pestana === 'consumos'} className={pestana === 'consumos' ? 'activa' : ''} onClick={() => setPestana('consumos')}>
            Consumos {rep.cuenta.consumos.length > 0 && <span className="insignia">{rep.cuenta.consumos.length}</span>}
          </button>
          <button role="tab" aria-selected={pestana === 'cobrar'} className={pestana === 'cobrar' ? 'activa' : ''} onClick={() => setPestana('cobrar')}>Cobrar</button>
        </div>
      )}

      {(pestana === 'turno' || r.estado === 'cancelada') && (
        <>
          <dl className="ficha ficha-compacta">
            <div><dt>WhatsApp</dt><dd>{r.telefono}</dd></div>
            <div><dt>Reservó por</dt><dd>{r.origen === 'fijo' ? `Turno fijo desde el ${diaMes(fijo?.desde ?? r.dia)}` : r.origen === 'web' ? 'La web' : 'WhatsApp'}</dd></div>
            <div><dt>Precio</dt><dd>{pesos(r.precio)}</dd></div>
            <div><dt>Seña</dt><dd>{r.seña ? `${pesos(r.seña)} por transferencia` : '—'}</dd></div>
          </dl>
          <div className="acciones-reserva">
            <a className="boton boton-wsp" href={`https://wa.me/54${r.telefono.replace(/\D/g, '')}?text=${msj}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
            {r.estado === 'pendiente' && <button className="boton" onClick={() => actualizarReserva(r.id, { estado: 'señada', seña: negocio.seña })}>Marcar seña recibida</button>}
            {r.estado !== 'cancelada' && r.estado !== 'pagada' && !rep.cuenta.consumos.length && !rep.cuenta.pagos.length && <button className="boton boton-peligro" onClick={() => { actualizarReserva(r.id, { estado: 'cancelada' }); cerrar() }}>Cancelar y liberar</button>}
          </div>
        </>
      )}
      {pestana === 'consumos' && r.estado !== 'cancelada' && <CuentaConsumos reservaId={r.id} />}
      {pestana === 'cobrar' && r.estado !== 'cancelada' && <CuentaCobro reservaId={r.id} />}

      {r.estado !== 'cancelada' && pestana !== 'cobrar' && (
        <div className="pie-cuenta">
          <span>
            <small>{falta > 0 ? 'Falta cobrar' : 'Está todo pago'}</small>
            <strong>{pesos(Math.max(0, falta))}</strong>
          </span>
          {falta > 0 && <button className="boton boton-amarillo" onClick={() => setPestana('cobrar')}>Cobrar</button>}
        </div>
      )}
    </Dialogo>
  )
}

// ——— Canchas del día ———

/** Las cuatro canchas como se ven desde la cantina: quién juega ahora y cuándo se libera. */
function AhoraEnCanchas({ verReserva }: { verReserva: (id: string) => void }) {
  const e = useDatos()
  const hoy = hoyClave()
  const ahora = ahoraMin()
  return (
    <section aria-labelledby="ahora-titulo">
      <h2 id="ahora-titulo" className="rail-titulo">En las canchas ahora</h2>
      <ul className="ahora-canchas">
        {negocio.canchas.map((c) => {
          const delDia = e.reservas.filter((r) => r.canchaId === c.id && r.dia === hoy && r.estado !== 'cancelada')
          const actual = delDia.find((r) => r.inicio <= ahora && ahora < r.inicio + negocio.duracion)
          const proxima = delDia.filter((r) => r.inicio > ahora).sort((a, b) => a.inicio - b.inicio)[0]
          const resto = actual ? actual.inicio + negocio.duracion - ahora : 0
          // El que terminó y todavía no pagó: la cancha y lo que consumieron se cobran al final
          const aCobrar = delDia.filter((r) => r.inicio + negocio.duracion <= ahora && r.estado !== 'pagada').sort((a, b) => b.inicio - a.inicio)[0]
          const ver = aCobrar ?? actual ?? proxima
          return (
            <li key={c.id}>
              <button className="ahora-cancha" disabled={!ver} onClick={() => ver && verReserva(ver.id)}>
                <CanchaDibujo className={actual ? '' : 'ocupada'}>
                  <span className="ahora-dentro">
                    <strong>{c.nombre}</strong>
                    <span>{actual ? actual.titular : 'Libre'}</span>
                  </span>
                </CanchaDibujo>
                {actual && repartoCuenta(e, actual.id).consumos > 0 && (
                  <span className="ahora-cuenta"><Receipt size={13} aria-hidden="true" /> {pesos(repartoCuenta(e, actual.id).consumos)} en la cantina</span>
                )}
                {aCobrar && (
                  <span className="ahora-cobrar">Terminó {hora(aCobrar.inicio + negocio.duracion)} · cobrar {pesos(repartoCuenta(e, aCobrar.id).total - repartoCuenta(e, aCobrar.id).pagado)}</span>
                )}
                <span className="ahora-pie">
                  {actual
                    ? `Termina ${hora(actual.inicio + negocio.duracion)}, faltan ${resto} min`
                    : proxima
                      ? `Próximo: ${hora(proxima.inicio)}, ${proxima.titular.split(' ')[0]}`
                      : 'Sin más reservas hoy'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** En el celular, una cancha por vez con sus turnos en lista. */
function PorCancha({ delDia, dia, verReserva }: { delDia: Reserva[]; dia: string; verReserva: (id: string) => void }) {
  const [cancha, setCancha] = useState(negocio.canchas[0].id)
  const hoy = hoyClave()
  const ahora = ahoraMin()
  return (
    <div className="por-cancha">
      <div className="segmentos segmentos-ancho" role="tablist" aria-label="Cancha">
        {negocio.canchas.map((c) => (
          <button key={c.id} role="tab" aria-selected={cancha === c.id} className={cancha === c.id ? 'activa' : ''} onClick={() => setCancha(c.id)}>
            {c.nombre}
          </button>
        ))}
      </div>
      <ul className="lista">
        {negocio.turnos.map((t) => {
          const r = delDia.find((x) => x.canchaId === cancha && x.inicio === t)
          const pasado = dia === hoy && t + negocio.duracion <= ahora
          return (
            <li key={t}>
              {r ? (
                <button onClick={() => verReserva(r.id)}>
                  <span className="lista-hora">{hora(t)}</span>
                  <span className="lista-texto">
                    {r.titular}
                    <small>{r.origen === 'fijo' ? 'Turno fijo' : estados[r.estado]}</small>
                  </span>
                  <span className={`estado estado-${r.estado}`}>{r.estado === 'pagada' ? 'Pagada' : pesos(r.precio - r.seña)}</span>
                </button>
              ) : (
                <p className="lista-libre">
                  <span className="lista-hora">{hora(t)}</span>
                  <span className="tenue">{pasado ? 'Pasó sin reserva' : 'Libre'}</span>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Canchas() {
  const e = useDatos()
  const { verReserva } = usePanel()
  const [q, setQ] = useSearchParams()
  const hoy = hoyClave()
  const dia = q.get('dia') ?? hoy
  const ahora = ahoraMin()

  const d = useMemo(() => {
    const delDia = e.reservas.filter((r) => r.dia === dia && r.estado !== 'cancelada')
    const total = negocio.canchas.length * negocio.turnos.length
    // Lo cobrado es lo mismo que dice la caja de ese día
    const cobrado = resumenCaja(e, dia).entro
    const paraCobrar = e.reservas
      .filter((r) => r.dia === hoy && r.estado !== 'pagada' && r.estado !== 'cancelada' && r.inicio <= ahoraMin())
      .sort((a, b) => a.inicio - b.inicio)
    const sinSeña = e.reservas.filter((r) => r.estado === 'pendiente' && r.dia >= hoy).sort((a, b) => (a.dia + a.inicio).localeCompare(b.dia + b.inicio))
    const libresPico = negocio.canchas.length * negocio.turnos.filter((t) => t >= negocio.pico).length - delDia.filter((r) => r.inicio >= negocio.pico).length
    return { delDia, ocupacion: delDia.length / total, cobrado, sinSeña, paraCobrar, libresPico, aCobrar: delDia.filter((r) => r.estado !== 'pagada').reduce((s, r) => s + r.precio - r.seña, 0) }
  }, [e, dia, hoy])

  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 1))

  return (
    <div className="pantalla">
      <Cabecera
        seccion="canchas"
        titulo="Canchas del día"
        cuentas={{ '/admin/fijos': e.solicitudes.length }}
        frase={<>{capital(fechaLarga(dia))}: <strong>{d.delDia.length} reservas</strong> de {negocio.canchas.length * negocio.turnos.length} turnos{d.paraCobrar.length ? <>, <strong>{d.paraCobrar.length} para cobrar</strong> al terminar</> : null}.</>}
      >
        <div className="segmentos segmentos-claros segmentos-dias">
          {semana.map((x) => (
            <button key={x} className={x === dia ? 'activa' : ''} onClick={() => setQ({ dia: x })}>
              {x === hoy ? 'Hoy' : capital(fechaCorta(x))}
            </button>
          ))}
        </div>
      </Cabecera>

      <div className="kpis">
        <div className="kpi"><span>Ocupación</span><strong>{Math.round(d.ocupacion * 100)}%</strong><small>{d.libresPico} turnos libres en horario pico</small></div>
        <div className="kpi"><span>Cobrado</span><strong>{pesos(d.cobrado)}</strong><small>señas, saldos y cantina del día</small></div>
        <div className="kpi"><span>Por cobrar</span><strong>{pesos(d.aCobrar)}</strong><small>saldos de las reservas del día</small></div>
        <div className="kpi"><span>Sin seña</span><strong className={d.sinSeña.length ? 'mal' : ''}>{d.sinSeña.length}</strong><small>reservas de hoy en adelante</small></div>
      </div>

      {dia === hoy && <AhoraEnCanchas verReserva={verReserva} />}

      <div className="grilla-rail">
        <section className="tarjeta">
          <PorCancha delDia={d.delDia} dia={dia} verReserva={verReserva} />
          <div className="tarjeta-cabeza solo-ancho">
            <h2>Grilla</h2>
            <Link className="enlace-chico" to="/">Las canchas libres se ven en la web</Link>
          </div>
          <div className="grilla-canchas solo-ancho" style={{ ['--turnos' as string]: negocio.turnos.length }}>
            <span />
            {negocio.turnos.map((t) => <span key={t} className="grilla-hora">{hora(t)}</span>)}
            {negocio.canchas.map((c) => (
              <div className="grilla-fila" key={c.id}>
                <span className="grilla-cancha">{c.nombre}<small>{c.techada ? 'Techada' : 'Aire libre'}</small></span>
                {negocio.turnos.map((t) => {
                  const r = d.delDia.find((x) => x.canchaId === c.id && x.inicio === t)
                  const enCurso = dia === hoy && t <= ahora && ahora < t + negocio.duracion
                  if (!r) return <span key={t} className={`celda-libre ${enCurso ? 'en-curso' : ''}`}>{dia === hoy && t + negocio.duracion <= ahora ? '' : 'Libre'}</span>
                  return (
                    <button key={t} className={`celda-reserva celda-${r.estado} ${r.origen === 'fijo' ? 'celda-fijo' : ''} ${enCurso ? 'en-curso' : ''}`} onClick={() => verReserva(r.id)} title={`${r.titular} · ${estados[r.estado]}`}>
                      <strong>{r.titular.split(' ')[0]} {r.titular.split(' ')[1]?.[0]}.</strong>
                      <span>{r.origen === 'fijo' ? 'Fijo' : estados[r.estado]}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <ul className="leyenda">
            <li><span className="muestra muestra-señada" /> Señada</li>
            <li><span className="muestra muestra-pendiente" /> Falta la seña</li>
            <li><span className="muestra muestra-pagada" /> Pagada</li>
            <li><span className="muestra muestra-fijo" /> Turno fijo</li>
          </ul>
        </section>

        <aside className="rail">
          {d.paraCobrar.length > 0 && (
            <>
              <h2 className="rail-titulo">Para cobrar al terminar</h2>
              <div className="tarjeta tarjeta-lista tarjeta-cobrar">
                <ul className="lista">
                  {d.paraCobrar.map((r) => {
                    const rep = repartoCuenta(e, r.id)
                    const termino = r.inicio + negocio.duracion <= ahoraMin()
                    return (
                      <li key={r.id}>
                        <button onClick={() => verReserva(r.id)}>
                          <span className="lista-hora">{hora(r.inicio)}</span>
                          <span className="lista-texto">{negocio.canchas.find((c) => c.id === r.canchaId)!.nombre} · {r.titular.split(' ')[0]}<small>{termino ? 'Terminó' : 'Jugando'} · cancha {pesos(rep.saldoCancha)}{rep.consumos ? ` + cantina ${pesos(rep.consumos)}` : ''}</small></span>
                          <strong className={termino ? 'cobrar-ya' : ''}>{pesos(rep.total - rep.pagado)}</strong>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="ayuda">Lo que consumen se carga a la cancha y al terminar se cobra todo junto: el turno y los productos.</p>
              </div>
            </>
          )}
          <h2 className="rail-titulo">Falta la seña</h2>
          <div className="tarjeta tarjeta-lista">
            {d.sinSeña.length === 0 && <p className="vacio">Todas las reservas están señadas.</p>}
            <ul className="lista">
              {d.sinSeña.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <button onClick={() => verReserva(r.id)}>
                    <span className="lista-hora">{hora(r.inicio)}</span>
                    <span className="lista-texto">{r.titular}<small>{capital(fechaCorta(r.dia))} · {negocio.canchas.find((c) => c.id === r.canchaId)!.nombre}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {e.solicitudes.length > 0 && (
            <>
              <h2 className="rail-titulo">Piden turno fijo</h2>
              <div className="tarjeta">
                <p className="vacio">{e.solicitudes.length} {e.solicitudes.length === 1 ? 'persona pidió' : 'personas pidieron'} un turno fijo desde la web.</p>
                <Link to="/admin/fijos" className="boton boton-chico boton-ancho">Revisar pedidos</Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
