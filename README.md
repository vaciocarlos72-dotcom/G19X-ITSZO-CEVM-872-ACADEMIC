# PluriOne - Plataforma de Reclutamiento Omnicanal 🚀

PluriOne es un sistema integral de reclutamiento que centraliza postulaciones mediante arquitectura omnicanal y utiliza agentes inteligentes para evaluar la compatibilidad de los candidatos.

## 🛠 Tecnologías Utilizadas
* **Backend:** FastAPI (Python), SQLAlchemy, PostgreSQL.
* **Frontend:** React (Vite), Tailwind CSS, Recharts, Lucide-React.
* **Inteligencia Artificial:** LangChain (Módulo preparado para Azure OpenAI / Simulado para desarrollo).
* **Infraestructura:** Docker y Docker Compose.

## ✨ Características Principales
1. **Omnicanalidad (Webhooks):** Recepción automatizada de candidatos desde bolsas de empleo externas a través del endpoint `/api/v1/webhooks/candidatos`.
2. **Agente Inteligente Evaluador:** Análisis de compatibilidad semántica entre los requerimientos de la vacante y las habilidades del candidato.
3. **Dashboard Analítico:** Visualización en tiempo real del origen de los candidatos (OCC, LinkedIn, etc.) y volumen de postulaciones.

## 🚀 Guía de Instalación (Modo Manual)

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

## 🐳 Ejecución con Docker
Para levantar todo el ecosistema (PostgreSQL, Backend y Frontend) con un solo comando:
```bash
docker-compose up --build
```