// Caja: todo lo que entra (canchas, cantina) y sale (compras, sueldos, servicios), con apertura, cierre y arqueo.
import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Lock, Receipt, ShoppingBag } from 'lucide-react'
import { negocio } from '../config/negocio'
import { cerrarCaja, efectivoEsperado, metodos, movimientosCaja, registrarGasto, useDatos, vender, type Metodo } from '../lib/datos'
import { ahoraMin, capital, fechaCorta, fechaLarga, hora, hoyClave, pesos, sumarDias } from '../lib/formato'
import { Dialogo } from '../lib/ui'
import { usePanel } from './Panel'

type Filtro = 'todo' | 'ingresos' | 'gastos'

export function Caja() {
  const e = useDatos()
  const { verReserva } = usePanel()
  const hoy = hoyClave()
  const [dia, setDia] = useState(hoy)
  const [filtro, setFiltro] = useState<Filtro>('todo')
  const [dialogo, setDialogo] = useState<'gasto' | 'venta' | 'cierre' | null>(null)

  const lineas = useMemo(() => movimientosCaja(e, dia), [e, dia])
  const ingresos = lineas.filter((l) => l.monto > 0)
  const gastos = lineas.filter((l) => l.monto < 0)
  const totalIn = ingresos.reduce((s, l) => s + l.monto, 0)
  const totalOut = -gastos.reduce((s, l) => s + l.monto, 0) || 0
  const canchas = ingresos.filter((l) => l.tipo === 'cancha').reduce((s, l) => s + l.monto, 0)
  const esperado = efectivoEsperado(e, dia)
  const cierre = e.cierres.find((c) => c.dia === dia)
  const visibles = filtro === 'ingresos' ? ingresos : filtro === 'gastos' ? gastos : lineas

  const mesDesde = sumarDias(hoy, -29)
  const porCategoria = negocio.categoriasGasto
    .map((c) => ({ c, total: e.gastos.filter((g) => g.dia >= mesDesde && g.categoria === c).reduce((s, g) => s + g.monto, 0) }))
    .sort((a, b) => b.total - a.total)
  const maxCat = Math.max(...porCategoria.map((x) => x.total), 1)
  const cierres = [...e.cierres].sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 7)

  return (
    <div className="pantalla">
      <div className="titulo-fila">
        <div>
          <h1>Caja</h1>
          <p>{capital(fechaLarga(dia))}</p>
        </div>
        <div className="segmentos">
          <button onClick={() => setDia(sumarDias(dia, -1))} aria-label="Día anterior">←</button>
          <button className={dia === hoy ? 'activa' : ''} onClick={() => setDia(hoy)}>Hoy</button>
          <button onClick={() => setDia(sumarDias(dia, 1))} disabled={dia >= hoy} aria-label="Día siguiente">→</button>
        </div>
      </div>

      <div className={`estado-caja ${cierre ? 'estado-caja-cerrada' : ''}`}>
        <Lock size={18} aria-hidden="true" />
        {cierre ? (
          <p>
            <strong>Caja cerrada</strong> a las {hora(cierre.hora)}. Se contaron {pesos(cierre.contado)} en efectivo
            {cierre.contado - esperado === 0 ? ', justo lo esperado.' : `: ${cierre.contado > esperado ? 'sobran' : 'faltan'} ${pesos(Math.abs(cierre.contado - esperado))}.`}
          </p>
        ) : (
          <p>
            <strong>Caja abierta</strong> desde las 08:00 con {pesos(negocio.cajaInicial)} de cambio. En efectivo tendría que haber {pesos(esperado)}.
          </p>
        )}
        {!cierre && <button className="boton boton-chico boton-primario" onClick={() => setDialogo('cierre')}>Cerrar caja</button>}
      </div>

      <div className="kpis">
        <div className="kpi kpi-principal"><span>Entró</span><strong className="bien">{pesos(totalIn)}</strong><small>{pesos(canchas)} canchas · {pesos(totalIn - canchas)} cantina</small></div>
        <div className="kpi"><span>Salió</span><strong className={totalOut ? 'mal' : ''}>{pesos(totalOut)}</strong><small>{gastos.length} gastos y compras</small></div>
        <div className="kpi"><span>Resultado del día</span><strong>{pesos(totalIn - totalOut)}</strong><small>lo que entró menos lo que salió</small></div>
        <div className="kpi"><span>Efectivo en caja</span><strong>{pesos(cierre ? cierre.contado : esperado)}</strong><small>{cierre ? 'contado al cerrar' : 'esperado ahora'}</small></div>
      </div>

      <div className="grilla-rail">
        <div className="columna">
          <div className="caja-acciones">
            <button className="boton" disabled={dia !== hoy} onClick={() => setDialogo('venta')}><ShoppingBag size={16} aria-hidden="true" /> Vender en el mostrador</button>
            <button className="boton" disabled={dia !== hoy} onClick={() => setDialogo('gasto')}><Receipt size={16} aria-hidden="true" /> Registrar gasto</button>
          </div>

          <section className="tarjeta">
            <div className="tarjeta-cabeza">
              <h2>Por medio de pago</h2>
            </div>
            <table className="tabla">
              <thead><tr><th>Medio</th><th className="num">Entró</th><th className="num">Salió</th><th className="num">Neto</th></tr></thead>
              <tbody>
                {(Object.keys(metodos) as Metodo[]).map((m) => {
                  const ent = ingresos.filter((l) => l.metodo === m).reduce((s, l) => s + l.monto, 0)
                  const sal = -gastos.filter((l) => l.metodo === m).reduce((s, l) => s + l.monto, 0)
                  return (
                    <tr key={m}>
                      <td><strong>{metodos[m]}</strong></td>
                      <td className="num bien">{pesos(ent)}</td>
                      <td className="num mal">{sal ? `−${pesos(sal)}` : '—'}</td>
                      <td className="num">{pesos(ent - sal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-cabeza">
              <h2>Movimientos</h2>
              <div className="segmentos">
                {([['todo', 'Todo'], ['ingresos', 'Entradas'], ['gastos', 'Salidas']] as [Filtro, string][]).map(([k, t]) => (
                  <button key={k} className={filtro === k ? 'activa' : ''} onClick={() => setFiltro(k)}>{t}</button>
                ))}
              </div>
            </div>
            {visibles.length === 0 ? (
              <p className="vacio">No hay movimientos.</p>
            ) : (
              <ul className="movs">
                {visibles.map((l) => (
                  <li key={l.id}>
                    <button className={`mov ${l.reserva ? '' : 'mov-fijo'}`} onClick={() => l.reserva && verReserva(l.reserva)} disabled={!l.reserva}>
                      <span className={`mov-icono mov-${l.tipo}`} aria-hidden="true">{l.monto > 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}</span>
                      <span className="mov-texto">
                        <strong>{l.concepto}</strong>
                        <small>{hora(l.hora)} · {l.detalle} · {metodos[l.metodo]}</small>
                      </span>
                      <span className={`mov-monto ${l.monto > 0 ? 'bien' : 'mal'}`}>{l.monto > 0 ? '+' : '−'}{pesos(Math.abs(l.monto))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="rail">
          <h2 className="rail-titulo">Gastos de los últimos 30 días</h2>
          <div className="tarjeta">
            <ul className="barras-h">
              {porCategoria.map(({ c, total }) => (
                <li key={c}>
                  <span>{c}</span>
                  <span className="barras-h-barra barras-h-gasto"><i style={{ width: `${(total / maxCat) * 100}%` }} /></span>
                  <strong>{pesos(total)}</strong>
                </li>
              ))}
            </ul>
            <p className="ayuda">Total: {pesos(porCategoria.reduce((s, x) => s + x.total, 0))}</p>
          </div>
          <h2 className="rail-titulo">Últimos cierres</h2>
          <div className="tarjeta tarjeta-lista">
            <ul className="lista">
              {cierres.map((c) => {
                const dif = c.contado - efectivoEsperado(e, c.dia)
                return (
                  <li key={c.dia}>
                    <button onClick={() => setDia(c.dia)}>
                      <span className="lista-texto">
                        {capital(fechaCorta(c.dia))}
                        <small>Contado {pesos(c.contado)}</small>
                      </span>
                      <span className={`estado ${dif === 0 ? 'estado-pagada' : dif > 0 ? 'estado-señada' : 'estado-pendiente'}`}>
                        {dif === 0 ? 'Justo' : `${dif > 0 ? 'Sobró' : 'Faltó'} ${pesos(Math.abs(dif))}`}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>

      {dialogo === 'gasto' && <DialogoGasto cerrar={() => setDialogo(null)} />}
      {dialogo === 'venta' && <DialogoVenta cerrar={() => setDialogo(null)} />}
      {dialogo === 'cierre' && <DialogoCierre dia={dia} cerrar={() => setDialogo(null)} />}
    </div>
  )
}

function DialogoGasto({ cerrar }: { cerrar: () => void }) {
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
        <label className="campo">
          Categoría
          <select value={categoria} onChange={(ev) => setCategoria(ev.target.value)}>{negocio.categoriasGasto.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
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
        <p className="ayuda">Las compras de mercadería se cargan desde Cantina y stock, así también suben el stock.</p>
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario" disabled={!monto}>Guardar gasto</button>
        </div>
      </form>
    </Dialogo>
  )
}

function DialogoVenta({ cerrar }: { cerrar: () => void }) {
  const [metodo, setMetodo] = useState<Metodo>('efectivo')
  const [hechas, setHechas] = useState<string[]>([])
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Vender en el mostrador" ancho={600}>
      <div className="segmentos segmentos-ancho">
        {(Object.keys(metodos) as Metodo[]).map((m) => <button key={m} className={metodo === m ? 'activa' : ''} onClick={() => setMetodo(m)}>{metodos[m]}</button>)}
      </div>
      <div className="productos-grilla">
        {negocio.cantina.map((it) => (
          <button
            key={it.id}
            className="producto-boton"
            onClick={() => {
              vender({ dia: hoyClave(), hora: ahoraMin(), itemId: it.id, monto: it.precio, metodo, cantidad: 1 })
              setHechas([it.nombre, ...hechas].slice(0, 4))
            }}
          >
            <strong>{it.nombre}</strong>
            <span>{pesos(it.precio)}</span>
          </button>
        ))}
      </div>
      <p className="ayuda">{hechas.length ? `Vendido: ${hechas.join(', ')}. El stock ya se descontó.` : 'Cada toque es una venta cobrada y descuenta los insumos de la receta.'}</p>
      <div className="acciones-fila"><button className="boton boton-primario" onClick={cerrar}>Listo</button></div>
    </Dialogo>
  )
}

function DialogoCierre({ dia, cerrar }: { dia: string; cerrar: () => void }) {
  const e = useDatos()
  const [contado, setContado] = useState('')
  const lineas = movimientosCaja(e, dia).filter((l) => l.metodo === 'efectivo')
  const entro = lineas.filter((l) => l.monto > 0).reduce((s, l) => s + l.monto, 0)
  const salio = -lineas.filter((l) => l.monto < 0).reduce((s, l) => s + l.monto, 0)
  const esperado = efectivoEsperado(e, dia)
  const dif = contado === '' ? null : Number(contado) - esperado
  return (
    <Dialogo abierto cerrar={cerrar} titulo="Cerrar caja">
      <dl className="ficha ficha-compacta">
        <div><dt>Cambio al abrir</dt><dd>{pesos(negocio.cajaInicial)}</dd></div>
        <div><dt>Entró en efectivo</dt><dd className="bien">+{pesos(entro)}</dd></div>
        <div><dt>Salió en efectivo</dt><dd className="mal">−{pesos(salio)}</dd></div>
        <div className="ficha-total"><dt>Tendría que haber</dt><dd>{pesos(esperado)}</dd></div>
      </dl>
      <form
        className="formulario"
        onSubmit={(ev) => {
          ev.preventDefault()
          cerrarCaja(dia, Number(contado))
          cerrar()
        }}
      >
        <label className="campo">
          Efectivo contado
          <input type="number" inputMode="numeric" min={0} required autoFocus value={contado} onChange={(ev) => setContado(ev.target.value)} />
        </label>
        {dif !== null && (
          <p className={`arqueo ${dif === 0 ? 'arqueo-justo' : dif > 0 ? 'arqueo-sobra' : 'arqueo-falta'}`}>
            {dif === 0 ? 'Justo, la caja cierra perfecta.' : dif > 0 ? `Sobran ${pesos(dif)}.` : `Faltan ${pesos(-dif)}.`}
          </p>
        )}
        <div className="acciones-fila">
          <button type="button" className="boton" onClick={cerrar}>Cancelar</button>
          <button className="boton boton-primario" disabled={contado === ''}>Cerrar la caja</button>
        </div>
      </form>
    </Dialogo>
  )
}
