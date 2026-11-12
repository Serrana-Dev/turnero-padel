// Caja de hoy: todo lo que entra (canchas, cantina) y sale (compras, sueldos, retiros), con apertura, cierre y arqueo.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, Lock, LockOpen, Minus, Plus, Receipt, ShoppingBag } from 'lucide-react'
import { negocio } from '../config/negocio'
import { abrirCaja, anularVenta, aperturaDe, cerrarCaja, reabrirCaja, metodos, registrarGasto, registrarRetiro, resumenCaja, useDatos, type LineaCaja, type Metodo } from '../lib/datos'
import { capital, fechaLarga, hora, hoyClave, pesos, sumarDias } from '../lib/formato'
import { Dialogo } from '../lib/ui'
import { abrirWhatsApp, Cabecera, Menos } from './comun'
import { usePanel } from './Panel'

type Filtro = 'todo' | 'cancha' | 'cantina' | 'gasto' | 'retiro'

export function Caja() {
  const e = useDatos()
  const { verReserva } = usePanel()
  const hoy = hoyClave()
  const [sp, setSp] = useSearchParams()
  const dia = sp.get('dia') ?? hoy
  const setDia = (d: string) => setSp(d === hoy ? {} : { dia: d })
  const [filtro, setFiltro] = useState<Filtro>('todo')
  const [dialogo, setDialogo] = useState<'gasto' | 'retiro' | 'cierre' | 'abrir' | null>(null)
  const [anular, setAnular] = useState<LineaCaja | null>(null)
  const r = useMemo(() => resumenCaja(e, dia), [e, dia])
  const esHoy = dia === hoy
  const apertura = aperturaDe(e, dia)
  const sinAbrir = esHoy && !apertura && !r.cierre
  const sinRegistro = !esHoy && !apertura && !r.cierre

  // Saldo del cajón (solo efectivo) después de cada movimiento, de la apertura en adelante
  const saldos = useMemo(() => {
    const m = new Map<string, number>()
    let s = aperturaDe(e, dia)?.monto ?? negocio.cajaInicial
    for (const l of [...r.lineas].reverse()) {
      if (l.metodo === 'efectivo') s += l.monto
      m.set(l.id, s)
    }
    return m
  }, [r.lineas])
  // Las señas de la web entran todas por transferencia: se muestran juntas en una sola línea
  const señas = r.lineas.filter((l) => l.detalle === 'Seña del turno')
  const agrupadas: LineaCaja[] = señas.length > 1
    ? [...r.lineas.filter((l) => l.detalle !== 'Seña del turno'), { id: señas[0].id, hora: Math.max(...señas.map((l) => l.hora)), tipo: 'cancha', concepto: `${señas.length} señas de turnos reservados`, detalle: 'Señas por transferencia', metodo: 'transferencia', monto: señas.reduce((s2, l) => s2 + l.monto, 0) } as LineaCaja].sort((a, b) => b.hora - a.hora)
    : r.lineas
  const visibles = filtro === 'todo' ? agrupadas : agrupadas.filter((l) => l.tipo === filtro)

  return (
    <div className="pantalla">
      <Cabecera
        seccion="plata"
        titulo={esHoy ? 'Caja de hoy' : capital(fechaLarga(dia))}
        frase={
          <>
            Entraron <strong>{pesos(r.entro)}</strong> y salieron <strong>{pesos(r.salio)}</strong>.{' '}
            {r.cierre ? <>Se cerró con <strong>{pesos(r.cierre.contado)}</strong> en el cajón.</> : <>En el cajón tendría que haber <strong>{pesos(r.esperado)}</strong>.</>}
          </>
        }
      >
        <div className="segmentos segmentos-claros">
          <button onClick={() => setDia(sumarDias(dia, -1))} aria-label="Día anterior">←</button>
          <button className={esHoy ? 'activa' : ''} onClick={() => setDia(hoy)}>Hoy</button>
          <button onClick={() => setDia(sumarDias(dia, 1))} disabled={dia >= hoy} aria-label="Día siguiente">→</button>
        </div>
      </Cabecera>

      <div className={`estado-caja ${r.cierre ? 'estado-caja-cerrada' : ''} ${sinAbrir ? 'estado-caja-sin-abrir' : ''}`}>
        {r.cierre ? <Lock size={18} aria-hidden="true" /> : <LockOpen size={18} aria-hidden="true" />}
        {r.cierre ? (
          <p>
            <strong>Cerrada por {r.cierre.cajero}</strong> a las {hora(r.cierre.hora)}
            {r.diferencia === 0 ? ': cerró justa.' : `: ${r.diferencia! > 0 ? 'sobraron' : 'faltaron'} ${pesos(Math.abs(r.diferencia!))}.`}
          </p>
        ) : sinRegistro ? (
          <p>
            <strong>Sin registro de apertura ni cierre</strong> para este día.
          </p>
        ) : sinAbrir ? (
          <p>
            <strong>La caja todavía no se abrió.</strong> Contá el cambio con el que arrancás y abrila.
          </p>
        ) : (
          <p>
            <strong>Abierta por {apertura?.cajero ?? 'el encargado'}</strong> a las {hora(apertura?.hora ?? 480)} con {pesos(apertura?.monto ?? negocio.cajaInicial)} de cambio.
          </p>
        )}
        {sinAbrir && <button className="boton boton-chico boton-amarillo" onClick={() => setDialogo('abrir')}>Abrir caja</button>}
        {!r.cierre && !sinAbrir && !sinRegistro && <button className="boton boton-chico boton-primario" onClick={() => setDialogo('cierre')}>Cerrar caja</button>}
        {r.cierre && esHoy && <button className="boton boton-chico" onClick={() => reabrirCaja(dia)}>Reabrir</button>}
        {r.cierre && <Link className="boton boton-chico" to="/admin/caja/historial">Ver historial</Link>}
      </div>

      <div className="caja-acciones">
        <Link className={`boton ${esHoy ? '' : 'deshabilitado'}`} to="/admin/vender"><ShoppingBag size={16} aria-hidden="true" /> Vender</Link>
        <button className="boton" disabled={!esHoy || !!r.cierre} onClick={() => setDialogo('gasto')}><Receipt size={16} aria-hidden="true" /> Registrar gasto</button>
        <button className="boton" disabled={!esHoy || !!r.cierre} onClick={() => setDialogo('retiro')}><ArrowLeftRight size={16} aria-hidden="true" /> Retiro o ingreso de efectivo</button>
      </div>

      <div className="kpis kpis-caja">
        <div className="kpi kpi-principal"><span>Entró</span><strong className="bien">{pesos(r.entro)}</strong><small>{pesos(r.canchas)} canchas · {pesos(r.cantina)} cantina</small></div>
        <div className="kpi"><span>Salió</span><strong className={r.salio ? 'mal' : ''}>{pesos(r.salio)}</strong><small>{r.salidas.length} {r.salidas.length === 1 ? 'gasto' : 'gastos y compras'}</small></div>
        <div className="kpi"><span>Resultado del día</span><strong>{pesos(r.entro - r.salio)}</strong><small>lo que entró menos lo que salió</small></div>
        <div className="kpi kpi-cajon"><span>En el cajón</span><strong>{pesos(r.cierre ? r.cierre.contado : r.esperado)}</strong><small>{r.cierre ? 'contado al cerrar' : 'efectivo esperado ahora'}</small></div>
      </div>

      <div className="grilla-rail">
        <section className="tarjeta">
          <div className="tarjeta-cabeza">
            <h2>Movimientos del día</h2>
            <span className="tenue">Lo último, arriba</span>
          </div>
          <div className="chips-filtro" role="group">
            {([['todo', 'Todo'], ['cancha', 'Canchas'], ['cantina', 'Cantina'], ['gasto', 'Gastos'], ['retiro', 'Retiros']] as [Filtro, string][]).map(([k, t]) => (
              <button key={k} className={filtro === k ? 'activa' : ''} onClick={() => setFiltro(k)}>
                {t} <span>{k === 'todo' ? agrupadas.length : agrupadas.filter((l) => l.tipo === k).length}</span>
              </button>
            ))}
          </div>
          {visibles.length === 0 ? (
            <p className="vacio">No hay movimientos.</p>
          ) : (
            <ol className="linea-tiempo">
              {visibles.map((l) => (
                <Movimiento key={l.id} l={l} saldo={saldos.get(l.id)!} abrir={() => l.reserva && verReserva(l.reserva)} anular={esHoy && !r.cierre && l.venta && !l.anulada ? () => setAnular(l) : undefined} />
              ))}
              {apertura && (
                <li className="lt lt-apertura">
                  <span className="lt-hora">{hora(apertura.hora)}</span>
                  <span className="lt-punto" aria-hidden="true" />
                  <span className="lt-texto"><strong>Apertura de caja</strong><small>{apertura.cajero} contó el cambio</small></span>
                  <span className="lt-monto">{pesos(apertura.monto)}</span>
                  <span className="lt-saldo">{pesos(apertura.monto)}</span>
                </li>
              )}
            </ol>
          )}
        </section>

        <aside className="rail">
          <h2 className="rail-titulo">Por medio de pago</h2>
          <div className="tarjeta medios">
            {(Object.keys(metodos) as Metodo[]).map((m) => {
              const ent = r.ventas.filter((l) => l.metodo === m).reduce((s, l) => s + l.monto, 0)
              const sal = -r.salidas.filter((l) => l.metodo === m).reduce((s, l) => s + l.monto, 0)
              return (
                <div key={m} className={`medio medio-${m}`}>
                  <span className="medio-nombre">{metodos[m]}</span>
                  <strong>{pesos(ent - sal)}</strong>
                  <small>Entró {pesos(ent)}{sal > 0 ? <> · salió <Menos n={sal} /></> : null}</small>
                </div>
              )
            })}
          </div>
          <h2 className="rail-titulo">Retiros e ingresos de efectivo</h2>
          <div className="tarjeta">
            {r.retiros.length === 0 ? (
              <p className="vacio">Hoy no se sacó plata del cajón.</p>
            ) : (
              <ul className="lista-simple">
                {r.retiros.map((l) => (
                  <li key={l.id}><span>{hora(l.hora)} · {l.concepto}<small>{l.detalle}</small></span><strong className={l.monto < 0 ? 'mal' : 'bien'}>{l.monto < 0 ? '−' : '+'}{pesos(Math.abs(l.monto))}</strong></li>
                ))}
              </ul>
            )}
            <p className="ayuda">Un retiro no es un gasto: la plata sale del cajón pero sigue siendo del club (por ejemplo, para depositarla).</p>
          </div>
        </aside>
      </div>

      {dialogo === 'gasto' && <DialogoGasto cerrar={() => setDialogo(null)} />}
      {dialogo === 'retiro' && <DialogoRetiro cerrar={() => setDialogo(null)} />}
      {dialogo === 'cierre' && <DialogoCierre dia={dia} cerrar={() => setDialogo(null)} />}
      {dialogo === 'abrir' && <DialogoAbrir cerrar={() => setDialogo(null)} />}
      {anular && <DialogoAnular l={anular} cerrar={() => setAnular(null)} />}
    </div>
  )
}

