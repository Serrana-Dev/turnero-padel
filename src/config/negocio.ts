// Todos los datos del complejo viven acá. Para la demo de otro club, se cambia este archivo.
// "Tres Muros Pádel" es un nombre inventado para la demo.

export type Cancha = { id: string; nombre: string; detalle: string; techada: boolean }
export type ItemCantina = { id: string; nombre: string; precio: number }

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

  cantina: [
    { id: 'agua', nombre: 'Agua 500 ml', precio: 2000 },
    { id: 'isotonica', nombre: 'Bebida isotónica', precio: 3500 },
    { id: 'cerveza', nombre: 'Cerveza lata', precio: 4500 },
    { id: 'pelotas', nombre: 'Tubo de pelotas', precio: 9000 },
    { id: 'paleta', nombre: 'Alquiler de paleta', precio: 3000 },
  ] as ItemCantina[],

  actividades: [
    { titulo: 'Clases grupales', cuando: 'Martes y jueves, 19:00', texto: 'Cuatro alumnos por cancha con profe. Nivel principiante e intermedio.', precio: 14000, unidad: 'por clase' },
    { titulo: 'Americano del viernes', cuando: 'Viernes, 21:30', texto: 'Ocho parejas, rotación por sorteo, pizza al final.', precio: 18000, unidad: 'por pareja' },
    { titulo: 'Torneo del mes', cuando: 'Último sábado', texto: 'Categorías 6ta, 7ma y 8va. Inscripción por pareja hasta el jueves.', precio: 40000, unidad: 'por pareja' },
    { titulo: 'Escuelita', cuando: 'Sábados, 10:00', texto: 'Para chicos de 8 a 14 años, con paletas prestadas.', precio: 10000, unidad: 'por clase' },
  ],
}

export const precioDe = (inicio: number) => (inicio >= negocio.pico ? negocio.precios.pico : negocio.precios.valle)
