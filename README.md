# Turnero · demo para complejos de pádel

Demo visual de un sistema de reservas de canchas. **Tres Muros Pádel** es un club inventado para la demo.
Es todo frontend: los datos de prueba se generan solos y se guardan en el navegador.

- **Web pública** (`#/`): reservar mirando las canchas: se elige día y hora, y las cuatro canchas aparecen dibujadas
  desde arriba, libres u ocupadas. Seña simulada de Mercado Pago, torneos y ligas, precios, clases y turno fijo.
- **Torneos y ligas** (`#/competencia/<id>`): fixture por fecha como en el fútbol, tabla de posiciones (3 puntos por
  partido ganado, desempata sets y games), torneos con zonas y cuadro hasta la final. Cada fecha, tabla o cuadro se
  comparte como placa lista para WhatsApp o Instagram: cuatro diseños, formato publicación o historia, se dibuja en el
  navegador y se manda con el menú de compartir del teléfono.
- **Panel del club** (`#/admin`): quién está jugando en cada cancha ahora, grilla del día (en el celular, una cancha por
  vez), señas pendientes, torneos y ligas (armar el fixture, cargar resultados, compartir), turnos fijos, caja y cantina,
  y reportes con mapa de calor de ocupación.

Lo que se reserva en la web aparece en el panel. **Reiniciar demo** vuelve todo a cero.

## Correrlo

```bash
npm install
npm run dev
```

## Publicarlo en GitHub Pages

Subir a la rama `main` de un repo y activar **Settings → Pages → Source: GitHub Actions**.
El workflow `.github/workflows/deploy.yml` publica solo en cada push.

## Adaptarlo a un club real

Todo está en [`src/config/negocio.ts`](src/config/negocio.ts): nombre, dirección, canchas, horarios de turnos,
tarifas valle y pico, seña, cantina y actividades. Las fotos van en `public/img/` (hoy son fotos libres de
Wikimedia Commons con sus créditos en el pie, no son de ningún club en particular).
