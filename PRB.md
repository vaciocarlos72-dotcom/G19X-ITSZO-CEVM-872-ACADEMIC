# Project Requirements Brief (PRB): Plataforma de Reclutamiento Omnicanal

**Empresa:** PluriOne S.A. de C.V.
**Notas de planeación arquitectónica y desarrollo**

## 1. Arquitectura de Base de Datos y Backend (PostgreSQL + FastAPI)
* Aprovechando la experiencia previa armando modelos relacionales, diagramas en Mermaid y scripts SQL (como en el diseño del POS o el sistema de la biblioteca), el primer paso será estructurar un esquema altamente normalizado en PostgreSQL para centralizar a todos los candidatos que lleguen de diferentes fuentes.
* Como el sistema debe ser omnicanal, FastAPI es ideal para levantar microservicios. Se estructurará la arquitectura cliente-servidor para que los endpoints manejen eficientemente las peticiones y las colas de mensajes con Azure Service Bus.

## 2. Implementación de IA y Agentes (Azure OpenAI + LangChain/LangGraph)
* El núcleo del proyecto son los agentes inteligentes. Se programará un flujo donde el primer agente reciba el CV, parsee el texto y extraiga las competencias clave para cruzarlas con la vacante.
* Se implementará LangGraph para manejar el estado y la memoria de las interacciones. Esto permitirá que los agentes puedan coordinar comunicaciones y dar seguimiento automatizado a los candidatos sin perder el contexto de en qué fase del reclutamiento van.

## 3. Dashboards e Inteligencia de Negocios (Power BI)
* Power BI aportará mucho valor rápido. Se diseñará un panel interactivo conectado directamente a PostgreSQL (similar a las presentaciones interactivas con datos masivos para el Open House).
* KPIs propuestos para el tablero: Tasa de conversión por canal de captación, embudo de reclutamiento (Postulados -> Filtrados por IA -> Entrevistas), y tiempos promedios de contratación.

## 4. Infraestructura, QA y Despliegue (Docker + GitHub Actions)
* Para evitar problemas de compilación local, se contenerizará todo el backend y frontend con Docker desde el sprint cero.
* Configurar un pipeline de CI/CD con GitHub Actions.
* Aplicando experiencia en diagnósticos y troubleshooting de hardware y software a bajo nivel, es vital dejar un sistema de logs muy robusto en la integración con Azure Service Bus. Si un mensaje se pierde en la cola, el log indicará exactamente dónde falló.

## 5. Frontend (React.js)
* Desarrollar un panel de control limpio para que el equipo de RRHH de PluriOne vea a los candidatos clasificados. Se integrará una interfaz sencilla, similar a las vistas de administración de un sistema de boletaje o ventas, pero enfocado en perfiles de usuarios.

## 6. Siguientes pasos (Sprint 1 - Scrum)
* Arrancar la Fase 1: Entrevistar a Edgar Loheffelmman (Líder de Proyecto) para cerrar la detección de necesidades y documentar requerimientos.
* Diseñar la arquitectura inicial (diagrama de componentes).
* Preparar los entornos locales y repositorios.
