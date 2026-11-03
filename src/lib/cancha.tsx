import type { ReactNode } from 'react'

/**
 * Una cancha de pádel vista desde arriba, de costado: 20 x 10 metros, red al medio,
 * líneas de saque a 6,95 m de la red y vidrio en los fondos.
 */
export function CanchaDibujo({ className = '', children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`cancha-dibujo ${className}`}>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
        <rect className="cancha-piso" x="0" y="0" width="200" height="100" rx="3" />
        <rect className="cancha-linea" x="4" y="4" width="192" height="92" />
        <line className="cancha-linea" x1="34.5" y1="4" x2="34.5" y2="96" />
        <line className="cancha-linea" x1="165.5" y1="4" x2="165.5" y2="96" />
        <line className="cancha-linea" x1="34.5" y1="50" x2="165.5" y2="50" />
        <line className="cancha-red" x1="100" y1="1" x2="100" y2="99" />
        <line className="cancha-vidrio" x1="1.5" y1="2" x2="1.5" y2="98" />
        <line className="cancha-vidrio" x1="198.5" y1="2" x2="198.5" y2="98" />
      </svg>
      {children && <div className="cancha-contenido">{children}</div>}
    </div>
  )
}
