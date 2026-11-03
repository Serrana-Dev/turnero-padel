import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Trophy } from 'lucide-react'
import { negocio, precioDe, type Cancha } from '../config/negocio'
import { ahoraMin, capital, fechaCorta, fechaLarga, fechaRelativa, hora, hoyClave, pesos, sumarDias } from '../lib/formato'
import { ocupada, pedirFijo, reservar, useDatos, type Estado, type Reserva } from '../lib/datos'
import { CanchaDibujo } from '../lib/cancha'
import { avance, estadoCompetencia, VistaCompetencia } from '../lib/Competencia'
import { campeon, rondaActual, rondas, tabla, type Competencia } from '../lib/competencias'
import { Dialogo } from '../lib/ui'

const PRODUCTO = 'Turnero'
const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const whatsapp = `https://wa.me/54${negocio.whatsapp.replace(/\D/g, '')}`

function BarraDemo() {
  return (
    <div className="barra-demo">
      <p>Demo de {PRODUCTO} para complejos de pádel. El club es inventado y las reservas son de prueba.</p>
      <Link to="/admin">Ver el panel del club</Link>
    </div>
  )
}

function Marca() {
  return (
    <Link to="/" className="marca">
      <span className="marca-icono" aria-hidden="true">
        <svg viewBox="0 0 28 28" width="30" height="30">
          <rect x="1" y="5" width="26" height="18" rx="4" fill="currentColor" />
          <path d="M14 5v18M6 14h16M6 5v18M22 5v18" stroke="#0a1d42" strokeWidth="1.6" fill="none" />
        </svg>
      </span>
      {negocio.nombre}
    </Link>
  )
}

function Cabecera() {
  return (
    <header className="cabecera">
      <Marca />
      <nav className="cabecera-menu" aria-label="Secciones">
        <a href="#reservar">Reservar</a>
        <a href="#torneos">Torneos y ligas</a>
        <a href="#club">El club</a>
      </nav>
      <a className="cabecera-boton" href="#reservar">
        Reservar
      </a>
    </header>
  )
}

/** El próximo turno de hoy con alguna cancha libre, para la portada. */
function proximoLibre(e: Estado) {
  const hoy = hoyClave()
  const desde = ahoraMin() + 10
  for (const t of negocio.turnos.filter((x) => x >= desde)) {
    const n = negocio.canchas.filter((c) => !ocupada(e, c.id, hoy, t)).length
    if (n) return { t, n }
  }
  return null
}

function Portada() {
  const e = useDatos()
  const libre = proximoLibre(e)
  return (
    <header className="portada">
      <img src="img/canchas.jpg" alt="Canchas de pádel azules entre palmeras, vistas desde arriba" width={1920} height={1280} fetchPriority="high" />
      <div className="portada-texto">
        <p className="portada-lugar">
          {negocio.barrio}, {negocio.ciudad}
        </p>
        <h1>{negocio.nombre}</h1>
        <p className="portada-bajada">Cuatro canchas de blindex, liga todo el año y torneo el último fin de semana del mes. Reservás acá y señás con Mercado Pago.</p>
        <div className="portada-acciones">
          <a className="btn btn-pelota" href="#reservar">
            Reservar cancha
          </a>
          <a className="btn btn-vidrio" href="#torneos">
            Ver torneos y ligas
          </a>
        </div>
        <p className="portada-ahora">
          <span className="punto" aria-hidden="true" />
          {libre ? (
            <>
              Hoy a las <strong>{hora(libre.t)}</strong> {libre.n === 1 ? 'queda 1 cancha libre' : `quedan ${libre.n} canchas libres`}
            </>
          ) : (
            'Hoy está todo reservado. Mirá mañana.'
          )}
        </p>
      </div>
    </header>
  )
}

type Eleccion = { dia: string; inicio: number; cancha: Cancha }

