# Guion de demostración de PluriOne

Esta guía recorre el arranque de la aplicación, la carga de datos, la recepción
omnicanal y la evaluación de un CV. Ejecuta los comandos desde la raíz del
repositorio.

## 1. Configurar y levantar Docker Compose

Configura las variables de entorno siguiendo [README.md](../README.md). En
particular, el archivo `backend/.env` debe tener `WEBHOOK_API_KEY` definido. La
clave del ejemplo es `clave-de-prueba`; reemplaza ese valor en los comandos de
esta guía si configuraste otra clave. Define también `POSTGRES_PASSWORD` en el
`.env` de la raíz.

Inicia los servicios:

```powershell
docker compose up --build -d
```

La interfaz queda en <http://localhost:5173> y la documentación de la API en
<http://localhost:8000/docs>.

## 2. Cargar datos de demostración

Ejecuta el seed dentro del contenedor backend:

```powershell
docker exec plurione_backend python seed.py
```

El script agrega dos vacantes, dos candidatos y sus postulaciones si la base
está vacía. Para probar la carga de CV, abre la vacante **Desarrollador/a
React**: el candidato de demostración ya tiene una postulación asociada.

## 3. Enviar los webhooks de ejemplo

Los JSON de ejemplo están en `docs/ejemplos/whatsapp.json` y
`docs/ejemplos/email.json`. Ambos incluyen el mismo email para demostrar cómo
los dos canales se relacionan con un solo candidato. El servidor requiere el
header `X-API-Key` con el valor configurado en `WEBHOOK_API_KEY`.

### PowerShell

```powershell
$headers = @{ "X-API-Key" = "clave-de-prueba" }
$whatsapp = Get-Content -Raw docs/ejemplos/whatsapp.json
Invoke-RestMethod -Uri http://localhost:8000/api/v1/canales/whatsapp -Method Post -Headers $headers -ContentType "application/json" -Body $whatsapp

$email = Get-Content -Raw docs/ejemplos/email.json
Invoke-RestMethod -Uri http://localhost:8000/api/v1/canales/email -Method Post -Headers $headers -ContentType "application/json" -Body $email
```

La primera solicitud crea el candidato. La siguiente debe responder
`{"existente": true}` con HTTP `200`, pues reutiliza el mismo email y agrega el
contacto Email al candidato existente.

### curl

```bash
curl -X POST http://localhost:8000/api/v1/canales/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: clave-de-prueba" \
  --data-binary "@docs/ejemplos/whatsapp.json"

curl -X POST http://localhost:8000/api/v1/canales/email \
  -H "Content-Type: application/json" \
  -H "X-API-Key: clave-de-prueba" \
  --data-binary "@docs/ejemplos/email.json"
```

En Windows también puedes usar `curl.exe` en lugar de `curl`.

## 4. Subir y evaluar un CV desde la interfaz

1. Abre <http://localhost:5173> y entra a **Vacantes**.
2. Expande **Desarrollador/a React** y localiza la postulación de prueba.
3. En **Evaluar CV con el agente**, selecciona un archivo PDF con texto
   seleccionable y pulsa **Subir y evaluar CV**.
4. Espera el resultado. Si `GEMINI_API_KEY` está configurada y Gemini responde,
   la fuente será Gemini. Si no hay clave o el proveedor falla, se utilizará el
   respaldo simulado.
5. En la tarjeta de la postulación, confirma la etiqueta **Gemini** o
   **Simulado** junto al resultado. En **Dashboard**, el KPI **Gemini vs
   respaldo** muestra el conteo de evaluaciones por fuente.

El PDF debe contener texto extraíble; los CV escaneados como imagen no se
procesan porque el MVP no incluye OCR.

## 5. Detener los servicios

```powershell
docker compose down
```

Los datos de PostgreSQL se conservan en el volumen `postgres_data`. No uses
`docker compose down --volumes` si quieres conservarlos.
