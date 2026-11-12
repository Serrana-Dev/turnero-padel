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
  vez), señas pendientes, torneos y ligas (armar el fixture, cargar resultados, compartir), turnos fijos y reportes con
  mapa de calor de ocupación.
- **Cuenta de la cancha**: desde cada turno se carga lo que consumen (a nombre de alguien o para todos) y se cobra
  dividido en partes iguales o cada uno lo suyo, con el saldo de la cancha incluido.
- **Cantina y stock** (`#/admin/stock`): cada producto tiene su receta (una hamburguesa simple lleva 1 pan, 1 medallón
  y 1 feta de cheddar) y al venderlo se descuentan solos los insumos. Costo y margen de cada producto, aviso de lo que
  hay que reponer con el pedido armado, compras a proveedores, conteo físico y movimientos de stock.
- **Caja** (`#/admin/caja`): lo que entra (canchas y cantina) y lo que sale (compras, sueldos, servicios,
  mantenimiento), saldo por medio de pago, gastos del mes por categoría y cierre con arqueo del efectivo.

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
tarifas valle y pico, seña, insumos, productos con sus recetas, proveedores, categorías de gastos y actividades. Las fotos van en `public/img/` (hoy son fotos libres de
Wikimedia Commons con sus créditos en el pie, no son de ningún club en particular).
