# Negocio

**Sitio en Vercel:** [https://paginawebmaribel.vercel.app/](https://paginawebmaribel.vercel.app/)

## Para qué sirve

App administrativa para un negocio de ropa que vende por TikTok y WhatsApp. La usa una sola persona a la vez, sobre todo desde el celular y a veces desde la computadora.

Sirve para:

- registrar clientes (código, teléfono, estado activo o inactivo)
- armar la canasta de prendas por precio y cantidad
- anotar abonos (el dinero abonado no se devuelve)
- enviar la canasta (Local, Uber o Servientrega) y dejar el historial de la semana
- compartir el resumen por WhatsApp (texto o imagen)
- editar el mensaje y la plantilla del recibo

Es una PWA: se puede instalar en el teléfono. Necesita internet para guardar. Si no hay conexión, avisa y no escribe nada.

---

## Cómo funciona

React + Vite + TypeScript, Tailwind, React Router y Supabase (base de datos y login). El código de la app está en `negocio-app`.

Las pantallas protegidas son Inicio, Venta, Canasta, Clientes, Catálogo, Abonos, Mensaje y Compartir. Sin sesión se redirige a `/login`.

Las llamadas a Supabase viven en `src/services/`. La interfaz no habla con la base directo. El dinero se calcula en `src/lib/dinero.ts` y `src/lib/reglas.ts` (siempre a 2 decimales, sin montos negativos).

Flujo típico:

1. En **Venta** se elige un cliente activo y se agregan prendas a `canasta_items`.
2. En **Abonos** se suma `saldo_favor` y se guarda cada abono con fecha.
3. Al **enviar**, la canasta se da por pagada. Se actualiza el saldo a favor, se vacían las prendas, se borran los abonos anteriores y, si queda crédito, se deja un abono normal con ese monto y la fecha del envío. Sale un registro en `envios`.
4. El historial de envíos guarda solo los últimos 7 días.

Tablas: `clientes`, `precios`, `canasta_items`, `abonos`, `envios`. Todas tienen RLS: solo entra quien está autenticado.

---

## Animaciones

Al cambiar de sección, un color de acento cubre la pantalla (~280 ms) y luego revela la nueva (~220 ms). Si esa animación no termina, a los 700 ms igual se suelta la vista.

La página nueva entra solo con opacidad (0,16 s). No se mueve en vertical, para no sumar un desliz encima del color.

Si el sistema pide menos movimiento (`prefers-reduced-motion`), esas transiciones se apagan.

Los paneles (estado del cliente, filtros) se abren y cierran con `framer-motion`.

---

## Optimización

Al haber sesión, la app precarga las listas. Clientes, canastas y resumen de abonos salen de **un** viaje a la base (`listarClientesConItems`). Los abonos van en **otro** (`listarTodosLosAbonos`). Precios, envíos de la semana y plantilla van aparte.

Si hay red lenta, esas cinco tareas corren en serie para no pelearse con la pantalla que se está viendo. Si la red va bien, corren en paralelo. La precarga espera un momento ocioso (`requestIdleCallback`, tope 1,2 s).

Las lecturas se guardan en memoria y en `localStorage` (unas 2,5 s de frescura). Si dos pantallas piden lo mismo a la vez, se reutiliza la petición en vuelo.

En Vercel, las rutas internas vuelven a `index.html` para que recargar `/clientes` o `/venta` no dé 404. El service worker y el manifest se generan en el build (`vite-plugin-pwa`).

---

## Seguridad

- Login con Supabase Auth. La sesión se guarda y se renueva sola. No se lee el token desde la URL (`detectSessionInUrl: false`).
- En el cliente solo van `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Nunca la clave `service_role`. `.env` no se sube a Git.
- RLS en todas las tablas: un usuario no autenticado no lee ni escribe.
- Los ids de cliente se validan como UUID antes de consultar. En búsquedas `.or()` se escapan `%`, `_` y se quitan comillas y paréntesis para no romper el filtro.
- Cabeceras en Vercel: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, y `Permissions-Policy` sin cámara, micrófono, ubicación ni pagos. El `sw.js` no se cachea de forma agresiva.
- No hay CSP estricta: el HTML carga fuentes y el registro del service worker en línea; un CSP de “solo scripts del mismo origen” rompería la app.

---

## Desarrollo local

Desde `negocio-app`:

```bash
cp .env.example .env
npm install
npm run dev
```

Completa en `.env`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

La app queda en `http://localhost:5173`.

```bash
npm run test
npm run build
```

En Vercel, cada push a `main` vuelve a desplegar. Las variables `VITE_*` se incrustan en el build: si las cambias, hay que redeploy. En Supabase, **Authentication → URL Configuration**, pon Site URL `https://paginawebmaribel.vercel.app` (sin barra final) y deja redirect a localhost y a `https://*-.vercel.app/**` para las vistas previas.
