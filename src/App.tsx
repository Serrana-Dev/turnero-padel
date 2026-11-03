import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Sitio, { CompetenciaPublica } from './sitio/Sitio'
import { Canchas, Layout } from './admin/Panel'
import { Caja, Fijos, Reportes } from './admin/Otros'
import { CompetenciaAdmin, Competencias } from './admin/Competencias'
import './sitio/sitio.css'
import './admin/admin.css'
import './lib/comun.css'

// HashRouter: así funciona en GitHub Pages sin configurar el servidor.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Sitio />} />
        <Route path="/competencia/:id" element={<CompetenciaPublica />} />
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Canchas />} />
          <Route path="torneos" element={<Competencias />} />
          <Route path="torneos/:id" element={<CompetenciaAdmin />} />
          <Route path="fijos" element={<Fijos />} />
          <Route path="caja" element={<Caja />} />
          <Route path="reportes" element={<Reportes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
