# PluriOne — Frontend

Interfaz web de PluriOne, una plataforma MVP de apoyo al reclutamiento. Está
construida con React y Vite, y ofrece pantallas para el Dashboard, vacantes y
candidatos.

## Tecnologías

- **React 19** para componentes e interfaz.
- **Vite** para el servidor de desarrollo y la compilación.
- **Tailwind CSS** para estilos utilitarios y diseño adaptable.
- **Recharts** para gráficos del Dashboard.
- **Lucide React** para iconografía.
- **React Router** para navegación entre vistas.
- **Axios** para solicitudes a la API FastAPI.
- **React Hot Toast** para notificaciones.

## Requisitos

- Node.js y npm compatibles con la versión de Vite definida en
  `package.json`.
- API FastAPI disponible en `http://127.0.0.1:8000`, o ajustar `baseURL` en
  `src/api.js` para apuntar a otra dirección.

## Instalación y desarrollo local

Desde esta carpeta:

```bash
npm install
npm run dev
```

Vite muestra en la terminal la dirección local del servidor (por defecto,
`http://localhost:5173`). La aplicación necesita que el backend y la base de
datos estén disponibles para consultar y modificar datos reales.

## Comandos disponibles

```bash
npm run dev      # Servidor de desarrollo con recarga en caliente
npm run lint     # Reglas de calidad con Oxlint
npm run build    # Compilación optimizada para producción
npm run preview  # Vista previa local del build
```

Para comprobar los cambios antes de integrarlos:

```bash
npm run lint
npm run build
```

## Estructura del proyecto

```text
src/
  api.js                 Cliente Axios para la API
  App.jsx                Estructura y rutas principales
  main.jsx               Punto de entrada de React
  index.css              Directivas base de Tailwind
  components/            Dashboard y vistas reutilizables
```

## Integración con la API

Las solicitudes se centralizan en `src/api.js`, que exporta el cliente Axios
utilizado por los componentes. Por defecto, apunta al backend local en
`http://127.0.0.1:8000`. Si el backend se ejecuta en otro host o puerto, actualiza
esta base URL antes de iniciar Vite o generar el build.

La API interactiva de FastAPI suele estar disponible en
`http://localhost:8000/docs`.

## Estilos y componentes

Usa clases de Tailwind CSS para mantener consistencia visual y adaptación a
distintos tamaños de pantalla. Los iconos deben importarse desde `lucide-react`;
los gráficos del Dashboard utilizan Recharts. Mantén la lógica de acceso a datos
en el cliente de API o en las funciones de pantalla correspondientes, y muestra
estados de carga, error y ausencia de datos de forma explícita.

## Build y despliegue

```bash
npm run build
```

Vite escribe los recursos de producción en `dist/`. Para revisar localmente ese
build:

```bash
npm run preview
```

El contenedor definido en `Dockerfile` inicia el servidor Vite en modo
desarrollo y expone el puerto `5173`; para un despliegue productivo, sirve el
contenido generado en `dist/` mediante un servidor estático apropiado.
