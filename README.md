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

Para cargar un CV ligado a un candidato y guardar la evaluación en su
postulación, utiliza `POST /api/v1/candidatos/{candidato_id}/cv` con el parámetro
de consulta requerido `vacante_id` y el archivo multipart `archivo`. El
candidato debe tener una postulación asociada a esa vacante. Un archivo
corrupto, vacío o que no sea PDF se rechaza con HTTP 400.

La evaluación del endpoint existente `POST /agente/evaluar/{postulacion_id}`
también utiliza Gemini para una postulación registrada. La variable
`GEMINI_API_KEY` debe estar definida en `backend/.env` para habilitar el servicio
remoto.

## Integraciones omnicanal

Los webhooks de canales requieren el header `X-API-Key` con el valor configurado
en `WEBHOOK_API_KEY`. Ambos endpoints crean un candidato nuevo y normalizan el
canal, teléfono y texto de habilidades al formato de la base de datos. Si se
recibe nuevamente un correo ya registrado, la restricción de unicidad de la base
de datos rechaza el registro.

### WhatsApp Business

`POST /api/v1/canales/whatsapp` acepta un envelope reducido con estructura tipo
Meta. El correo se incluye como `candidate_email` porque la API de WhatsApp no
lo proporciona de forma nativa; debe haber sido recopilado por el flujo
conversacional:

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "candidate_email": "ana@example.com",
        "contacts": [{
          "profile": { "name": "Ana Pérez" },
          "wa_id": "525512345678"
        }],
        "messages": [{
          "from": "525512345678",
          "text": { "body": "Experiencia en React y TypeScript" }
        }]
      }
    }]
  }]
}
```

### Correo electrónico

`POST /api/v1/canales/email` recibe un evento simplificado de proveedor de correo:

```json
{
  "event": "email.received",
  "from": {
    "name": "Luis García",
    "email": "luis@example.com"
  },
  "message": {
    "subject": "Postulación - Ingeniero de Datos",
    "text": "Experiencia en Python, SQL y pipelines de datos"
  }
}
```

Los eventos se validan como JSON y necesitan los campos requeridos por el
registro de candidatos. Para producción, el webhook de Meta también debe validar
su firma de origen y procesar su esquema completo; esta integración académica
simula el formato de entrada y protege el acceso mediante API Key.

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
