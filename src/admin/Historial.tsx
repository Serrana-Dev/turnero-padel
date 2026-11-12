// Historial de cajas: cada día cerrado, quién lo cerró y si cerró justo. Y los gastos del mes por categoría.
import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { negocio } from '../config/negocio'
import { aperturaDe, metodos, resumenCaja, useDatos, type Estado, type Metodo } from '../lib/datos'
import { capital, deClave, diaMes, fechaCorta, fechaLarga, hora, hoyClave, mesAño, pesos, sumarDias } from '../lib/formato'
import { Dialogo } from '../lib/ui'
import { abrirWhatsApp, Buscador, Cabecera, Chips, coincide, Menos } from './comun'
import { DialogoGasto, textoCierre } from './Caja'

const DIAS = 42

function cajasDe(e: Estado) {
  const hoy = hoyClave()
  return Array.from({ length: DIAS }, (_, i) => sumarDias(hoy, -i - 1)).map((dia) => ({ dia, ...resumenCaja(e, dia) }))
}

export function Historial() {
  const e = useDatos()
  const ir = useNavigate()
  const cajas = useMemo(() => cajasDe(e), [e])
  const [filtro, setFiltro] = useState<'todas' | 'diferencia' | 'justas'>('todas')
  const [cajero, setCajero] = useState<string>('todos')
  const [ver, setVer] = useState<string | null>(null)

  const cerradas = cajas.filter((c) => c.cierre)
  const justas = cerradas.filter((c) => c.diferencia === 0)
  const acumulada = cerradas.reduce((s, c) => s + (c.diferencia ?? 0), 0)
  const promedio = cajas.reduce((s, c) => s + c.entro, 0) / cajas.length
  const mejor = [...cajas].sort((a, b) => b.entro - a.entro)[0]
  const lista = cajas
    .filter((c) => (filtro === 'todas' ? true : filtro === 'justas' ? c.diferencia === 0 : c.diferencia !== 0 && c.diferencia !== null))
    .filter((c) => cajero === 'todos' || c.cierre?.cajero === cajero)

  // Calendario: semanas de lunes a domingo, la última termina ayer
  const ayer = sumarDias(hoyClave(), -1)
  const ultimoDomingo = sumarDias(ayer, (7 - deClave(ayer).getDay()) % 7)
  const semanas = Array.from({ length: 6 }, (_, s) => Array.from({ length: 7 }, (_, d) => sumarDias(ultimoDomingo, -(5 - s) * 7 - 6 + d)))
  const maxEntro = Math.max(...cajas.map((c) => c.entro), 1)

  return (
    <div className="pantalla">
      <Cabecera
        seccion="plata"
        titulo="Historial de cajas"
        frase={
          <>
            En las últimas 6 semanas cerraron justas <strong>{justas.length} de {cerradas.length}</strong> cajas. Diferencia acumulada:{' '}
            <strong>{acumulada === 0 ? '$0' : `${acumulada > 0 ? '+' : '−'}${pesos(Math.abs(acumulada))}`}</strong>.
          </>
        }
      />

      <div className="kpis">
        <div className="kpi kpi-principal"><span>Entra por día</span><strong>{pesos(promedio)}</strong><small>promedio de canchas y cantina</small></div>
        <div className="kpi"><span>El mejor día</span><strong>{pesos(mejor.entro)}</strong><small>{capital(fechaLarga(mejor.dia))}</small></div>
        <div className="kpi"><span>Cerraron justas</span><strong className="bien">{Math.round((justas.length / Math.max(1, cerradas.length)) * 100)}%</strong><small>{cerradas.length - justas.length} con diferencia</small></div>
        <div className="kpi"><span>Diferencia acumulada</span><strong className={acumulada < 0 ? 'mal' : acumulada > 0 ? 'bien' : ''}>{acumulada === 0 ? pesos(0) : `${acumulada > 0 ? '+' : '−'}${pesos(Math.abs(acumulada))}`}</strong><small>sumando sobrantes y faltantes</small></div>
      </div>

      <div className="grilla-rail grilla-historial">
        <section className="tarjeta">
          <div className="tarjeta-cabeza">
            <h2>Calendario de cierres</h2>
            <span className="leyenda-cierres"><i className="c-justa" /> Justa <i className="c-sobra" /> Sobró <i className="c-falta" /> Faltó</span>
          </div>
          <div className="calendario-cajas" role="grid" aria-label="Calendario de cierres">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <span key={d} className="cal-dow">{d}</span>)}
            {semanas.flat().map((dia) => {
              const c = cajas.find((x) => x.dia === dia)
              if (!c) return <span key={dia} className="cal-dia cal-fuera" />
              const t = c.diferencia === null ? 'abierta' : c.diferencia === 0 ? 'justa' : c.diferencia > 0 ? 'sobra' : 'falta'
              return (
                <button key={dia} className={`cal-dia cal-${t}`} onClick={() => setVer(dia)} aria-label={`${fechaLarga(dia)}: entró ${pesos(c.entro)}`}>
                  <span className="cal-num">{deClave(dia).getDate()}</span>
                  <span className="cal-barra"><i style={{ height: `${(c.entro / maxEntro) * 100}%` }} /></span>
                  <span className="cal-monto">{Math.round(c.entro / 1000)}k</span>
                </button>
              )
            })}
          </div>
          <p className="ayuda">Cada día muestra lo que entró, en miles. Tocá uno para ver su informe de cierre.</p>
        </section>

        <aside className="rail">
          <h2 className="rail-titulo">Quién cerró</h2>
          <div className="tarjeta">
            <ul className="cajeros">
              {negocio.cajeros.map((n) => {
                const suyas = cerradas.filter((c) => c.cierre!.cajero === n)
                const dif = suyas.reduce((s, c) => s + (c.diferencia ?? 0), 0)
                const malas = suyas.filter((c) => c.diferencia !== 0).length
                return (
                  <li key={n}>
                    <span className="cajero-inicial">{n[0]}</span>
                    <span><strong>{n}</strong><small>{suyas.length} cierres · {malas} con diferencia</small></span>
                    <strong className={dif < 0 ? 'mal' : dif > 0 ? 'bien' : ''}>{dif === 0 ? 'Justo' : `${dif > 0 ? '+' : '−'}${pesos(Math.abs(dif))}`}</strong>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>

      <div className="herramientas">
        <Chips<'todas' | 'diferencia' | 'justas'> opciones={[['todas', 'Todas'], ['diferencia', 'Con diferencia'], ['justas', 'Justas']]} valor={filtro} cambiar={setFiltro} />
        <select className="select-chico" value={cajero} onChange={(ev) => setCajero(ev.target.value)} aria-label="Cajero">
          <option value="todos">Todos los cajeros</option>
          {negocio.cajeros.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <ul className="cajas-lista">
        {lista.map((c) => (
          <li key={c.dia}>
            <button className="caja-fila" onClick={() => setVer(c.dia)}>
              <span className="caja-fecha"><strong>{capital(fechaCorta(c.dia))}</strong><small>{diaMes(c.dia)}</small></span>
              <span className="caja-quien">{c.cierre ? <><strong>{c.cierre.cajero}</strong><small>{hora(c.cierre.abrio)} a {hora(c.cierre.hora)}</small></> : <small>Sin cerrar</small>}</span>
              <span className="caja-num"><small>Entró</small><strong>{pesos(c.entro)}</strong></span>
              <span className="caja-num solo-ancho"><small>Salió</small><strong>{pesos(c.salio)}</strong></span>
              <span className="caja-num solo-ancho"><small>Contado</small><strong>{c.cierre ? pesos(c.cierre.contado) : '—'}</strong></span>
              <span className={`estado ${c.diferencia === 0 ? 'estado-pagada' : c.diferencia === null ? '' : c.diferencia > 0 ? 'estado-señada' : 'estado-pendiente'}`}>
                {c.diferencia === null ? 'Abierta' : c.diferencia === 0 ? 'Justa' : `${c.diferencia > 0 ? 'Sobró' : 'Faltó'} ${pesos(Math.abs(c.diferencia))}`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {ver && <InformeCierre dia={ver} cerrar={() => setVer(null)} irAlDia={() => ir(`/admin/caja?dia=${ver}`)} />}
    </div>
  )
}

/** El informe de cierre (el "Z" del día), como un ticket. */
function InformeCierre({ dia, cerrar, irAlDia }: { dia: string; cerrar: () => void; irAlDia: () => void }) {
  const e = useDatos()
  const r = resumenCaja(e, dia)
  const por = (m: Metodo) => r.ventas.filter((l) => l.metodo === m).reduce((s, l) => s + l.monto, 0)
  const gastosEfe = -r.salidas.filter((l) => l.metodo === 'efectivo').reduce((s, l) => s + l.monto, 0)
  const retiros = -r.retiros.filter((l) => l.monto < 0).reduce((s, l) => s + l.monto, 0)
  const ingresos = r.retiros.filter((l) => l.monto > 0).reduce((s, l) => s + l.monto, 0)
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Informe de cierre" ancho={440}>
      <div className="ticket-z">
        <header>
          <strong>{negocio.nombre}</strong>
          <span>{capital(fechaLarga(dia))}</span>
          <span>{r.cierre ? `Caja de ${r.cierre.cajero} · ${hora(r.cierre.abrio)} a ${hora(r.cierre.hora)}` : 'Caja sin cerrar'}</span>
        </header>
        <dl>
          <dt>Canchas</dt><dd>{pesos(r.canchas)}</dd>
          <dt>Cantina</dt><dd>{pesos(r.cantina)}</dd>
          <dt className="z-total">Total vendido</dt><dd className="z-total">{pesos(r.entro)}</dd>
        </dl>
        <dl>
          {(Object.keys(metodos) as Metodo[]).map((m) => <Fragment key={m}><dt>{metodos[m]}</dt><dd>{pesos(por(m))}</dd></Fragment>)}
        </dl>
        <dl>
          <dt>Gastos y compras</dt><dd><Menos n={r.salio} /></dd>
          <dt className="z-total">Resultado del día</dt><dd className="z-total">{pesos(r.entro - r.salio)}</dd>
        </dl>
        <p className="z-titulo">Arqueo del efectivo</p>
        <dl>
          <dt>Cambio inicial</dt><dd>{pesos(aperturaDe(e, dia)?.monto ?? negocio.cajaInicial)}</dd>
          <dt>Entró en efectivo</dt><dd>+{pesos(por('efectivo'))}</dd>
          <dt>Gastos en efectivo</dt><dd><Menos n={gastosEfe} /></dd>
          {retiros > 0 && <><dt>Retiros</dt><dd><Menos n={retiros} /></dd></>}
          {ingresos > 0 && <><dt>Ingresos de cambio</dt><dd>+{pesos(ingresos)}</dd></>}
          <dt className="z-total">Tendría que haber</dt><dd className="z-total">{pesos(r.esperado)}</dd>
          <dt>Se contó</dt><dd>{r.cierre ? pesos(r.cierre.contado) : '—'}</dd>
        </dl>
        <p className={`z-resultado ${r.diferencia === 0 ? 'z-justa' : r.diferencia === null ? '' : r.diferencia > 0 ? 'z-sobra' : 'z-falta'}`}>
          {r.diferencia === null ? 'Sin cerrar' : r.diferencia === 0 ? 'Cerró justa' : `${r.diferencia > 0 ? 'Sobraron' : 'Faltaron'} ${pesos(Math.abs(r.diferencia))}`}
        </p>
      </div>
      <div className="acciones-fila">
        <button className="boton" onClick={cerrar}>Cerrar</button>
        {r.cierre && <button className="boton boton-wsp" onClick={() => abrirWhatsApp(textoCierre(r, r.cierre!.contado, r.cierre!.cajero, dia))}>Mandar por WhatsApp</button>}
        <button className="boton boton-primario" onClick={irAlDia}>Ver los movimientos</button>
      </div>
    </Dialogo>
  )
}

// ——— Gastos ———
const coloresGasto: Record<string, string> = {
  Mercadería: '#2f6fd6',
  Sueldos: '#0a1d42',
  Servicios: '#b4532a',
  'Mantenimiento de canchas': '#12804a',
  Limpieza: '#7c4dcc',
  Otros: '#8ea2c8',
}

export function Gastos() {
  const e = useDatos()
  const hoy = hoyClave()
  const [mes, setMes] = useState<'este' | 'anterior'>('este')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('todas')
  const [nuevo, setNuevo] = useState(false)
  const inicioEste = hoy.slice(0, 8) + '01'
  const inicioAnt = sumarDias(inicioEste, -1).slice(0, 8) + '01'
  const [desde, hasta] = mes === 'este' ? [inicioEste, hoy] : [inicioAnt, sumarDias(inicioEste, -1)]
  const delMes = e.gastos.filter((g) => g.dia >= desde && g.dia <= hasta)
  const total = delMes.reduce((s, g) => s + g.monto, 0)
  // Para comparar: el mes anterior hasta el mismo día
  const diaDelMes = Number(hoy.slice(8))
  const antHasta = sumarDias(inicioAnt, diaDelMes - 1)
  const comparado = e.gastos.filter((g) => g.dia >= inicioAnt && g.dia <= antHasta).reduce((s, g) => s + g.monto, 0)
  const porCat = negocio.categoriasGasto.map((c) => ({ c, total: delMes.filter((g) => g.categoria === c).reduce((s, g) => s + g.monto, 0) })).sort((a, b) => b.total - a.total)
  const lista = delMes
    .filter((g) => (cat === 'todas' || g.categoria === cat) && (!q || coincide(g.concepto, q) || coincide(g.categoria, q)))
    .sort((a, b) => (b.dia + String(b.hora).padStart(4, '0')).localeCompare(a.dia + String(a.hora).padStart(4, '0')))
  const dias = [...new Set(lista.map((g) => g.dia))]

  return (
    <div className="pantalla">
      <Cabecera
        seccion="plata"
        titulo="Gastos"
        frase={
          <>
            {mes === 'este' ? 'Este mes' : capital(mesAño(desde))} van <strong>{pesos(total)}</strong> en gastos. Lo más grande: <strong>{porCat[0].c.toLowerCase()}</strong> ({pesos(porCat[0].total)}).
            {mes === 'este' && comparado > 0 && <> El mes pasado, a esta altura, iban {pesos(comparado)}.</>}
          </>
        }
      >
        <button className="boton boton-primario" onClick={() => setNuevo(true)}><Plus size={16} aria-hidden="true" /> Registrar gasto</button>
      </Cabecera>

      <div className="segmentos">
        <button className={mes === 'este' ? 'activa' : ''} onClick={() => setMes('este')}>{capital(mesAño(inicioEste))}</button>
        <button className={mes === 'anterior' ? 'activa' : ''} onClick={() => setMes('anterior')}>{capital(mesAño(inicioAnt))}</button>
      </div>

      <section className="tarjeta">
        <div className="tarjeta-cabeza"><h2>En qué se va la plata</h2><strong>{pesos(total)}</strong></div>
        <div className="apilada" aria-hidden="true">
          {porCat.filter((x) => x.total).map((x) => <i key={x.c} style={{ flexGrow: x.total, background: coloresGasto[x.c] }} />)}
        </div>
        <ul className="gastos-categorias">
          {porCat.map((x) => (
            <li key={x.c}>
              <button className={cat === x.c ? 'activa' : ''} onClick={() => setCat(cat === x.c ? 'todas' : x.c)}>
                <i style={{ background: coloresGasto[x.c] }} aria-hidden="true" />
                <span>{x.c}</span>
                <strong>{pesos(x.total)}</strong>
                <small>{total ? Math.round((x.total / total) * 100) : 0}%</small>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="herramientas">
        <Buscador valor={q} cambiar={setQ} texto="Buscar gasto: luz, sueldo, arena…" />
        {cat !== 'todas' && <button className="boton boton-chico" onClick={() => setCat('todas')}>Ver todas las categorías</button>}
      </div>
      {dias.length === 0 ? (
        <p className="vacio-grande">No hay gastos con ese filtro.</p>
      ) : (
        dias.map((d) => (
          <section key={d} className="gastos-dia">
            <h3>{d === hoy ? 'Hoy' : capital(fechaLarga(d))} <span>{pesos(lista.filter((g) => g.dia === d).reduce((s, g) => s + g.monto, 0))}</span></h3>
            <ul>
              {lista.filter((g) => g.dia === d).map((g) => (
                <li key={g.id}>
                  <i style={{ background: coloresGasto[g.categoria] ?? '#8ea2c8' }} aria-hidden="true" />
                  <span><strong>{g.concepto}</strong><small>{g.categoria} · {metodos[g.metodo]} · {hora(g.hora)}</small></span>
                  <strong className="mal"><Menos n={g.monto} /></strong>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {nuevo && <DialogoGasto cerrar={() => setNuevo(false)} />}
    </div>
  )
}
