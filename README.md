# PluriOne - Plataforma de Reclutamiento Omnicanal 

PluriOne es un sistema integral de reclutamiento que centraliza postulaciones mediante arquitectura omnicanal y utiliza agentes inteligentes para evaluar la compatibilidad de los candidatos.

##  Tecnologías Utilizadas
* **Backend:** FastAPI (Python), SQLAlchemy, PostgreSQL.
* **Frontend:** React (Vite), Tailwind CSS, Recharts, Lucide-React.
* **Inteligencia Artificial:** LangChain (Módulo preparado para Azure OpenAI / Simulado para desarrollo).
* **Infraestructura:** Docker y Docker Compose.

##  Características Principales
1. **Omnicanalidad (Webhooks):** Recepción automatizada de candidatos desde bolsas de empleo externas a través del endpoint `/api/v1/webhooks/candidatos`.
2. **Agente Inteligente Evaluador:** Análisis de compatibilidad semántica entre los requerimientos de la vacante y las habilidades del candidato.
3. **Dashboard Analítico:** Visualización en tiempo real del origen de los candidatos (OCC, LinkedIn, etc.) y volumen de postulaciones.

##  Guía de Instalación (Modo Manual)

Antes de iniciar el backend, crea `backend/.env` copiando `backend/.env.example`
y ajusta `DATABASE_URL` y `POSTGRES_PASSWORD` para tu entorno. El frontend lee la
URL de la API desde `VITE_API_URL`; para desarrollo local crea `frontend/.env`
copiando `frontend/.env.example`.

### 1. Base de Datos
Asegúrate de tener PostgreSQL corriendo localmente en el puerto 5432 con una base de datos llamada `plurione_db`.

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Activar entorno (Windows): .\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

##  Ejecución con Docker
Antes de iniciar Compose, copia `.env.example` a `.env` en la raíz y reemplaza
`POSTGRES_PASSWORD` por una contraseña segura. No compartas ni subas el archivo
`.env`. `BACKEND_CORS_ORIGINS` y `VITE_API_URL` también pueden ajustarse allí.

Para levantar todo el ecosistema (PostgreSQL, Backend y Frontend) con un solo comando:
```bash
docker-compose up --build
```