function Movimiento({ l, saldo, abrir, anular }: { l: LineaCaja; saldo: number; abrir: () => void; anular?: () => void }) {
  const entra = l.monto >= 0
  return (
    <li className={`lt lt-${l.tipo} ${entra ? 'lt-entra' : 'lt-sale'} ${l.anulada ? 'lt-anulada' : ''} ${anular ? 'lt-con-accion' : ''}`}>
      <span className="lt-hora">{hora(l.hora)}</span>
      <span className="lt-punto" aria-hidden="true">{entra ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}</span>
      <button className="lt-texto" onClick={abrir} disabled={!l.reserva}>
        <strong>{l.concepto}</strong>
        <small>{l.detalle} · {metodos[l.metodo]}</small>
      </button>
      <span className="lt-monto">
        {l.monto === 0 ? pesos(0) : `${entra ? '+' : '−'}${pesos(Math.abs(l.monto))}`}
        {anular && <button className="lt-anular" onClick={anular}>Anular</button>}
      </span>
      <span className="lt-saldo">{l.metodo === 'efectivo' ? pesos(saldo) : ''}</span>
    </li>
  )
}

export function DialogoGasto({ cerrar }: { cerrar: () => void }) {
  const [categoria, setCategoria] = useState<string>('Otros')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<Metodo>('efectivo')
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Registrar gasto">
      <form
        className="formulario"
        onSubmit={(ev) => {
          ev.preventDefault()
          registrarGasto({ categoria, concepto: concepto.trim() || categoria, monto: Number(monto), metodo })
          cerrar()
        }}
      >
        <div className="campo">
          Categoría
          <div className="chips-filtro">
            {negocio.categoriasGasto.filter((c) => c !== 'Mercadería').map((c) => <button key={c} type="button" className={categoria === c ? 'activa' : ''} onClick={() => setCategoria(c)}>{c}</button>)}
          </div>
        </div>
        <label className="campo">
          Concepto
          <input value={concepto} onChange={(ev) => setConcepto(ev.target.value)} placeholder="Ej.: arreglo de la red de la cancha 3" />
        </label>
        <div className="campos-2">
          <label className="campo">
            Monto
            <input type="number" inputMode="numeric" min={1} required value={monto} onChange={(ev) => setMonto(ev.target.value)} />
          </label>
          <label className="campo">
            Se pagó con
            <select value={metodo} onChange={(ev) => setMetodo(ev.target.value as Metodo)}>{Object.entries(metodos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
        </div>
        <p className="ayuda">{metodo === 'efectivo' ? 'Sale del cajón: se descuenta del efectivo esperado.' : 'No toca el cajón, pero cuenta en el resultado del día.'} Las compras de mercadería se cargan en Compras, así también suben el stock.</p>
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario" disabled={!monto}>Guardar gasto</button>
        </div>
      </form>
    </Dialogo>
  )
}

function DialogoRetiro({ cerrar }: { cerrar: () => void }) {
  const e = useDatos()
  const hay = resumenCaja(e, hoyClave()).esperado
  const [tipo, setTipo] = useState<'retiro' | 'ingreso'>('retiro')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('Retiro para depositar en el banco')
  const [quien, setQuien] = useState(negocio.cajeros[0])
  const motivos = tipo === 'retiro' ? ['Retiro para depositar en el banco', 'Se lo lleva el dueño', 'Pago en mano a un proveedor'] : ['Cambio extra en billetes chicos', 'Devolución de un adelanto']
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Retiro o ingreso de efectivo">
      <form
        className="formulario"
        onSubmit={(ev) => {
          ev.preventDefault()
          registrarRetiro({ tipo, monto: Number(monto), motivo, quien })
          cerrar()
        }}
      >
        <div className="segmentos segmentos-ancho">
          <button type="button" className={tipo === 'retiro' ? 'activa' : ''} onClick={() => { setTipo('retiro'); setMotivo('Retiro para depositar en el banco') }}>Saco plata</button>
          <button type="button" className={tipo === 'ingreso' ? 'activa' : ''} onClick={() => { setTipo('ingreso'); setMotivo('Cambio extra en billetes chicos') }}>Pongo plata</button>
        </div>
        <label className="campo">
          Monto
          <input type="number" inputMode="numeric" min={1} required autoFocus value={monto} onChange={(ev) => setMonto(ev.target.value)} />
          <small className={tipo === 'retiro' && Number(monto) > hay ? 'mal' : 'tenue'}>En el cajón hay {pesos(hay)}{tipo === 'retiro' && Number(monto) > hay ? ': no podés sacar más que eso.' : '.'}</small>
        </label>
        <div className="campo">
          Motivo
          <div className="chips-filtro">{motivos.map((m) => <button key={m} type="button" className={motivo === m ? 'activa' : ''} onClick={() => setMotivo(m)}>{m}</button>)}</div>
        </div>
        <label className="campo">
          Quién
          <select value={quien} onChange={(ev) => setQuien(ev.target.value)}>{negocio.cajeros.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario" disabled={!monto || (tipo === 'retiro' && Number(monto) > hay)}>Guardar</button>
        </div>
      </form>
    </Dialogo>
  )
}

const billetes = [20000, 10000, 2000, 1000, 500, 200, 100]

/** Cierre a ciegas: se cuentan los billetes y recién al final se ve si sobra o falta. */
function DialogoCierre({ dia, cerrar }: { dia: string; cerrar: () => void }) {
  const e = useDatos()
  const r = resumenCaja(e, dia)
  const [cant, setCant] = useState<Record<number, number>>({})
  const [monedas, setMonedas] = useState('')
  const [ver, setVer] = useState(false)
  const [cajero, setCajero] = useState(negocio.cajeros[0])
  // Se puede contar billete por billete o poner directamente el total que hay en el cajón
  const [forma, setForma] = useState<'total' | 'billetes'>('total')
  const [total, setTotal] = useState('')
  const contadoBilletes = billetes.reduce((s, b) => s + b * (cant[b] ?? 0), 0) + (Number(monedas) || 0)
  const contado = forma === 'total' ? Number(total.replace(/\D/g, '')) || 0 : contadoBilletes
  const dif = contado - r.esperado
  const efe = r.lineas.filter((l) => l.metodo === 'efectivo')
  const set = (b: number, n: number) => setCant({ ...cant, [b]: Math.max(0, n) })
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Cerrar caja" ancho={560}>
      {!ver ? (
        <>
          <p className="ayuda">Contá el efectivo del cajón. El sistema no te dice cuánto tendría que haber hasta que termines, así el conteo es honesto.</p>
          <div className="segmentos segmentos-ancho" role="radiogroup" aria-label="Cómo contás">
            <button type="button" role="radio" aria-checked={forma === 'total'} className={forma === 'total' ? 'activa' : ''} onClick={() => setForma('total')}>Pongo el total</button>
            <button type="button" role="radio" aria-checked={forma === 'billetes'} className={forma === 'billetes' ? 'activa' : ''} onClick={() => setForma('billetes')}>Cuento billete por billete</button>
          </div>
          {forma === 'total' ? (
            <label className="campo campo-total">
              Cuánto efectivo hay en el cajón
              <span className="con-signo con-signo-claro">
                $<input type="text" inputMode="numeric" autoFocus value={total ? (Number(total.replace(/\D/g, '')) || 0).toLocaleString('es-AR') : ''} onChange={(ev) => setTotal(ev.target.value.replace(/\D/g, ''))} placeholder="0" aria-label="Total contado" />
              </span>
            </label>
          ) : (
            <ul className="billetes">
              {billetes.map((b) => (
                <li key={b}>
                  <span className={`billete billete-${b}`}><Banknote size={16} aria-hidden="true" /> {pesos(b)}</span>
                  <span className="paso-a-paso">
                    <button type="button" aria-label={`Un billete menos de ${b}`} onClick={() => set(b, (cant[b] ?? 0) - 1)}><Minus size={15} /></button>
                    <input type="number" inputMode="numeric" min={0} value={cant[b] ?? 0} onChange={(ev) => set(b, Number(ev.target.value))} aria-label={`Billetes de ${b}`} />
                    <button type="button" aria-label={`Un billete más de ${b}`} onClick={() => set(b, (cant[b] ?? 0) + 1)}><Plus size={15} /></button>
                  </span>
                  <strong>{pesos(b * (cant[b] ?? 0))}</strong>
                </li>
              ))}
              <li>
                <span className="billete">Monedas y sueltos</span>
                <input className="input-monedas" type="number" inputMode="numeric" min={0} value={monedas} onChange={(ev) => setMonedas(ev.target.value)} aria-label="Monedas" placeholder="0" />
                <strong>{pesos(Number(monedas) || 0)}</strong>
              </li>
            </ul>
          )}
          {forma === 'billetes' && <div className="contado-total"><span>Contaste</span><strong>{pesos(contado)}</strong></div>}
          <div className="acciones-fila">
            <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
            <button className="boton boton-primario" disabled={forma === 'total' && total === ''} onClick={() => setVer(true)}>Listo, ver el resultado</button>
          </div>
        </>
      ) : (
        <>
          <div className={`arqueo-grande ${dif === 0 ? 'arqueo-justo' : dif > 0 ? 'arqueo-sobra' : 'arqueo-falta'}`}>
            <span>{dif === 0 ? 'La caja cierra justa' : dif > 0 ? 'Sobran' : 'Faltan'}</span>
            {dif !== 0 && <strong>{pesos(Math.abs(dif))}</strong>}
          </div>
          <dl className="ficha ficha-compacta">
            <div><dt>Cambio al abrir</dt><dd>{pesos(aperturaDe(e, dia)?.monto ?? negocio.cajaInicial)}</dd></div>
            <div><dt>Entró en efectivo</dt><dd className="bien">+{pesos(efe.filter((l) => l.monto > 0).reduce((s, l) => s + l.monto, 0))}</dd></div>
            <div><dt>Salió en efectivo (gastos y retiros)</dt><dd className="mal"><Menos n={-efe.filter((l) => l.monto < 0).reduce((s, l) => s + l.monto, 0)} /></dd></div>
            <div><dt>Tendría que haber</dt><dd>{pesos(r.esperado)}</dd></div>
            <div className="ficha-total"><dt>Contaste</dt><dd>{pesos(contado)}</dd></div>
          </dl>
          <div className="digitales">
            {(['transferencia'] as Metodo[]).map((m) => (
              <p key={m}><span>{metodos[m]} según el sistema</span><strong>{pesos(r.ventas.filter((l) => l.metodo === m).reduce((s, l) => s + l.monto, 0))}</strong></p>
            ))}
            <small>Controlalo con el home banking: las transferencias no pasan por el cajón.</small>
          </div>
          <label className="campo">
            Cierra
            <select value={cajero} onChange={(ev) => setCajero(ev.target.value)}>{negocio.cajeros.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <div className="acciones-fila">
            <button type="button" className="boton" onClick={() => setVer(false)}>Volver a contar</button>
            <button className="boton boton-wsp" onClick={() => abrirWhatsApp(textoCierre(r, contado, cajero, dia))}>Mandar al dueño</button>
            <button className="boton boton-primario" onClick={() => { cerrarCaja(dia, contado, cajero); cerrar() }}>Cerrar la caja</button>
          </div>
        </>
      )}
    </Dialogo>
  )
}

/** Abrir la caja: quién la abre y con cuánto cambio arranca (contado). */
function DialogoAbrir({ cerrar }: { cerrar: () => void }) {
  const [monto, setMonto] = useState(String(negocio.cajaInicial))
  const [cajero, setCajero] = useState(negocio.cajeros[0])
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Abrir caja">
      <form className="formulario" onSubmit={(ev) => { ev.preventDefault(); abrirCaja(Number(monto) || 0, cajero); cerrar() }}>
        <div className="campo">
          Quién abre
          <div className="chips-filtro">{negocio.cajeros.map((c) => <button key={c} type="button" className={cajero === c ? 'activa' : ''} onClick={() => setCajero(c)}>{c}</button>)}</div>
        </div>
        <label className="campo">
          Cambio con el que arrancás
          <input type="number" inputMode="numeric" min={0} autoFocus value={monto} onChange={(ev) => setMonto(ev.target.value)} />
        </label>
        <p className="ayuda">Queda registrado quién abrió y con cuánto. Al cerrar, se compara contra este monto.</p>
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario">Abrir caja</button>
        </div>
      </form>
    </Dialogo>
  )
}

