import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Marca la sección como vista al entrar en pantalla, para la animación de entrada. */
export function useRevelar<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Se mide con el scroll (no con IntersectionObserver) para que funcione también en pestañas en segundo plano
    const mirar = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.classList.add('visto')
        quitar()
      }
    }
    const quitar = () => {
      window.removeEventListener('scroll', mirar)
      window.removeEventListener('resize', mirar)
    }
    window.addEventListener('scroll', mirar, { passive: true })
    window.addEventListener('resize', mirar)
    mirar()
    return quitar
  }, [])
  return ref
}

/** La franja del poste de barbero: rojo, papel y tinta en diagonal. Gira despacio. */
export function Franja({ alto = 56, className = '' }: { alto?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const paso = 18
  return (
    <div className={`franja ${className}`} style={{ height: alto }} aria-hidden="true">
      <svg width="100%" height={alto}>
        <defs>
          <pattern id={id} width={paso * 4} height={alto} patternUnits="userSpaceOnUse" patternTransform="skewX(-40)">
            <rect x={0} width={paso} height={alto} fill="var(--accent)" />
            <rect x={paso} width={paso} height={alto} fill="var(--paper)" />
            <rect x={paso * 2} width={paso} height={alto} fill="var(--ink)" />
            <rect x={paso * 3} width={paso} height={alto} fill="var(--paper)" />
          </pattern>
        </defs>
        <rect className="franja-giro" x={-paso * 4} width="130%" height={alto} fill={`url(#${id})`} />
      </svg>
    </div>
  )
}

export function Dialogo({
  abierto,
  cerrar,
  titulo,
  children,
  ancho = 480,
}: {
  abierto: boolean
  cerrar: () => void
  titulo: string
  children: ReactNode
  ancho?: number
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])
  return (
    <dialog
      ref={ref}
      className="dialogo"
      style={{ width: `min(${ancho}px, calc(100vw - 24px))` }}
      onClose={cerrar}
      onClick={(e) => e.target === ref.current && cerrar()}
    >
      {abierto && (
        <div className="dialogo-cuerpo">
          <header className="dialogo-cabeza">
            <h2>{titulo}</h2>
            <button type="button" className="btn-icono" onClick={cerrar} aria-label="Cerrar">
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
