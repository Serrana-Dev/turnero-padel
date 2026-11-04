import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Share2, Trophy } from 'lucide-react'
import { negocio } from '../config/negocio'
import { compartirImagen, descargar, dibujarAfiche, estilos, medidas, type Contenido, type Formato } from './afiche'
import {
  campeon,
  etiquetaOrigen,
  ganador,
  parejasDeZona,
  rondaActual,
  rondas,
  tabla,
  zonasDe,
  type Competencia,
  type Pareja,
  type Partido,
  type Sets,
} from './competencias'
import { capital, deClave, fechaLarga, hora } from './formato'
import { Dialogo } from './ui'

const canchaNombre = (id: string) => negocio.canchas.find((c) => c.id === id)?.nombre ?? ''
const diaCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric' })
const corto = (dia: string) => capital(diaCorto.format(deClave(dia)).replace('.', ''))

/** "Fecha 5 este sábado", "Terminó", etc. para la tarjeta de la competencia. */
export function estadoCompetencia(c: Competencia) {
  const cam = campeon(c)
  if (cam) return { terminada: true, texto: `Campeones: ${cam.nombre}` }
  const r = rondaActual(c)
  const p = rondas(c).find((x) => x.ronda === r)!.partidos[0]
  return { terminada: false, texto: `${r}: ${fechaLarga(p.dia)}` }
}

/** Cuántos partidos se jugaron de cuántos: la barra de avance de la competencia. */
export function avance(c: Competencia) {
  return { jugados: c.partidos.filter((p) => p.sets).length, total: c.partidos.length }
}

/** El puesto de cada pareja antes de la última fecha jugada. */
function antesDeLaUltima(c: Competencia) {
  const jugadas = rondas(c).filter((r) => r.partidos.some((p) => p.sets))
  if (jugadas.length < 2) return undefined
  const ultima = jugadas[jugadas.length - 1].ronda
  return Object.fromEntries(tabla(c.parejas, c.partidos.filter((p) => p.ronda !== ultima)).map((f, i) => [f.pareja.id, i]))
}

/** Los últimos resultados de una pareja, el más reciente al final: G o P. */
function racha(id: string, partidos: Partido[], n = 4) {
  return partidos
    .filter((p) => p.sets && (p.a === id || p.b === id))
    .sort((x, y) => x.dia.localeCompare(y.dia) || x.inicio - y.inicio)
    .slice(-n)
    .map((p) => (ganador(p) === id ? 'G' : 'P'))
}

