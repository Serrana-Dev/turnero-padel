import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: el mismo build sirve en GitHub Pages bajo /<repo>/ o en cualquier carpeta.
export default defineConfig({
  base: './',
  plugins: [react()],
})