/** Reservar mirando las canchas: se elige día y hora, y se ve cuál está libre. */
function Reservar({ elegir }: { elegir: (x: Eleccion) => void }) {
  const e = useDatos()
  const hoy = hoyClave()
  const [dia, setDia] = useState(hoy)
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i))
  const minimo = dia === hoy ? ahoraMin() + 10 : 0
  const horarios = negocio.turnos.filter((t) => t >= minimo)
  const libresEn = (t: number) => negocio.canchas.filter((c) => !ocupada(e, c.id, dia, t)).length
  const primeroLibre = horarios.find((t) => libresEn(t) > 0)
  const [inicio, setInicio] = useState<number | null>(null)
  const turno = inicio !== null && horarios.includes(inicio) ? inicio : primeroLibre ?? null

  return (
    <section id="reservar" className="reservar">
      <div className="ancho">
        <div className="seccion-cabeza">
          <h2>Reservá cancha</h2>
          <p>Turnos de 90 minutos. Elegí el día y la hora, y tocá una cancha libre.</p>
        </div>

        <div className="dias" role="tablist" aria-label="Día">
          {dias.map((d) => (
            <button key={d} role="tab" aria-selected={d === dia} className={d === dia ? 'activa' : ''} onClick={() => { setDia(d); setInicio(null) }}>
              <span>{d === hoy ? 'Hoy' : d === sumarDias(hoy, 1) ? 'Mañana' : capital(fechaCorta(d).split(' ')[0])}</span>
              <strong>{Number(d.slice(8))}</strong>
            </button>
          ))}
        </div>

        {horarios.length === 0 ? (
          <p className="vacio">No quedan turnos hoy. Mirá mañana.</p>
        ) : (
          <>
            <div className="horarios" role="tablist" aria-label="Hora">
              {horarios.map((t) => {
                const n = libresEn(t)
                return (
                  <button key={t} role="tab" aria-selected={t === turno} className={t === turno ? 'activa' : ''} disabled={n === 0} onClick={() => setInicio(t)}>
                    <strong>{hora(t)}</strong>
                    <span>{n === 0 ? 'Completo' : n === 1 ? '1 libre' : `${n} libres`}</span>
                  </button>
                )
              })}
            </div>

            {turno !== null && (
              <div className="canchas" aria-live="polite">
                <p className="canchas-titulo">
                  {capital(fechaRelativa(dia))} de {hora(turno)} a {hora(turno + negocio.duracion)}
                  <strong>{pesos(precioDe(turno))} la cancha</strong>
                </p>
                <ul className="canchas-grilla">
                  {negocio.canchas.map((c) => {
                    const libre = !ocupada(e, c.id, dia, turno)
                    return (
                      <li key={c.id}>
                        <button className={`cancha ${libre ? 'libre' : 'ocupada'}`} disabled={!libre} onClick={() => elegir({ dia, inicio: turno, cancha: c })}>
                          <CanchaDibujo className={libre ? 'libre' : 'ocupada'}>
                            <span className="cancha-numero">{c.id.slice(1)}</span>
                          </CanchaDibujo>
                          <span className="cancha-pie">
                            <span>
                              <strong>{c.nombre}</strong>
                              <small>{c.detalle}</small>
                            </span>
                            <span className="cancha-estado">{libre ? 'Reservar' : 'Ocupada'}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function FormReserva({ eleccion, cerrar }: { eleccion: Eleccion | null; cerrar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')
  const [pago, setPago] = useState<'nada' | 'pagando' | 'ok'>('nada')
  const [hecha, setHecha] = useState<Reserva | null>(null)

  useEffect(() => {
    if (eleccion) {
      setPago('nada')
      setHecha(null)
    }
  }, [eleccion])

  if (!eleccion) return <Dialogo abierto={false} cerrar={cerrar} titulo="">{null}</Dialogo>
  const precio = precioDe(eleccion.inicio)

  function confirmar(ev: FormEvent) {
    ev.preventDefault()
    if (!eleccion) return
    setHecha(reservar({ canchaId: eleccion.cancha.id, dia: eleccion.dia, inicio: eleccion.inicio, titular: nombre, telefono: tel, origen: 'web', señada: pago === 'ok' }))
  }

  return (
    <Dialogo abierto={!!eleccion} cerrar={cerrar} titulo={hecha ? 'Cancha reservada' : `${eleccion.cancha.nombre}, ${hora(eleccion.inicio)}`} ancho={480}>
      {hecha ? (
        <div className="hecha">
          <CanchaDibujo className="libre">
            <span className="cancha-numero">{eleccion.cancha.id.slice(1)}</span>
          </CanchaDibujo>
          <dl className="datos-lista">
            <div><dt>A nombre de</dt><dd>{hecha.titular}</dd></div>
            <div><dt>Cuándo</dt><dd>{capital(fechaRelativa(hecha.dia))}, {hora(hecha.inicio)} a {hora(hecha.inicio + negocio.duracion)}</dd></div>
            <div><dt>Seña</dt><dd>{hecha.estado === 'señada' ? `${pesos(negocio.seña)} pagada` : 'A pagar en el club'}</dd></div>
            <div><dt>Saldo en el club</dt><dd>{pesos(hecha.precio - hecha.seña)}</dd></div>
          </dl>
          <p className="tenue">Te llega la confirmación por WhatsApp. Si no podés venir, avisanos hasta 6 horas antes y te devolvemos la seña.</p>
          <div className="acciones">
            <button className="btn btn-primario" onClick={cerrar}>Listo</button>
            <Link className="btn btn-secundario" to={`/admin?dia=${hecha.dia}`}>Así lo ve el club</Link>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={confirmar}>
          <p className="form-resumen">
            {capital(fechaRelativa(eleccion.dia))} de {hora(eleccion.inicio)} a {hora(eleccion.inicio + negocio.duracion)}. {eleccion.cancha.detalle}. <strong>{pesos(precio)}</strong>
          </p>
          <label>
            Nombre y apellido
            <input required name="nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} autoComplete="name" />
          </label>
          <label>
            WhatsApp
            <input required name="telefono" type="tel" value={tel} onChange={(ev) => setTel(ev.target.value)} inputMode="tel" placeholder="351 000-0000…" autoComplete="tel" />
          </label>
          {pago === 'ok' ? (
            <p className="pago-ok">Seña de {pesos(negocio.seña)} aprobada con Mercado Pago</p>
          ) : (
            <button type="button" className="btn btn-mp" disabled={pago === 'pagando'} onClick={() => { setPago('pagando'); setTimeout(() => setPago('ok'), 1100) }}>
              {pago === 'pagando' ? 'Procesando pago…' : `Señar ${pesos(negocio.seña)} con Mercado Pago`}
            </button>
          )}
          <p className="tenue chico">Pago simulado: es una demo. El resto, {pesos(precio - negocio.seña)}, se paga en el club.</p>
          <button className="btn btn-primario" disabled={!nombre || !tel}>
            {pago === 'ok' ? 'Confirmar reserva' : 'Reservar sin seña'}
          </button>
        </form>
      )}
    </Dialogo>
  )
}

/** La tarjeta de una liga o torneo: quién va arriba, cuánto falta y la próxima fecha. */
function TarjetaCompetencia({ c, tono }: { c: Competencia; tono: string }) {
  const cam = campeon(c)
  const { jugados, total } = avance(c)
  const r = rondaActual(c)
  const proxima = rondas(c).find((x) => x.ronda === r)!.partidos[0]
  const arriba = tabla(c.parejas, c.partidos).slice(0, 3)
  return (
    <Link to={`/competencia/${c.id}`} className={`torneo ${tono}`}>
      <span className="torneo-cabeza">
        <span className="torneo-tipo">{c.formato === 'liga' ? 'Liga' : 'Torneo'}</span>
        <span className="torneo-cat">{capital(c.categoria)}</span>
      </span>
      <strong className="torneo-nombre">{c.nombre}</strong>
      {cam ? (
        <span className="torneo-campeon">
          <Trophy size={26} aria-hidden="true" />
          <span>
            <small>Campeones</small>
            {cam.nombre}
          </span>
        </span>
      ) : (
        <ol className="torneo-tabla">
          {arriba.map((f, i) => (
            <li key={f.pareja.id}>
              <span className="torneo-pos">{i + 1}</span>
              <span className="torneo-pareja">{f.pareja.nombre}</span>
              <span className="torneo-pts">{f.pts} pts</span>
            </li>
          ))}
        </ol>
      )}
      <span className="torneo-avance" aria-hidden="true">
        <span style={{ width: `${(jugados / total) * 100}%` }} />
      </span>
      <span className="torneo-pie">
        {cam ? `${total} partidos jugados` : `${r}: ${fechaLarga(proxima.dia)}, ${hora(proxima.inicio)}`}
        <span className="torneo-ver">{c.formato === 'liga' ? 'Fixture y tabla' : 'Ver el cuadro'}</span>
      </span>
    </Link>
  )
}

function Torneos() {
  const e = useDatos()
  const tonos = ['azul', 'noche', 'blanco']
  return (
    <section id="torneos" className="torneos">
      <div className="ancho">
        <div className="seccion-cabeza">
          <h2>Torneos y ligas</h2>
          <p>Fixture, resultados y tablas al día. Los cargamos apenas termina cada partido y los mandamos por el grupo de WhatsApp.</p>
        </div>
        <ul className="torneos-lista">
          {e.competencias.map((c, i) => (
            <li key={c.id}>
              <TarjetaCompetencia c={c} tono={tonos[i % tonos.length]} />
            </li>
          ))}
        </ul>
        <p className="torneos-anotarse">
          ¿Querés jugar la próxima? <a href={whatsapp}>Anotate por WhatsApp</a>
        </p>
      </div>
    </section>
  )
}

function Club() {
  const [enviado, setEnviado] = useState(false)
  const [d, setD] = useState({ nombre: '', telefono: '', dow: 2, inicio: 1200 })
  return (
    <section id="club" className="club">
      <div className="ancho">
        <div className="seccion-cabeza">
          <h2>El club</h2>
          <p>
            {negocio.direccion}, {negocio.barrio}, {negocio.ciudad}. Todos los días de 8:00 a 00:30, con vestuarios, cantina y estacionamiento.
          </p>
        </div>

        <div className="club-fotos">
          <img src="img/panoramica.jpg" alt="Cancha panorámica de blindex sobre césped" width={1439} height={1039} loading="lazy" />
          <img src="img/cancha-noche.jpg" alt="Cancha techada con luces, piso rojo" width={1920} height={1080} loading="lazy" />
          <img src="img/cancha-vidrio.jpg" alt="Canchas techadas de césped azul" width={1920} height={1272} loading="lazy" />
        </div>

        <div className="club-grilla">
          <article className="club-bloque club-precios">
            <h3>Precios</h3>
            <table className="precios">
              <tbody>
                <tr><th scope="row">Cancha antes de las 17</th><td>{pesos(negocio.precios.valle)}</td></tr>
                <tr><th scope="row">Desde las 17 y fines de semana</th><td>{pesos(negocio.precios.pico)}</td></tr>
                <tr><th scope="row">Seña online</th><td>{pesos(negocio.seña)}</td></tr>
                <tr><th scope="row">Alquiler de paleta</th><td>{pesos(3000)}</td></tr>
              </tbody>
            </table>
            <p className="chico">Precio por cancha, 90 minutos, para los cuatro.</p>
          </article>

          <article className="club-bloque">
            <h3>Clases y actividades</h3>
            <ul className="actividades">
              {negocio.actividades.map((a) => (
                <li key={a.titulo}>
                  <p>
                    <strong>{a.titulo}</strong>
                    <span>{pesos(a.precio)} {a.unidad}</span>
                  </p>
                  <p className="tenue">{a.cuando}. {a.texto}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="club-bloque club-fijo">
            <img src="img/partido.jpg" alt="Partido de pádel entre cuatro jugadores" width={1920} height={1440} loading="lazy" />
            <div>
              <h3>Turno fijo</h3>
              <p className="tenue">El mismo día y hora todas las semanas, sin volver a reservar.</p>
              {enviado ? (
                <p className="pago-ok">
                  Listo, {d.nombre.split(' ')[0]}. Pediste los {diasSemana[d.dow]} a las {hora(d.inicio)}. Te escribimos para confirmarlo.{' '}
                  <Link to="/admin/fijos">Así le llega al club</Link>
                </p>
              ) : (
                <form className="form" onSubmit={(ev) => { ev.preventDefault(); pedirFijo(d); setEnviado(true) }}>
                  <div className="form-fila">
                    <label>Nombre y apellido<input required name="nombre" autoComplete="name" value={d.nombre} onChange={(ev) => setD({ ...d, nombre: ev.target.value })} /></label>
                    <label>WhatsApp<input required name="telefono" type="tel" autoComplete="tel" inputMode="tel" value={d.telefono} onChange={(ev) => setD({ ...d, telefono: ev.target.value })} /></label>
                  </div>
                  <div className="form-fila">
                    <label>
                      Día
                      <select value={d.dow} onChange={(ev) => setD({ ...d, dow: Number(ev.target.value) })}>
                        {[1, 2, 3, 4, 5, 6, 0].map((x) => <option key={x} value={x}>{capital(diasSemana[x])}</option>)}
                      </select>
                    </label>
                    <label>
                      Hora
                      <select value={d.inicio} onChange={(ev) => setD({ ...d, inicio: Number(ev.target.value) })}>
                        {negocio.turnos.map((t) => <option key={t} value={t}>{hora(t)}</option>)}
                      </select>
                    </label>
                  </div>
                  <button className="btn btn-pelota">Pedir turno fijo</button>
                </form>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

function Pie() {
  return (
    <footer className="pie">
      <div className="ancho pie-cuerpo">
        <Marca />
        <p>
          {negocio.direccion}, {negocio.barrio}, {negocio.ciudad}. Todos los días de 8:00 a 00:30.
        </p>
        <p className="pie-links">
          <a href={whatsapp}>WhatsApp {negocio.whatsapp}</a>
          <a href={`https://instagram.com/${negocio.instagram}`}>Instagram</a>
          <Link to="/admin">Panel del club</Link>
        </p>
        <p className="creditos">
          Fotos de Wikimedia Commons:{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Multiple_Paddle_tennis_players_engage_in_a_lively_match_on_blue_courts_surrounded_by_lush_greenery.jpg">Nenad Stojković</a> (CC BY 2.0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Mejorset_Full_Panoramic_Padel_Court_Delivered_by_SG_Padel.jpg">OCHAPPS</a> (CC BY-SA 4.0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Sanchez-Casal_Paddle_Tennis_Game.jpg">Jacky Cheong</a> (CC BY-SA 2.0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Padel_en_el_Cos_Sports_Plaza.jpg">Virpana</a> (CC0),{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Padel_court_Nsambya.jpg">Samson Ssemakadde</a> (CC0).
        </p>
      </div>
    </footer>
  )
}

export default function Sitio() {
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  useEffect(() => {
    document.title = `${negocio.nombre}, reservá cancha en ${negocio.barrio}`
  }, [])
  return (
    <div className="sitio">
      <BarraDemo />
      <Cabecera />
      <Portada />
      <main>
        <Reservar elegir={setEleccion} />
        <Torneos />
        <Club />
      </main>
      <Pie />
      <FormReserva eleccion={eleccion} cerrar={() => setEleccion(null)} />
    </div>
  )
}

/** Página pública de una liga o torneo: es el link que se manda por WhatsApp. */
export function CompetenciaPublica() {
  const { id } = useParams()
  const e = useDatos()
  const c = e.competencias.find((x) => x.id === id)
  const resumen = useMemo(() => (c ? estadoCompetencia(c) : null), [c])
  useEffect(() => {
    if (c) document.title = `${c.nombre}, ${c.categoria}, ${negocio.nombre}`
    window.scrollTo(0, 0)
  }, [c])
  const cam = c ? campeon(c) : null
  const av = c ? avance(c) : null
  return (
    <div className="sitio sitio-competencia">
      <BarraDemo />
      <header className="cabecera">
        <Link to="/" className="volver" aria-label="Volver al club">
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <Marca />
        <a className="cabecera-boton" href={whatsapp}>
          Anotarme
        </a>
      </header>
      {!c ? (
        <main className="ancho competencia-cuerpo">
          <p className="vacio">No encontramos esa competencia. <Link to="/">Volver al club</Link></p>
        </main>
      ) : (
        <>
          <div className="competencia-portada">
            <div className="ancho">
              <p className="competencia-tipo">
                {c.formato === 'liga' ? 'Liga' : 'Torneo'} <span>{capital(c.categoria)}</span>
              </p>
              <h1>{c.nombre}</h1>
              <p className="competencia-dato">
                {c.parejas.length} parejas, {av!.jugados} de {av!.total} partidos jugados.
                {resumen && !resumen.terminada ? ` ${resumen.texto}.` : ''}
              </p>
              <span className="competencia-avance" aria-hidden="true">
                <span style={{ width: `${(av!.jugados / av!.total) * 100}%` }} />
              </span>
              {cam && (
                <p className="competencia-campeon">
                  <Trophy size={28} aria-hidden="true" />
                  <span>
                    <small>Campeones</small>
                    <strong>{cam.nombre}</strong>
                  </span>
                </p>
              )}
            </div>
          </div>
          <main className="ancho competencia-cuerpo">
            <VistaCompetencia key={c.id} c={c} />
          </main>
        </>
      )}
      <Pie />
    </div>
  )
}