/** Anular una venta del mostrador: con motivo, devuelve el stock y deja la línea tachada. */
function DialogoAnular({ l, cerrar }: { l: LineaCaja; cerrar: () => void }) {
  const [motivo, setMotivo] = useState('Se cobró mal')
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Anular venta">
      <p className="anular-que"><strong>{l.concepto}</strong> · {pesos(l.monto)} en {metodos[l.metodo].toLowerCase()} a las {hora(l.hora)}</p>
      <div className="campo">
        Por qué
        <div className="chips-filtro">{['Se cobró mal', 'Lo devolvieron', 'Se cargó dos veces', 'Otro'].map((m) => <button key={m} type="button" className={motivo === m ? 'activa' : ''} onClick={() => setMotivo(m)}>{m}</button>)}</div>
      </div>
      <p className="ayuda">La venta queda tachada en la caja (no se borra) y lo que llevaba vuelve al stock.</p>
      <div className="acciones-fila">
        <button className="boton" onClick={cerrar}>Cancelar</button>
        <button className="boton boton-peligro-lleno" onClick={() => { anularVenta(l.venta!, motivo); cerrar() }}>Anular venta</button>
      </div>
    </Dialogo>
  )
}

/** El cierre en un mensaje, para mandárselo al dueño por WhatsApp. */
export function textoCierre(r: ReturnType<typeof resumenCaja>, contado: number, cajero: string, dia: string) {
  const dif = contado - r.esperado
  const transf = r.ventas.filter((l) => l.metodo === 'transferencia').reduce((s, l) => s + l.monto, 0)
  return [
    `Cierre de caja · ${negocio.nombre}`,
    `${capital(fechaLarga(dia))} · cerró ${cajero}`,
    `Entró ${pesos(r.entro)} (canchas ${pesos(r.canchas)} · cantina ${pesos(r.cantina)})`,
    `Salió ${pesos(r.salio)} en gastos y compras`,
    `Transferencias ${pesos(transf)}`,
    `Efectivo: tendría que haber ${pesos(r.esperado)}, se contó ${pesos(contado)}`,
    dif === 0 ? 'Cerró justa ✅' : `${dif > 0 ? 'Sobraron' : 'Faltaron'} ${pesos(Math.abs(dif))}`,
  ].join('\n')
}
