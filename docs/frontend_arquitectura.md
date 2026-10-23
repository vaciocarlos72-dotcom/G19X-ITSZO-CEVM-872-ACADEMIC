# Arquitectura del frontend

## Estructura del Proyecto

La aplicación React se encuentra dentro de `frontend` y su código principal está
organizado en `frontend/src`:

```text
frontend/src/
|-- api.js
|-- App.jsx
|-- main.jsx
`-- components/
    `-- VacantesList.jsx
```

- `main.jsx`: punto de entrada de React. Monta el componente `App` en el
  elemento raíz del documento.
- `App.jsx`: componente principal de la aplicación y configuración de las rutas.
- `api.js`: instancia centralizada de Axios para comunicarse con el backend.
- `components/`: contiene componentes reutilizables de la interfaz.
- `components/VacantesList.jsx`: consulta y muestra las vacantes disponibles.
- `components/CrearCandidato.jsx`: formulario para crear candidatos, incluidas
  sus habilidades.

## Capa de Comunicación

El archivo `api.js` crea una instancia de Axios con la URL base del backend
local:

```javascript
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
})
```

Los componentes utilizan esta instancia para realizar peticiones HTTP sin
repetir la dirección del servidor. `VacantesList.jsx` consume el endpoint
`GET /vacantes/`, por lo que la petición completa se dirige a
`http://127.0.0.1:8000/vacantes/`.

## Componentes Actuales

`VacantesList.jsx` usa `useState` para administrar la colección de vacantes, el
indicador de carga, los mensajes de error y la edición inline. Además, la
lógica de negocio de postulaciones utiliza estos estados:

- `candidatosDisponibles`: almacena los candidatos obtenidos de `GET
  /candidatos/` para poblar el selector de asignación.
- `vacanteExpandida`: guarda el ID de la tarjeta cuya sección de postulados
  está abierta; permite alternar entre mostrar y ocultar sus datos.
- `postulacionesActivas`: contiene la lista de postulaciones de la vacante
  expandida, incluyendo el nombre del candidato y su estado.

Al montarse, `useEffect` realiza peticiones asíncronas mediante
`api.get('/vacantes/')` y `api.get('/candidatos/')`.

El formulario `CrearCandidato.jsx` captura nombre, email, teléfono, canal de
origen y el campo opcional `habilidades`. Este último se envía en la petición
`POST /candidatos/` para que el agente pueda compararlo con la descripción de
una vacante. `CandidatosList.jsx` también permite editar y enviar habilidades
mediante `PUT /candidatos/{candidato_id}`.

El componente utiliza renderizado condicional para mostrar:

- Un mensaje de carga mientras la petición está en curso.
- Un mensaje de error si la API no responde correctamente.
- Un mensaje informativo cuando no existen vacantes.
- Tarjetas con título, descripción, estado, edición, eliminación y asignación
  de candidatos cuando hay resultados.

### Flujo de postulaciones

Para asignar un candidato, el usuario lo selecciona en la tarjeta de una
vacante y pulsa **Asignar Candidato**. El componente envía un `POST
/postulaciones/` con `candidato_id` y `vacante_id`; si la operación es exitosa,
muestra una notificación de confirmación.

El botón **Ver Postulados** consulta `GET
/vacantes/{vacante_id}/postulaciones` cuando la tarjeta se expande. La respuesta
se guarda en `postulacionesActivas` y se renderiza debajo de los controles,
mostrando el nombre del candidato y el estado de cada postulación.

Las acciones de la interfaz usan `react-hot-toast` para mostrar notificaciones
de éxito y error sin bloquear la navegación. `App.jsx` registra el componente
`<Toaster />`. Los botones de las tarjetas utilizan iconos de `lucide-react`,
como `Edit`, `Trash2`, `UserPlus`, `CheckCircle` y `Bot`, junto con sus textos
descriptivos.

También evita actualizar el estado si el componente ya fue desmontado, lo que
previene actualizaciones tardías durante cambios de ruta o desmontajes.

## Manejo de Rutas

`App.jsx` utiliza `BrowserRouter` como proveedor de navegación y define sus
rutas mediante `Routes` y `Route`. Actualmente existe una ruta principal:

- `/`: muestra el título `PluriOne - Portal de Reclutamiento` y el componente
  `VacantesList`.

Esta estructura permite agregar nuevas vistas y rutas sin concentrar toda la
lógica de navegación en un solo componente.

Se migró el layout a un diseño SaaS con Sidebar y un Dashboard analítico utilizando recharts.