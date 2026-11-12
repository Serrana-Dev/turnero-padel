// Todos los datos del complejo viven acá. Para la demo de otro club, se cambia este archivo.
// "Tres Muros Pádel" es un nombre inventado para la demo.

export type Cancha = { id: string; nombre: string; detalle: string; techada: boolean }
/** Lo que se compra y se guarda: pan, medallones, fernet, pelotas. Unidad: u (unidades), g o ml. */
export type Insumo = { id: string; nombre: string; unidad: 'u' | 'g' | 'ml'; costo: number; minimo: number; rubro: 'Bebidas' | 'Cocina' | 'Deportes' }
/** Una línea de receta: cuánto de cada insumo lleva el producto. */
export type LineaReceta = { insumoId: string; cantidad: number }
/** Lo que se vende en la cantina. Al venderlo se descuentan solos los insumos de su receta. */
export type ItemCantina = { id: string; nombre: string; precio: number; categoria: 'Bebidas' | 'Tragos' | 'Cocina' | 'Deportes'; receta: LineaReceta[] }

export const negocio = {
  nombre: 'Tres Muros Pádel',
  corto: 'Tres Muros',
  barrio: 'Barrio Jardín',
  ciudad: 'Córdoba',
  direccion: 'Ricchieri 3240',
  whatsapp: '351 555-0142',
  instagram: 'tresmurospadel',
  mapa: 'https://maps.google.com/?q=Barrio+Jardín,+Córdoba',

  canchas: [
    { id: 'c1', nombre: 'Cancha 1', detalle: 'Blindex, techada', techada: true },
    { id: 'c2', nombre: 'Cancha 2', detalle: 'Blindex, techada', techada: true },
    { id: 'c3', nombre: 'Cancha 3', detalle: 'Blindex, al aire libre', techada: false },
    { id: 'c4', nombre: 'Cancha 4', detalle: 'Muro, al aire libre', techada: false },
  ] as Cancha[],

  /** Turnos de 90 minutos: inicio de cada uno, en minutos desde medianoche. */
  turnos: [480, 570, 660, 750, 840, 930, 1020, 1110, 1200, 1290, 1380],
  duracion: 90,
  /** Desde esta hora rige la tarifa de horario pico. */
  pico: 1020,
  precios: { valle: 28000, pico: 36000 },
  seña: 12000,

  // Insumos de la cantina (costos de noviembre 2026, de muestra)
  insumos: [
    { id: 'pan-hamb', nombre: 'Pan de hamburguesa', unidad: 'u', costo: 350, minimo: 24, rubro: 'Cocina' },
    { id: 'medallon', nombre: 'Medallón de carne', unidad: 'u', costo: 1100, minimo: 20, rubro: 'Cocina' },
    { id: 'cheddar', nombre: 'Cheddar en fetas', unidad: 'u', costo: 180, minimo: 30, rubro: 'Cocina' },
    { id: 'panceta', nombre: 'Panceta', unidad: 'g', costo: 9, minimo: 500, rubro: 'Cocina' },
    { id: 'huevo', nombre: 'Huevos', unidad: 'u', costo: 200, minimo: 24, rubro: 'Cocina' },
    { id: 'pan-lomo', nombre: 'Pan de lomito', unidad: 'u', costo: 450, minimo: 12, rubro: 'Cocina' },
    { id: 'lomo', nombre: 'Lomo', unidad: 'g', costo: 18, minimo: 2000, rubro: 'Cocina' },
    { id: 'jamon', nombre: 'Jamón cocido', unidad: 'g', costo: 10, minimo: 600, rubro: 'Cocina' },
    { id: 'queso', nombre: 'Queso de máquina', unidad: 'g', costo: 9, minimo: 600, rubro: 'Cocina' },
    { id: 'verdura', nombre: 'Lechuga y tomate', unidad: 'g', costo: 3, minimo: 800, rubro: 'Cocina' },
    { id: 'papas', nombre: 'Papas congeladas', unidad: 'g', costo: 4, minimo: 5000, rubro: 'Cocina' },
    { id: 'pan-miga', nombre: 'Pan de miga (plancha)', unidad: 'u', costo: 120, minimo: 24, rubro: 'Cocina' },
    { id: 'agua', nombre: 'Agua 500 ml', unidad: 'u', costo: 700, minimo: 48, rubro: 'Bebidas' },
    { id: 'isotonica', nombre: 'Bebida isotónica', unidad: 'u', costo: 1400, minimo: 24, rubro: 'Bebidas' },
    { id: 'cerveza', nombre: 'Cerveza lata 473', unidad: 'u', costo: 1800, minimo: 48, rubro: 'Bebidas' },
    { id: 'gaseosa', nombre: 'Gaseosa lata', unidad: 'u', costo: 1000, minimo: 24, rubro: 'Bebidas' },
    { id: 'fernet', nombre: 'Fernet', unidad: 'ml', costo: 14, minimo: 1500, rubro: 'Bebidas' },
    { id: 'coca', nombre: 'Coca 2,25 L', unidad: 'ml', costo: 1.4, minimo: 4500, rubro: 'Bebidas' },
    { id: 'hielo', nombre: 'Hielo', unidad: 'g', costo: 1, minimo: 5000, rubro: 'Bebidas' },
    { id: 'tubo', nombre: 'Tubo de pelotas', unidad: 'u', costo: 5200, minimo: 10, rubro: 'Deportes' },
    { id: 'grip', nombre: 'Grip / overgrip', unidad: 'u', costo: 1500, minimo: 6, rubro: 'Deportes' },
  ] as Insumo[],

  // Lo que se vende, con su receta: al venderlo se descuenta solo cada insumo
  cantina: [
    { id: 'agua', nombre: 'Agua 500 ml', precio: 2000, categoria: 'Bebidas', receta: [{ insumoId: 'agua', cantidad: 1 }] },
    { id: 'isotonica', nombre: 'Bebida isotónica', precio: 3500, categoria: 'Bebidas', receta: [{ insumoId: 'isotonica', cantidad: 1 }] },
    { id: 'cerveza', nombre: 'Cerveza lata', precio: 4500, categoria: 'Bebidas', receta: [{ insumoId: 'cerveza', cantidad: 1 }] },
    { id: 'gaseosa', nombre: 'Gaseosa lata', precio: 3000, categoria: 'Bebidas', receta: [{ insumoId: 'gaseosa', cantidad: 1 }] },
    {
      id: 'fernet', nombre: 'Fernet con coca', precio: 7000, categoria: 'Tragos',
      receta: [{ insumoId: 'fernet', cantidad: 70 }, { insumoId: 'coca', cantidad: 250 }, { insumoId: 'hielo', cantidad: 150 }],
    },
    {
      id: 'hamb-simple', nombre: 'Hamburguesa simple', precio: 9500, categoria: 'Cocina',
      receta: [{ insumoId: 'pan-hamb', cantidad: 1 }, { insumoId: 'medallon', cantidad: 1 }, { insumoId: 'cheddar', cantidad: 1 }],
    },
    {
      id: 'hamb-completa', nombre: 'Hamburguesa completa', precio: 12500, categoria: 'Cocina',
      receta: [
        { insumoId: 'pan-hamb', cantidad: 1 }, { insumoId: 'medallon', cantidad: 2 }, { insumoId: 'cheddar', cantidad: 2 },
        { insumoId: 'panceta', cantidad: 40 }, { insumoId: 'huevo', cantidad: 1 },
      ],
    },
    {
      id: 'lomito', nombre: 'Lomito completo', precio: 15000, categoria: 'Cocina',
      receta: [
        { insumoId: 'pan-lomo', cantidad: 1 }, { insumoId: 'lomo', cantidad: 150 }, { insumoId: 'jamon', cantidad: 40 },
        { insumoId: 'queso', cantidad: 40 }, { insumoId: 'huevo', cantidad: 1 }, { insumoId: 'verdura', cantidad: 60 },
      ],
    },
    { id: 'papas', nombre: 'Papas fritas', precio: 6000, categoria: 'Cocina', receta: [{ insumoId: 'papas', cantidad: 250 }] },
    {
      id: 'tostado', nombre: 'Tostado de jamón y queso', precio: 6500, categoria: 'Cocina',
      receta: [{ insumoId: 'pan-miga', cantidad: 2 }, { insumoId: 'jamon', cantidad: 40 }, { insumoId: 'queso', cantidad: 40 }],
    },
    { id: 'pelotas', nombre: 'Tubo de pelotas', precio: 9000, categoria: 'Deportes', receta: [{ insumoId: 'tubo', cantidad: 1 }] },
    { id: 'grip', nombre: 'Overgrip', precio: 4000, categoria: 'Deportes', receta: [{ insumoId: 'grip', cantidad: 1 }] },
    { id: 'paleta', nombre: 'Alquiler de paleta', precio: 3000, categoria: 'Deportes', receta: [] },
  ] as ItemCantina[],

  proveedores: ['Distribuidora Cuyo Bebidas', 'Frigorífico Don Pepe', 'Panadería La Espiga', 'Mayorista Diarco', 'Padel Shop Córdoba'],
  categoriasGasto: ['Mercadería', 'Sueldos', 'Servicios', 'Mantenimiento de canchas', 'Limpieza', 'Otros'] as const,
  /** Con cuánto efectivo arranca la caja cada día (cambio). */
  cajaInicial: 20000,

  actividades: [
    { titulo: 'Clases grupales', cuando: 'Martes y jueves, 19:00', texto: 'Cuatro alumnos por cancha con profe. Nivel principiante e intermedio.', precio: 14000, unidad: 'por clase' },
    { titulo: 'Americano del viernes', cuando: 'Viernes, 21:30', texto: 'Ocho parejas, rotación por sorteo, pizza al final.', precio: 18000, unidad: 'por pareja' },
    { titulo: 'Torneo del mes', cuando: 'Último sábado', texto: 'Categorías 6ta, 7ma y 8va. Inscripción por pareja hasta el jueves.', precio: 40000, unidad: 'por pareja' },
    { titulo: 'Escuelita', cuando: 'Sábados, 10:00', texto: 'Para chicos de 8 a 14 años, con paletas prestadas.', precio: 10000, unidad: 'por clase' },
  ],
}

export const precioDe = (inicio: number) => (inicio >= negocio.pico ? negocio.precios.pico : negocio.precios.valle)
