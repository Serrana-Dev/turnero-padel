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
- **Cuenta de la cancha**: cada turno se abre en tres pestañas (Turno, Consumos, Cobrar). Se ponen los nombres de los
  cuatro que juegan, se carga lo que consumen (a nombre de alguien o para todos) y se cobra en partes iguales o cada uno
  lo suyo, con el saldo de la cancha incluido.
- **Cantina**, en cuatro submódulos:
  - **Vender** (`#/admin/vender`): el mostrador con fichas de colores, ticket con cantidades y cobro, o carga directa a
    la cuenta de una cancha.
  - **Productos y recetas** (`#/admin/productos`): buscador (encuentra también por lo que lleva: "medallón" trae todas
    las hamburguesas), filtros y el mapa de la carta (cuánto se vende contra cuánto deja). Cada producto abre el
    armador de recetas: se suman subproductos o productos (combos), con merma, costo en vivo, medidor de costo,
    precio sugerido según el costo objetivo, simulación de venta y para cuántos alcanza el stock.
  - **Subproductos y stock** (`#/admin/subproductos`): lo que se compra y se descuenta solo con cada venta, con nivel,
    mínimo, merma y qué productos lo usan. Pedido de reposición armado por proveedor para mandar por WhatsApp, conteo
    físico y movimientos.
  - **Compras y proveedores** (`#/admin/compras`): compras de varias líneas (si cambia el precio, se recalculan las
    recetas) y ficha de cada proveedor.
- **Caja**, en cuatro submódulos:
  - **Caja de hoy** (`#/admin/caja`): línea de tiempo con el saldo del cajón, retiros e ingresos de efectivo, gastos y
    cierre contando billetes (a ciegas: el resultado se ve al final).
  - **Historial de cajas** (`#/admin/caja/historial`): calendario de cierres por color, quién cerró y con qué
    diferencia, e informe de cierre de cada día.
  - **Gastos** (`#/admin/gastos`): en qué se va la plata, por categoría y por día, contra el mes anterior.
  - **Reportes**.
- En el celular, el panel tiene una barra abajo (Canchas, Vender, Caja, Stock y Más).

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
