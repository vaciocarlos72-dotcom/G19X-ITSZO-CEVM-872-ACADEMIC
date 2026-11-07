# PluriOne — Guía del MVP

## Acceso

El MVP no tiene inicio de sesión ni cuentas de usuario: la interfaz se abre
directo en `http://localhost:5173`. Los webhooks de canales piden el header
`X-API-Key` con el valor de `WEBHOOK_API_KEY`.

Para iniciar la plataforma, configura las variables indicadas en el
[README principal](../README.md) y ejecuta `docker compose up --build`. La
documentación interactiva de la API está disponible en
<http://localhost:8000/docs>.

## Datos de prueba

Desde la raíz del repositorio, ejecuta:

```bash
docker exec plurione_backend python seed.py
```

El script carga las vacantes **Desarrollador/a React** e **Ingeniero/a de
Datos**, además de dos candidatos y sus postulaciones. Solo inserta estos
registros cuando las tablas de vacantes y candidatos están vacías.

Para probar la recepción omnicanal, el directorio `docs/ejemplos/` contiene
`whatsapp.json` y `email.json`. Ambos ejemplos usan el mismo correo para
demostrar que los contactos recibidos por WhatsApp y Email se asocian a un solo
candidato.

## Flujo de evaluación

Al recibir un CV, PluriOne extrae el texto del PDF y genera un perfil
estructurado. El agente evaluador compara el perfil con la vacante. Cuando un
correo entrante menciona una vacante, el agente de vacantes sugiere una
asociación y el backend crea la postulación si no existe. Consulta el
[guion de demostración](./DEMO.md) para seguir el flujo completo.

Las respuestas de evaluación identifican si se usó Gemini o el respaldo
simulado. La afinidad es una referencia para el equipo reclutador, no una
decisión automática de selección.
