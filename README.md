# PluriOne

PluriOne es un MVP académico para apoyar procesos de reclutamiento. Permite
administrar vacantes, registrar candidatos desde distintos canales, evaluar CV
en PDF con IA y consultar indicadores en un Dashboard analítico.

El análisis semántico de los CV utiliza **Google Gemini 1.5 Flash**
(`gemini-1.5-flash`) a través del SDK oficial `google-genai`. Si falta la clave
de Gemini o la API no responde correctamente, el backend usa un evaluador
simulado de respaldo basado en coincidencias de palabras clave. El score es
orientativo; la decisión final corresponde a una persona reclutadora.

## Alcance del MVP

- Crear, consultar, editar y eliminar vacantes.
- Registrar candidatos y postulaciones.
- Ingerir candidatos desde webhooks simulados de WhatsApp Business y correo
  electrónico.
- Recibir CV en PDF, extraer su texto con PyPDF2 y evaluar su afinidad con una
  vacante mediante Gemini.
- Consultar métricas, canales de recepción y scores de afinidad en el Dashboard.

Este MVP **no incluye nómina, administración de empleados, contratación formal,
firma de contratos, ofertas laborales vinculantes ni gestión de pagos**.

## Tecnologías

- **Frontend:** React, Vite, Tailwind CSS, Recharts y Lucide React.
- **Backend:** FastAPI, SQLAlchemy y `google-genai`.
- **Base de datos:** PostgreSQL.
- **PDF:** PyPDF2.
- **Ejecución local:** Docker Compose.

## Requisitos

- Docker Desktop con Docker Compose.
- Una API key de Google Gemini para activar la evaluación real. Si no se
  configura, se utilizará el evaluador simulado.

## Configurar variables de entorno

Desde la raíz del repositorio, crea `.env` para la contraseña de PostgreSQL.
El volumen `postgres_data` de Docker Compose conserva los datos de PostgreSQL
al apagar los contenedores. Para indicar una URL distinta del API al frontend,
añade `VITE_API_URL` al `.env` raíz; por defecto se usa
`http://localhost:8000`.

**PowerShell**

```powershell
'POSTGRES_PASSWORD=elige-una-clave-segura' | Set-Content -Encoding ascii .env
'VITE_API_URL=http://localhost:8000' | Add-Content -Encoding ascii .env
```

**macOS/Linux**

```bash
printf 'POSTGRES_PASSWORD=elige-una-clave-segura\n' > .env
printf 'VITE_API_URL=http://localhost:8000\n' >> .env
```

Crea el archivo de entorno para el backend a partir de la plantilla:

**PowerShell**

```powershell
Copy-Item backend/.env.example backend/.env
```

**macOS/Linux**

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y configura valores propios:

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:tu-clave@localhost:5432/plurione_db
WEBHOOK_API_KEY=define-una-clave-aleatoria-larga
GEMINI_API_KEY=tu-clave-de-google-gemini
```

Compose define la URL interna de PostgreSQL para el backend. No subas los
archivos `.env` ni incluyas claves reales en el repositorio.

## Ejecutar con Docker Compose

Desde la raíz:

```bash
docker compose up --build
```

Detener servicios:

```bash
docker compose down
```

Detenerlos y borrar también el volumen y los datos persistidos de PostgreSQL:

```bash
docker compose down --volumes
```

| Servicio | Dirección local |
| --- | --- |
| Frontend | http://localhost:5173 |
| API FastAPI | http://localhost:8000 |
| Documentación interactiva | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

## Cargar datos iniciales para la evaluación

Después de iniciar los servicios, los evaluadores pueden cargar datos de
demostración en la base de datos con:

```bash
docker exec plurione_backend python seed.py
```

El script utiliza la configuración SQLAlchemy del backend e inserta dos
vacantes, dos candidatos y sus postulaciones iniciales únicamente cuando las
tablas de vacantes y candidatos están vacías. Si ya hay registros, no modifica
la información existente; por eso puede ejecutarse de nuevo sin duplicar los
datos de prueba.

## Integraciones omnicanal

Los dos endpoints de canales requieren el header `X-API-Key` con el valor
configurado en `WEBHOOK_API_KEY`. Si falta o no coincide, la solicitud se
rechaza.

### WhatsApp Business

`POST /api/v1/canales/whatsapp` acepta un envelope JSON reducido inspirado en
Meta WhatsApp Business. El email debe haberse recopilado por el flujo
conversacional y se envía como `candidate_email`, porque WhatsApp no lo entrega
por sí solo.

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

El backend normaliza nombre, email, teléfono, canal (`WhatsApp`) y texto del
mensaje al modelo de candidatos.

### Correo electrónico

`POST /api/v1/canales/email` acepta un evento simplificado de proveedor de
correo:

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

El backend registra nombre, email, canal (`Email`) y el texto del mensaje como
habilidades. Los webhooks son adaptadores académicos y no sustituyen la
validación de firma e idempotencia requerida para una integración real con
proveedores externos.

## Carga y evaluación de CV

El formulario de creación de candidatos envía sus campos y, opcionalmente, el
CV en PDF como `multipart/form-data` a `POST /api/v1/candidatos/con-cv`. El
backend crea el candidato y guarda el nombre de archivo junto con el texto
extraído en una tabla relacionada; el PDF binario original no se conserva. El
formulario limita los PDFs a 10 MB.

El endpoint de evaluación persistente es
`POST /api/v1/candidatos/{candidato_id}/cv`. Requiere el parámetro de consulta
`vacante_id` y un archivo PDF en el campo multipart `archivo`. El candidato debe
tener una postulación para esa vacante.

El flujo técnico es:

1. FastAPI recibe el archivo mediante `UploadFile` y `File`.
2. El backend lee el PDF en memoria (máximo 10 MB), sin guardarlo en disco.
3. `PyPDF2.PdfReader` recibe `io.BytesIO` y extrae el texto de todas las páginas.
4. El texto extraído y la descripción de la vacante se envían a Gemini 1.5 Flash
   (`gemini-1.5-flash`) mediante el SDK oficial `google-genai`, para una
   evaluación semántica del perfil frente a la vacante.
5. El agente valida el JSON con un score entre 0 y 100 y una justificación
   breve. Si Gemini no está configurado o falla, usa el evaluador simulado de
   respaldo, que compara palabras clave.
6. El score y la justificación se guardan en la postulación asociada.

Los PDFs vacíos, corruptos o sin texto extraíble se rechazan. No se incluye OCR
para CV escaneados como imagen.

El endpoint `POST /agente/evaluar-cv/{vacante_id}` ofrece además una evaluación
sin asociar el resultado a una postulación. El endpoint
`POST /agente/evaluar/{postulacion_id}` reevalúa una postulación ya registrada.

## Desarrollo manual

Se requiere PostgreSQL en ejecución y `DATABASE_URL` configurada en
`backend/.env`.

```bash
cd backend
python -m venv .venv
```

Activa el entorno virtual, instala dependencias e inicia la API:

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

## Documentación adicional

- [Arquitectura del backend](docs/backend_arquitectura.md)
- [PRD del MVP](PRD_MVP.md)
- [Guía del frontend](frontend/README.md)
