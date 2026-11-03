import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trophy } from 'lucide-react'
import { negocio } from '../config/negocio'
import { borrarCompetencia, cargarResultado, crearCompetencia, useDatos } from '../lib/datos'
import { fixtureLiga, fixtureTorneo, type Competencia } from '../lib/competencias'
import { estadoCompetencia, VistaCompetencia } from '../lib/Competencia'
import { capital, deClave, hora, hoyClave, sumarDias } from '../lib/formato'
import { Dialogo } from '../lib/ui'

export function Competencias() {
  const e = useDatos()
  const [nueva, setNueva] = useState(false)
  return (
    <div className="pantalla">
      <div className="titulo-fila">
        <div>
          <h1>Torneos y ligas</h1>
          <p>Armá el fixture, cargá resultados y compartí la fecha o la tabla con un diseño listo.</p>
        </div>
        <button className="boton boton-primario" onClick={() => setNueva(true)}>
          <Plus size={16} aria-hidden="true" /> Nueva liga o torneo
        </button>
      </div>
      <ul className="competencias">
        {e.competencias.map((c) => {
          const est = estadoCompetencia(c)
          const jugados = c.partidos.filter((p) => p.sets).length
          return (
            <li key={c.id}>
              <Link to={`/admin/torneos/${c.id}`} className="competencia">
                <span className={`competencia-icono ${c.formato}`} aria-hidden="true">
                  <Trophy size={18} />
                </span>
                <span className="competencia-texto">
                  <strong>{c.nombre}</strong>
                  <small>
                    {capital(c.categoria)}, {c.formato === 'liga' ? 'liga' : 'torneo'} de {c.parejas.length} parejas
                  </small>
                </span>
                <span className="competencia-avance">
                  <span className="competencia-barra">
                    <span style={{ width: `${(jugados / c.partidos.length) * 100}%` }} />
                  </span>
                  <small>
                    {jugados} de {c.partidos.length} partidos
                  </small>
                </span>
                <span className={`competencia-estado ${est.terminada ? 'fin' : ''}`}>{est.texto}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <NuevaCompetencia abierto={nueva} cerrar={() => setNueva(false)} />
    </div>
  )
}

export function CompetenciaAdmin() {
  const { id } = useParams()
  const e = useDatos()
  const ir = useNavigate()
  const c = e.competencias.find((x) => x.id === id)
  if (!c)
    return (
      <div className="pantalla">
        <p className="vacio">
          No existe esa competencia. <Link to="/admin/torneos">Volver</Link>
        </p>
      </div>
    )
  return (
    <div className="pantalla">
      <Link to="/admin/torneos" className="volver-chico">
        <ChevronLeft size={16} aria-hidden="true" /> Torneos y ligas
      </Link>
      <div className="titulo-fila">
        <div>
          <h1>{c.nombre}</h1>
          <p>
            {capital(c.categoria)}, {c.parejas.length} parejas. Tocá “Cargar resultado” y escribí los sets, por ejemplo 6-4 3-6 7-5.
          </p>
        </div>
        <div className="controles">
          <Link className="boton" to={`/competencia/${c.id}`}>
            Ver la página pública
          </Link>
          <button
            className="boton boton-peligro"
            onClick={() => {
              if (confirm(`¿Borrar ${c.nombre}? Se pierden el fixture y los resultados.`)) {
                borrarCompetencia(c.id)
                ir('/admin/torneos')
              }
            }}
          >
            Borrar
          </button>
        </div>
      </div>
      <section className="tarjeta">
        <VistaCompetencia key={c.id} c={c} editable guardar={(p, s) => cargarResultado(c.id, p, s)} />
      </section>
    </div>
  )
}

const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function NuevaCompetencia({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const ir = useNavigate()
  const [formato, setFormato] = useState<'liga' | 'torneo'>('liga')
  const [nombre, setNombre] = useState('Liga de Verano')
  const [categoria, setCategoria] = useState('7ma caballeros')
  const [dow, setDow] = useState(6)
  const [inicio, setInicio] = useState(840)
  const [parejas, setParejas] = useState('Ferreyra / Bustos\nLedesma / Vera\nSosa / Romero\nDíaz / Pereyra\nMoyano / Heredia\nLuna / Oviedo')
  const lista = parejas.split('\n').map((x) => x.trim()).filter(Boolean)
  const hoy = hoyClave()
  const primera = sumarDias(hoy, ((dow - deClave(hoy).getDay() + 7) % 7) || 7)
  const necesarias = formato === 'torneo' ? 12 : 4
  const fechas = lista.length % 2 ? lista.length : lista.length - 1

  function crear(ev: FormEvent) {
    ev.preventDefault()
    const ps = lista.map((n, i) => ({ id: `p${Date.now()}${i}`, nombre: n }))
    const c: Competencia = {
      id: `${formato}-${Date.now()}`,
      nombre,
      formato,
      categoria,
      parejas: ps,
      partidos: formato === 'liga' ? fixtureLiga(ps, primera, inicio) : fixtureTorneo(ps.slice(0, 12), sumarDias(hoy, ((6 - deClave(hoy).getDay() + 7) % 7) || 7)),
    }
    crearCompetencia(c)
    cerrar()
    ir(`/admin/torneos/${c.id}`)
  }

  return (
    <Dialogo abierto={abierto} cerrar={cerrar} titulo="Nueva liga o torneo" ancho={560}>
      <form className="formulario" onSubmit={crear}>
        <div className="segmentos">
          <button type="button" className={formato === 'liga' ? 'activa' : ''} onClick={() => { setFormato('liga'); setNombre('Liga de Verano') }}>
            Liga, todos contra todos
          </button>
          <button type="button" className={formato === 'torneo' ? 'activa' : ''} onClick={() => { setFormato('torneo'); setNombre('Torneo del mes') }}>
            Torneo de fin de semana
          </button>
        </div>
        <div className="campos-2">
          <label className="campo">
            Nombre
            <input required value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
          </label>
          <label className="campo">
            Categoría
            <input required value={categoria} onChange={(ev) => setCategoria(ev.target.value)} />
          </label>
        </div>
        {formato === 'liga' && (
          <div className="campos-2">
            <label className="campo">
              Se juega los
              <select value={dow} onChange={(ev) => setDow(Number(ev.target.value))}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>{capital(dias[d])}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              Desde las
              <select value={inicio} onChange={(ev) => setInicio(Number(ev.target.value))}>
                {negocio.turnos.map((t) => (
                  <option key={t} value={t}>{hora(t)}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <label className="campo">
          Parejas, una por línea
          <textarea rows={7} value={parejas} onChange={(ev) => setParejas(ev.target.value)} />
        </label>
        <p className="ayuda">
          {formato === 'liga'
            ? `${lista.length} parejas: ${fechas} fechas, una por semana, desde el ${dias[dow]} ${Number(primera.slice(8))}. Los partidos se reparten en las ${negocio.canchas.length} canchas.`
            : `El torneo usa 12 parejas: 4 zonas de 3 el sábado, y cuartos, semis y final el domingo. Llevás ${lista.length}.`}
        </p>
        <button className="boton boton-primario" disabled={lista.length < necesarias}>
          Armar el fixture
        </button>
      </form>
    </Dialogo>
  )
}
