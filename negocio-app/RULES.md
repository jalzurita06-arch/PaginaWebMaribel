# Proyecto: Negocio (app administrativa)

## Contexto
App web para administrar el negocio de venta de ropa de mujer de mi tía. Vende por TikTok y WhatsApp. La usa una sola persona a la vez, sobre todo desde celular (Xiaomi, Chrome) y a veces desde PC. Debe funcionar como PWA instalable. Requiere internet para guardar datos. Si no hay conexión, la app avisa y no guarda nada.

## Stack
- React + Vite + TypeScript
- Tailwind CSS
- React Router
- Supabase (supabase-js): base de datos y autenticación
- framer-motion: animaciones de transición entre pantallas
- lucide-react: íconos
- zod: validación de formularios
- html-to-image: generar la imagen de resumen
- vite-plugin-pwa: instalación como app
- vitest: pruebas de las reglas de negocio

## Skills
Si hay skills instaladas para este proyecto, léelas antes de escribir código y síguelas. Si una skill contradice este archivo, prevalece este archivo.

## Reglas de código
- La interfaz es en español.
- Usa nombres en español para los conceptos del negocio: cliente, canasta, abono, envio, precio.
- Nunca escribas claves en el código. Usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY desde un archivo .env. Ese archivo debe estar en .gitignore. Crea .env.example sin valores reales.
- Los datos bancarios del negocio van solo en src/config/negocio.ts.
- Toda llamada a Supabase va en src/services/. Los componentes no llaman a Supabase directamente.
- Todos los cálculos de dinero van en src/lib/dinero.ts y src/lib/reglas.ts, como funciones puras, y se prueban con vitest.
- Dinero: redondea siempre a 2 decimales con una función redondear2. Nunca guardes montos negativos.
- Cada acción muestra un mensaje claro si sale bien o mal. Ningún error falla en silencio.
- Comentarios breves en español solo donde la regla de negocio no sea obvia.
- Componentes pequeños. Sin abstracciones innecesarias.

## Reglas de negocio (fuente de verdad)
1. Cliente: código único, nombre opcional, teléfono, estado (activo o inactivo) y saldo_favor (nunca negativo). Un cliente nuevo nace activo.
2. Solo un cliente activo puede recibir ventas nuevas. Si está inactivo, la app lo indica y explica que necesita un abono de $5 o una canasta activa.
3. Venta: agrega prendas a la canasta del cliente (tabla canasta_items). No se guarda historial de ventas hasta que se envía la canasta.
4. Valores de prenda: vienen de la tabla precios. Son solo montos (3.50, 5, 6...), no nombres de producto. Si se cambia un valor en el catálogo, los precios ya guardados en canasta_items no cambian.
5. Abono: suma dinero a saldo_favor y se registra en la tabla abonos con fecha. El dinero abonado NUNCA se devuelve.
6. Total de la canasta = suma de (precio × cantidad) de sus canasta_items.
7. Saldo que se muestra = máximo entre 0 y (total − saldo_favor).
8. Enviar (estado Enviado + tipo Local, Uber o Servientrega):
   - La canasta se da por pagada completa, aunque el abono registrado no alcance.
   - Si saldo_favor >= total: nuevo saldo_favor = saldo_favor − total.
   - Si saldo_favor < total: nuevo saldo_favor = 0.
   - Estado del cliente: activo si el nuevo saldo_favor es mayor que 0; inactivo si es 0.
   - Se borran sus canasta_items.
   - Se crea un registro en envios con: fecha, código del cliente, tipo de envío, total de prendas, total y detalle (lista de precio, cantidad y subtotal).
   - El tipo de envío solo sirve para saber por dónde salió. No cambia ningún cálculo.
   - Enviar una canasta vacía no hace nada y muestra un aviso.
9. Historial de envíos: se conservan solo los últimos 7 días. Al abrir la pantalla Canasta se borran los envíos con más de 7 días. El historial muestra la lista de envíos y, arriba, el total generado y el total de prendas de esa semana.
10. Eliminar cliente: borra el cliente y todo lo ligado a él (canasta, abonos y envíos). Si tiene canasta activa, primero muestra su detalle y pide confirmar.
11. "Bloqueado" del brief no es un estado: significa eliminar. En la app solo existen activo e inactivo.
12. Compartir (imagen o texto): no cambia ningún dato. Siempre muestra la canasta completa del cliente: prendas agrupadas por precio, abono (saldo_favor actual), saldo (regla 7) y total.
13. El estado "Bodega" no se guarda en la base de datos. Significa que la canasta todavía no se ha enviado.

## Modelo de datos (ya creado en Supabase)
Tablas: clientes, precios, canasta_items, abonos, envios. Todas tienen RLS y solo permiten usuarios autenticados. No cambies el esquema sin preguntarme.

## Estilo visual
- Fondo beige claro #F5F0E8, texto negro.
- Botones grandes con forma de pastilla (rounded-full).
- Tarjetas muy redondeadas (rounded-3xl), sin bordes duros, con sombra suave.
- Títulos en Anton, en mayúsculas grandes. Subtítulo pequeño en mayúsculas con letras espaciadas (Inter).
- Cada sección tiene su color de acento dentro de una paleta pastel consistente: Venta, Canasta, Clientes, Catálogo y Abonos.
- Sin logo por ahora. Deja un espacio reservado para agregarlo después.
- Animación suave al entrar y salir de cada pantalla (framer-motion).
- Debe verse bien en 390px de ancho (celular) y en pantalla de PC.

## Forma de trabajo
- Trabajamos por fases. No avances a la siguiente fase hasta que yo confirme.
- Antes de cada fase, dime en 3 líneas qué harás y qué archivos tocarás.
- Al terminar cada fase, indica cómo probarla paso a paso.
- Si una regla de negocio no está clara, pregúntame antes de inventarla.