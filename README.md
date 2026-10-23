# PluriOne

PluriOne es un MVP académico para apoyar procesos de reclutamiento. Permite
administrar vacantes, recibir CV en PDF, obtener una evaluación semántica de
afinidad entre CV y vacante mediante **Google Gemini**, y consultar indicadores
de reclutamiento en un Dashboard.

Si Gemini no está configurado o el servicio no está disponible, el backend
mantiene un evaluador simulado como mecanismo de respaldo. Las evaluaciones
simuladas no sustituyen una decisión de selección.

## Alcance del MVP

- Crear, consultar, editar y eliminar vacantes.
- Recibir y procesar un CV PDF para una vacante, extraer su texto y evaluarlo
  semánticamente con Gemini.
- Consultar un Dashboard con métricas y visualizaciones de reclutamiento.
- Registrar candidatos y postulaciones como datos de soporte del flujo.

Este MVP **no incluye nómina, administración de empleados, contratación formal,
firma de contratos, ofertas laborales vinculantes ni gestión de pagos**. La
afinidad calculada por IA es orientativa; la decisión final corresponde a una
persona reclutadora.

## Tecnologías

- **Frontend:** React, Vite, Tailwind CSS, Recharts y Lucide React.
- **Backend:** FastAPI y SQLAlchemy.
- **Base de datos:** PostgreSQL.
- **Evaluación de CV:** Google Gemini (`google-generativeai`) con fallback
  simulado.
- **Ejecución local:** Docker Compose.

## Requisitos previos

- Docker Desktop con Docker Compose.
- Una clave de API de Google Gemini para habilitar la evaluación real. Sin ella,
  se usará el evaluador simulado.

## Configuración de variables de entorno

Desde la raíz del repositorio, crea el archivo `.env` para la contraseña de
PostgreSQL:

**PowerShell**

```powershell
'POSTGRES_PASSWORD=elige-una-clave-segura' | Set-Content -Encoding ascii .env
```

**macOS/Linux**

```bash
printf 'POSTGRES_PASSWORD=elige-una-clave-segura\n' > .env
```

Crea el archivo de configuración local del backend a partir de la plantilla:

**PowerShell**

```powershell
Copy-Item backend/.env.example backend/.env
```

**macOS/Linux**

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y reemplaza los valores de ejemplo:

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:elige-una-clave-segura@localhost:5432/plurione_db
WEBHOOK_API_KEY=define-una-clave-aleatoria-larga
GEMINI_API_KEY=pega-aqui-tu-clave-de-google-gemini
```

Compose configura `DATABASE_URL` para que el backend contacte al servicio de
PostgreSQL dentro de la red de Docker. No publiques los archivos `.env`, ni
incluyas claves reales en el repositorio.

## Ejecutar con Docker Compose

Desde la raíz del proyecto:

```bash
docker compose up --build
```

Para detener los servicios:

```bash
docker compose down
```

Para detenerlos y eliminar también el volumen de datos de PostgreSQL:

```bash
docker compose down --volumes
```

La última opción elimina los datos persistidos de la base de datos.

| Servicio | Dirección local |
| --- | --- |
| Frontend | http://localhost:5173 |
| API FastAPI | http://localhost:8000 |
| Documentación interactiva de la API | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

## Evaluación de CV

El endpoint `POST /agente/evaluar-cv/{vacante_id}` recibe un archivo PDF bajo el
campo multipart `archivo`. El tamaño máximo permitido es 10 MB. La API extrae el
texto del archivo y devuelve un score de 0 a 100 y una justificación breve; el
archivo no se conserva.

La evaluación del endpoint existente `POST /agente/evaluar/{postulacion_id}`
también utiliza Gemini para una postulación registrada. La variable
`GEMINI_API_KEY` debe estar definida en `backend/.env` para habilitar el servicio
remoto.

## Desarrollo manual

Para ejecutar los servicios sin Docker, se necesita PostgreSQL disponible y
configurar `DATABASE_URL` en `backend/.env`. Instala los paquetes e inicia el
backend:

```bash
cd backend
python -m venv .venv
```

Activa el entorno virtual correspondiente a tu sistema y continúa:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

En otra terminal, inicia el frontend:

```bash
cd frontend
npm install
npm run dev
```

## Validaciones

```bash
cd frontend
npm run lint
npm run build
```

El frontend de desarrollo se ejecuta con Vite. Consulta [frontend/README.md](frontend/README.md)
para detalles de su estructura y comandos.