function CargarResultado({ p, guardar }: { p: Partido; guardar: (s: Sets | undefined) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState(p.sets?.map(([a, b]) => `${a}-${b}`).join(' ') ?? '')
  if (!p.a || !p.b) return null
  if (!abierto)
    return (
      <button className="comp-cargar-abrir" onClick={() => setAbierto(true)}>
        {p.sets ? 'Corregir resultado' : 'Cargar resultado'}
      </button>
    )
  return (
    <form
      className="comp-cargar"
      onSubmit={(ev) => {
        ev.preventDefault()
        const sets = texto
          .trim()
          .split(/\s+/)
          .map((s) => s.split('-').map(Number) as [number, number])
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
        guardar(sets.length ? sets : undefined)
        setAbierto(false)
      }}
    >
      <label>
        <span className="oculto">Resultado por sets</span>
        <input autoFocus value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="6-4 3-6 7-5…" inputMode="numeric" />
      </label>
      <button className="comp-boton comp-boton-lleno">Guardar</button>
    </form>
  )
}

/** Las dos parejas con sus games set por set, como en el marcador de la tele. */
function Marcador({ c, p }: { c: Competencia; p: Partido }) {
  const g = ganador(p)
  const fila = (id: string | null, origen: Partido['desdeA'], lado: 0 | 1) => {
    const nombre = id ? c.parejas.find((x) => x.id === id)?.nombre : etiquetaOrigen(origen)
    const clase = !id ? 'falta' : g === id ? 'gana' : g ? 'pierde' : ''
    return (
      <div className={`comp-lado ${clase}`}>
        <span className="comp-nombre">{nombre}</span>
        {p.sets && (
          <span className="comp-games">
            {p.sets.map((s, i) => (
              <b key={i} className={s[lado] > s[1 - lado] ? 'set-gana' : ''}>
                {s[lado]}
              </b>
            ))}
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="comp-marcador">
      {fila(p.a, p.desdeA, 0)}
      {fila(p.b, p.desdeB, 1)}
    </div>
  )
}

function PartidoFila({ c, p, editable, guardar }: { c: Competencia; p: Partido; editable?: boolean; guardar?: (id: string, s: Sets | undefined) => void }) {
  return (
    <li className={`comp-partido${p.sets ? ' jugado' : ''}`}>
      <p className="comp-partido-cuando">
        <strong>{hora(p.inicio)}</strong> {canchaNombre(p.canchaId)}
        {!p.sets && <span className="comp-pendiente">Por jugar</span>}
      </p>
      <Marcador c={c} p={p} />
      {editable && <CargarResultado key={p.sets?.join() ?? 'sin'} p={p} guardar={(s) => guardar?.(p.id, s)} />}
    </li>
  )
}

function TablaPosiciones({
  filas,
  partidos,
  clasifican = 0,
  antes,
  zona,
}: {
  filas: ReturnType<typeof tabla>
  partidos: Partido[]
  clasifican?: number
  /** Puesto de cada pareja en la fecha anterior, para mostrar si subió o bajó. */
  antes?: Record<string, number>
  /** Qué ganan los que clasifican, para la leyenda. */
  zona?: string
}) {
  return (
    <div className="comp-tabla-marco">
      <table className="comp-tabla">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>Pareja</th>
            <th className="num">PJ</th>
            <th className="num ancho">PG</th>
            <th className="num" title="Diferencia de sets">Dif</th>
            <th className="num ancho">Games</th>
            <th className="ultimos">Últimos</th>
            <th className="num">Pts</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const dif = f.sf - f.sc
            const mov = antes && antes[f.pareja.id] !== undefined ? antes[f.pareja.id] - i : 0
            return (
              <tr key={f.pareja.id} className={`${i === 0 && f.pj ? 'primero' : ''} ${i < clasifican ? 'clasifica' : ''} ${i === clasifican - 1 ? 'corte' : ''}`}>
                <td className="num">
                  <span className="comp-puesto">{i + 1}</span>
                </td>
                <td className="comp-tabla-pareja">
                  <span className="comp-pareja-nombre">{f.pareja.nombre}</span>
                  {mov !== 0 && (
                    <span className={`comp-mov ${mov > 0 ? 'sube' : 'baja'}`} aria-label={mov > 0 ? `Subió ${mov}` : `Bajó ${-mov}`}>
                      {mov > 0 ? <ArrowUp size={11} strokeWidth={3} aria-hidden="true" /> : <ArrowDown size={11} strokeWidth={3} aria-hidden="true" />}
                      {Math.abs(mov)}
                    </span>
                  )}
                </td>
                <td className="num">{f.pj}</td>
                <td className="num ancho">{f.pg}</td>
                <td className={`num comp-dif ${dif > 0 ? 'mas' : dif < 0 ? 'menos' : ''}`}>
                  {dif > 0 ? `+${dif}` : dif}
                </td>
                <td className="num ancho">
                  {f.gf}-{f.gc}
                </td>
                <td className="ultimos">
                  <span className="comp-racha" aria-label={`Últimos: ${racha(f.pareja.id, partidos).join(', ') || 'sin partidos'}`}>
                    {racha(f.pareja.id, partidos).map((x, k) => (
                      <i key={k} className={x === 'G' ? 'g' : 'p'}>
                        {x}
                      </i>
                    ))}
                  </span>
                </td>
                <td className="num">
                  <strong className="comp-pts">{f.pts}</strong>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {zona && clasifican > 0 && (
        <p className="comp-leyenda">
          <i aria-hidden="true" /> {zona}
        </p>
      )}
    </div>
  )
}

// Medidas del cuadro, en píxeles: en el celular más chico, para que entren casi dos rondas a la vista
const tamañoLlave = {
  grande: { CRUCE: 236, ALTO: 92, FILA: 112, HUECO: 40, TITULO: 40, PODIO: 184 },
  chico: { CRUCE: 214, ALTO: 86, FILA: 100, HUECO: 22, TITULO: 36, PODIO: 150 },
}

function useAngosto() {
  const consulta = '(max-width: 700px)'
  const [angosto, setAngosto] = useState(() => matchMedia(consulta).matches)
  useEffect(() => {
    const m = matchMedia(consulta)
    const cambiar = () => setAngosto(m.matches)
    m.addEventListener('change', cambiar)
    return () => m.removeEventListener('change', cambiar)
  }, [])
  return angosto
}

/** El cuadro de eliminación con las líneas que llevan cada cruce al siguiente, hasta la copa. */
function Llave({ c, rs, campeones }: { c: Competencia; rs: { ronda: string; partidos: Partido[] }[]; campeones: Pareja | null }) {
  const { CRUCE, ALTO, FILA, HUECO, TITULO, PODIO } = tamañoLlave[useAngosto() ? 'chico' : 'grande']
  const marco = useRef<HTMLDivElement>(null)
  const actual = rs.findIndex((r) => r.partidos.some((p) => !p.sets))
  const x = (k: number) => k * (CRUCE + HUECO)
  const y = (k: number, i: number) => TITULO + (i + 0.5) * FILA * 2 ** k
  const ancho = x(rs.length) + PODIO
  const alto = TITULO + rs[0].partidos.length * FILA
  const final = rs[rs.length - 1].partidos[0]
  const lineas: { d: string; ruta: boolean }[] = []
  rs.forEach((r, k) =>
    r.partidos.forEach((p, i) => {
      const x1 = x(k) + CRUCE
      const y1 = y(k, i)
      const ruta = !!campeones && ganador(p) === campeones.id
      if (k < rs.length - 1) {
        const y2 = y(k + 1, Math.floor(i / 2))
        lineas.push({ d: `M${x1} ${y1}H${x1 + HUECO / 2}V${y2}H${x(k + 1)}`, ruta })
      } else lineas.push({ d: `M${x1} ${y1}H${x(k + 1)}`, ruta })
    }),
  )
  lineas.sort((a, b) => Number(a.ruta) - Number(b.ruta))
  const irA = (k: number) => {
    const el = marco.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, x(k) - 12), behavior: 'smooth' })
    // También baja la página hasta el primer cruce de esa ronda, que en las rondas finales queda más abajo
    const fila = Math.min(k, rs.length - 1)
    const arriba = el.getBoundingClientRect().top + window.scrollY + y(fila, 0) - ALTO / 2 - 150
    if (Math.abs(arriba - window.scrollY) > 40) window.scrollTo({ top: Math.max(0, arriba), behavior: 'smooth' })
  }

  // Al abrir, el cuadro arranca en la ronda que se está jugando
  useEffect(() => {
    if (actual > 0 && marco.current) marco.current.scrollLeft = Math.max(0, x(actual - 1) - 12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id, CRUCE])

  return (
    <>
      {rs.length > 2 && (
        <div className="llave-rondas" role="group" aria-label="Ir a la ronda">
          {rs.map((r, k) => (
            <button key={r.ronda} className={k === actual ? 'actual' : ''} onClick={() => irA(k)}>
              {r.ronda === 'Semifinal' ? 'Semis' : r.ronda}
              {r.partidos.every((p) => p.sets) && <Check size={13} strokeWidth={3} aria-hidden="true" />}
            </button>
          ))}
          <button onClick={() => irA(rs.length)}>
            <Trophy size={14} aria-hidden="true" /> Copa
          </button>
        </div>
      )}
      <div className="llave-marco" ref={marco} tabIndex={0} aria-label="Cuadro del torneo">
        <div className="llave" style={{ width: ancho, height: alto }}>
          <svg className="llave-lineas" width={ancho} height={alto} aria-hidden="true">
            {lineas.map((l, i) => (
              <path key={i} d={l.d} className={l.ruta ? 'ruta' : ''} />
            ))}
          </svg>
          {rs.map((r, k) => (
            <div key={r.ronda}>
              <p className="llave-ronda" style={{ left: x(k), width: CRUCE }}>
                {r.ronda === 'Semifinal' ? 'Semifinales' : r.ronda}
              </p>
              {r.partidos.map((p, i) => (
                <div key={p.id} className={`llave-cruce${ganador(p) ? ' jugado' : ''}`} style={{ left: x(k), top: y(k, i) - ALTO / 2, width: CRUCE, height: ALTO }}>
                  <p className="llave-cuando">
                    {corto(p.dia)}, {hora(p.inicio)}, {canchaNombre(p.canchaId)}
                  </p>
                  <Marcador c={c} p={p} />
                </div>
              ))}
            </div>
          ))}
          <p className="llave-ronda" style={{ left: x(rs.length), width: PODIO }}>
            Campeones
          </p>
          <div className={`llave-copa${campeones ? ' hay' : ''}`} style={{ left: x(rs.length), top: y(rs.length - 1, 0) - 62, width: PODIO, height: 124 }}>
            <Trophy size={30} aria-hidden="true" />
            <strong>{campeones ? campeones.nombre : 'A definir'}</strong>
            <span>{campeones ? c.categoria : `Final: ${corto(final.dia)}, ${hora(final.inicio)}`}</span>
          </div>
        </div>
      </div>
    </>
  )
}

type Vista = 'fixture' | 'tabla' | 'zonas' | 'cuadro'

export function VistaCompetencia({ c, editable, guardar }: { c: Competencia; editable?: boolean; guardar?: (partidoId: string, s: Sets | undefined) => void }) {
  const rs = rondas(c)
  const esLiga = c.formato === 'liga'
  const [vista, setVista] = useState<Vista>(esLiga ? 'fixture' : 'cuadro')
  const [ronda, setRonda] = useState(rondaActual(c))
  const [compartir, setCompartir] = useState(false)
  const cam = campeon(c)
  const vistas: [Vista, string][] = esLiga
    ? [['fixture', 'Fixture'], ['tabla', 'Tabla']]
    : zonasDe(c).length
      ? [['cuadro', 'Cuadro'], ['zonas', 'Zonas']]
      : [['cuadro', 'Cuadro']]
  const delaRonda = rs.find((r) => r.ronda === ronda) ?? rs[0]
  const eliminacion = rs.filter((r) => !r.ronda.startsWith('Zona'))

  return (
    <div className="comp">
      <div className="comp-barra">
        <div className="comp-pestanas" role="tablist">
          {vistas.map(([v, t]) => (
            <button key={v} role="tab" aria-selected={vista === v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {t}
            </button>
          ))}
        </div>
        <button className="comp-boton comp-boton-compartir" onClick={() => setCompartir(true)}>
          <Share2 size={17} aria-hidden="true" /> Compartir
        </button>
      </div>

      {vista === 'fixture' && (
        <>
          <div className="comp-rondas" role="tablist" aria-label="Fecha">
            {rs.map((r) => {
              const jugada = r.partidos.every((p) => p.sets)
              return (
                <button
                  key={r.ronda}
                  role="tab"
                  aria-selected={r.ronda === ronda}
                  className={`${r.ronda === ronda ? 'activa' : ''}${jugada ? ' jugada' : ''}`}
                  onClick={() => setRonda(r.ronda)}
                >
                  <strong>{r.ronda.replace('Fecha ', '')}</strong>
                  <span>{corto(r.partidos[0].dia)}</span>
                </button>
              )
            })}
          </div>
          <h3 className="comp-subtitulo">
            {delaRonda.ronda}
            <span>{capital(fechaLarga(delaRonda.partidos[0].dia))}</span>
          </h3>
          <ul className="comp-partidos">
            {delaRonda.partidos.map((p) => (
              <PartidoFila key={p.id} c={c} p={p} editable={editable} guardar={guardar} />
            ))}
          </ul>
        </>
      )}

      {vista === 'tabla' && (
        <>
          <TablaPosiciones
            filas={tabla(c.parejas, c.partidos)}
            partidos={c.partidos}
            antes={antesDeLaUltima(c)}
            clasifican={Math.min(4, Math.floor(c.parejas.length / 2))}
            zona={`Los ${Math.min(4, Math.floor(c.parejas.length / 2))} primeros juegan el Master de fin de año`}
          />
          <p className="comp-nota">Partido ganado suma 3 puntos. Desempata la diferencia de sets y después la de games.</p>
        </>
      )}

      {vista === 'zonas' && (
        <div className="comp-zonas">
          {zonasDe(c).map((z) => {
            const deZona = c.partidos.filter((p) => p.ronda === `Zona ${z}`)
            return (
              <section key={z} className="comp-zona">
                <h3 className="comp-zona-titulo">
                  <span>{z}</span> Zona {z}
                </h3>
                <TablaPosiciones filas={tabla(parejasDeZona(c, z), deZona)} partidos={deZona} clasifican={2} />
                <ul className="comp-partidos">
                  {rs.find((r) => r.ronda === `Zona ${z}`)!.partidos.map((p) => (
                    <PartidoFila key={p.id} c={c} p={p} editable={editable} guardar={guardar} />
                  ))}
                </ul>
              </section>
            )
          })}
          <p className="comp-nota">Pasan los dos primeros de cada zona a cuartos de final.</p>
        </div>
      )}

      {vista === 'cuadro' && (
        <>
          <p className="comp-nota comp-deslizar">Deslizá el cuadro para seguirlo hasta la final.</p>
          <Llave c={c} rs={eliminacion} campeones={cam} />
          {editable && (
            <div className="comp-zonas">
              {eliminacion.map((r) => (
                <section key={r.ronda} className="comp-zona">
                  <h3 className="comp-subtitulo">{r.ronda}</h3>
                  <ul className="comp-partidos">
                    {r.partidos.map((p) => (
                      <PartidoFila key={p.id} c={c} p={p} editable={editable} guardar={guardar} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <Compartir
        c={c}
        abierto={compartir}
        cerrar={() => setCompartir(false)}
        inicial={vista === 'tabla' ? { tipo: 'tabla' } : vista === 'fixture' ? { tipo: 'ronda', ronda } : vista === 'cuadro' ? { tipo: 'cuadro' } : { tipo: 'ronda', ronda: rs[0].ronda }}
      />
    </div>
  )
}

/** Elegir qué compartir, con qué diseño y en qué formato; vista previa en vivo. */
function Compartir({ c, abierto, cerrar, inicial }: { c: Competencia; abierto: boolean; cerrar: () => void; inicial: Contenido }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [contenido, setContenido] = useState<Contenido>(inicial)
  const [estilo, setEstilo] = useState(estilos[0])
  const [formato, setFormato] = useState<Formato>('post')
  const [aviso, setAviso] = useState('')
  const rs = rondas(c)

  useEffect(() => {
    if (abierto) {
      setContenido(inicial)
      setAviso('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (abierto && lienzo.current) dibujarAfiche(lienzo.current, c, contenido, estilo, formato)
  }, [abierto, c, contenido, estilo, formato])

  const opciones: [string, Contenido][] = [
    ...(c.formato === 'liga' ? ([['tabla', { tipo: 'tabla' }]] as [string, Contenido][]) : ([['cuadro', { tipo: 'cuadro' }]] as [string, Contenido][])),
    ...rs.map((r) => [r.ronda, { tipo: 'ronda', ronda: r.ronda }] as [string, Contenido]),
  ]
  const clave = contenido.tipo === 'ronda' ? contenido.ronda : contenido.tipo
  const nombreArchivo = `${c.nombre}-${clave}`.toLowerCase().replace(/[^a-z0-9ñáéíóú]+/g, '-')
  const mensaje = `${c.nombre} (${c.categoria}) en ${negocio.nombre}`
  const [w, h] = medidas[formato]

  return (
    <Dialogo abierto={abierto} cerrar={cerrar} titulo="Compartir" ancho={860}>
      <div className="afiche">
        <div className="afiche-vista" style={{ aspectRatio: `${w} / ${h}` }}>
          <canvas ref={lienzo} aria-label={`Vista previa: ${c.nombre}, ${clave}`} />
        </div>
        <div className="afiche-opciones">
          <label className="afiche-campo">
            Qué mostrar
            <select value={clave} onChange={(ev) => setContenido(opciones.find(([k]) => k === ev.target.value)![1])}>
              {opciones.map(([k]) => (
                <option key={k} value={k}>
                  {k === 'tabla' ? 'Tabla de posiciones' : k === 'cuadro' ? 'Cuadro final' : k}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="afiche-campo">
            <legend>Diseño</legend>
            <div className="afiche-estilos">
              {estilos.map((x) => (
                <button key={x.id} type="button" aria-pressed={estilo.id === x.id} className={estilo.id === x.id ? 'activo' : ''} onClick={() => setEstilo(x)}>
                  <span className="afiche-muestra" style={{ background: x.fondo, color: x.texto, boxShadow: `inset 0 -10px 0 ${x.banda}` }} aria-hidden="true">
                    Aa
                  </span>
                  {x.nombre}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="afiche-campo">
            <legend>Formato</legend>
            <div className="comp-pestanas">
              {(['post', 'historia'] as Formato[]).map((f) => (
                <button key={f} type="button" aria-pressed={formato === f} className={formato === f ? 'activa' : ''} onClick={() => setFormato(f)}>
                  {f === 'post' ? 'Publicación' : 'Historia'}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="afiche-acciones">
            <button
              className="comp-boton comp-boton-lleno comp-boton-ancho"
              onClick={async () => {
                const r = await compartirImagen(lienzo.current!, nombreArchivo, mensaje)
                setAviso(r === 'descargado' ? 'Se descargó la imagen. Adjuntala en WhatsApp o Instagram.' : r === 'compartido' ? 'Listo, compartido.' : '')
              }}
            >
              Mandar por WhatsApp
            </button>
            <button
              className="comp-boton comp-boton-ancho"
              onClick={() =>
                lienzo.current!.toBlob((b) => {
                  if (b) descargar(b, `${nombreArchivo}.png`)
                  setAviso('Imagen descargada.')
                }, 'image/png')
              }
            >
              Descargar imagen
            </button>
            <p className="comp-nota" aria-live="polite">
              {aviso || 'En el celular abre el menú para compartir; en la computadora descarga la imagen.'}
            </p>
          </div>
        </div>
      </div>
    </Dialogo>
  )
}
