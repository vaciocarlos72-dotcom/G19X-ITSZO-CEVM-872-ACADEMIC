# Arquitectura del frontend

## Estructura del proyecto

La aplicación React está organizada en `frontend/src`:

```text
frontend/src/
|-- api.js
|-- App.jsx
|-- main.jsx
`-- components/
    |-- Candidatos.jsx
    |-- CrearCandidato.jsx
    |-- CrearVacante.jsx
    |-- Dashboard.jsx
    |-- Navbar.jsx
    `-- Vacantes.jsx
```

- `main.jsx` monta la aplicación React.
- `App.jsx` configura la navegación y el marco común de las vistas.
- `api.js` centraliza la instancia Axios utilizada para comunicarse con el
  backend.
- `components/` contiene el Dashboard, la navegación y las vistas de candidatos
  y vacantes, incluidos sus formularios.

## Rutas y navegación

`App.jsx` utiliza `BrowserRouter`, `Routes` y `Route`. Las vistas disponibles
son:

| Ruta | Componente | Responsabilidad |
| --- | --- | --- |
| `/` | `Dashboard` | Presenta métricas, gráficos y actividad obtenida de la API. |
| `/vacantes` | `Vacantes` | Administra vacantes, postulaciones y evaluaciones. |
| `/candidatos` | `Candidatos` | Consulta y administra los candidatos registrados. |

`Navbar` ofrece la navegación entre estas vistas. El componente `Toaster` de
`react-hot-toast`, registrado en `App.jsx`, muestra notificaciones de operación.

## Comunicación con el backend

`api.js` crea una instancia Axios cuya URL base se obtiene de la variable de
entorno de Vite `VITE_API_URL`:

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
})
```

La aplicación no fija una dirección del servidor en el código. Configura
`VITE_API_URL` en el entorno de ejecución o de compilación correspondiente. Si
se deja vacía, Axios utiliza las rutas relativas al mismo origen.

Las vistas usan esta instancia compartida para consultar los recursos de
candidatos y vacantes, crear o editar registros, registrar postulaciones y
solicitar evaluaciones. El formulario de candidato envía los campos y el PDF
opcional mediante `multipart/form-data`.

## Vistas principales

### Dashboard

`Dashboard.jsx` solicita candidatos y vacantes al backend al montarse. A partir
de esas respuestas calcula los indicadores y las series que presenta con
Recharts, incluidos los canales de origen y los scores de afinidad disponibles.
La vista también representa los estados de carga y error de las consultas.

### Vacantes

`Vacantes.jsx` consulta vacantes y candidatos para presentar ofertas y permitir
la asignación de candidatos. También permite crear, actualizar y eliminar
vacantes, consultar postulaciones y solicitar la evaluación de una postulación.
Las respuestas de evaluación se utilizan para mostrar el score, la justificación
y la fuente informada por el backend.

### Candidatos

`Candidatos.jsx` presenta los candidatos con sus postulaciones y afinidad
disponible. Permite actualizar los datos soportados por la API y abrir el
formulario de creación. Cuando el candidato no tiene un score, la interfaz lo
indica como no evaluado en lugar de inventar uno.

### Formularios

`CrearCandidato.jsx` envía los datos del candidato y acepta adjuntar un CV PDF.
`CrearVacante.jsx` envía los datos de una vacante. Ambos formularios utilizan la
instancia Axios centralizada y presentan el resultado de la operación mediante
la interfaz.

## Estilos e interfaz

Las vistas utilizan Tailwind CSS para su diseño adaptable, Recharts para las
visualizaciones del Dashboard y Lucide React para los iconos de acciones y
controles.
