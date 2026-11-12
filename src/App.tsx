import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Sitio, { CompetenciaPublica } from './sitio/Sitio'
import { Canchas, Layout } from './admin/Panel'
import { Fijos, Reportes } from './admin/Otros'
import { Caja } from './admin/Caja'
import { Productos } from './admin/Productos'
import { Receta } from './admin/Receta'
import { Subproductos } from './admin/Subproductos'
import { Compras } from './admin/Compras'
import { Vender } from './admin/Vender'
import { Gastos, Historial } from './admin/Historial'
import { CompetenciaAdmin, Competencias } from './admin/Competencias'
import './sitio/sitio.css'
import './admin/admin.css'
import './admin/cantina.css'
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
          <Route path="vender" element={<Vender />} />
          <Route path="productos" element={<Productos />} />
          <Route path="productos/:id" element={<Receta />} />
          <Route path="subproductos" element={<Subproductos />} />
          <Route path="compras" element={<Compras />} />
          <Route path="caja" element={<Caja />} />
          <Route path="caja/historial" element={<Historial />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="stock" element={<Navigate to="/admin/subproductos" replace />} />
          <Route path="reportes" element={<Reportes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
