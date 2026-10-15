# Negocio

App web para administrar el negocio de ropa. Se despliega en Vercel y usa Supabase para los datos y el acceso.

La app está en la carpeta `negocio-app`. El repositorio de Git incluye también la carpeta padre.

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores del proyecto de Supabase:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env` está en `.gitignore`. Git no lo incluye al subir el repositorio. En el repositorio solo va `.env.example`, sin valores reales.

Vite incorpora esas variables en el momento del build. Si las cambias en Vercel, hay que volver a desplegar para que la app las tome.

## Desarrollo local

Desde `negocio-app`:

```bash
npm install
npm run dev
```

La app queda en `http://localhost:5173`.

## Despliegue en Vercel

### 1. Subir el repositorio a GitHub

El remoto ya apunta a `https://github.com/jalzurita06-arch/PaginaWebMaribel.git` y el repositorio está vacío. Desde la raíz del proyecto (la carpeta que contiene `negocio-app`):

```bash
git add .
git status
git commit -m "Prepara la app para desplegar en Vercel."
git branch -M main
git push -u origin main
```

Antes del commit, revisa `git status`. Debe aparecer `.env.example` y no debe aparecer `.env`. Si `.env` sale en la lista, no lo agregues.

### 2. Importar el repositorio en Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. **Add New… → Project**.
3. Elige el repositorio `PaginaWebMaribel` e impórtalo.
4. En **Root Directory** selecciona `negocio-app`.
5. Vercel detecta Vite. Déjalo así:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 3. Agregar las variables de entorno

En el mismo formulario de importación, o después en **Settings → Environment Variables**, crea estas dos variables para **Production** (y para Preview si vas a probar ramas):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | La URL del proyecto en Supabase (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | La clave anon o publishable del mismo proyecto |

Usa los mismos valores que en tu `.env` local. No uses la clave `service_role`.

### 4. Desplegar

Pulsa **Deploy**. Al terminar, Vercel muestra una dirección como `https://pagina-web-maribel.vercel.app`. Ábrela e inicia sesión.

Si recargas una ruta interna (por ejemplo `/clientes`), la app debe volver a cargar. El archivo `vercel.json` reenvía esas rutas a `index.html`.

Cada push a `main` vuelve a desplegar. Si solo cambias las variables de entorno, entra al proyecto en Vercel y usa **Redeploy**.

## Supabase: URL de autenticación

Haz este paso cuando ya tengas la dirección de Vercel. Sin ella, los correos de confirmación o de recuperación de contraseña seguirían apuntando a localhost.

1. Abre el proyecto en [Supabase](https://supabase.com/dashboard).
2. Ve a **Authentication → URL Configuration**.
3. En **Site URL** pega la dirección de producción, con `https://` y sin barra final. Ejemplo: `https://pagina-web-maribel.vercel.app`.
4. En **Redirect URLs** deja también:
   - `http://localhost:5173/**` para seguir entrando en local
   - `https://*-.vercel.app/**` para los despliegues de vista previa de Vercel
5. Guarda los cambios.

## Comprobar el build

Desde `negocio-app`:

```bash
npm run build
```

El comando debe terminar sin errores. En `dist/` tienen que existir:

- `manifest.webmanifest`
- `sw.js`
- `workbox-*.js`
- `registerSW.js`

`index.html` debe enlazar el manifest y registrar el service worker. Esos archivos no se suben a GitHub: Vercel los genera en cada despliegue.
