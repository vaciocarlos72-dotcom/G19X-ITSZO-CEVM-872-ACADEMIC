# PluriOne — Guía del MVP

## Acceso

La plataforma no tiene inicio de sesión; se accede directo a
http://localhost:5173. Los webhooks de canales piden el header `X-API-Key` con
el valor de `WEBHOOK_API_KEY`.

Para iniciar la plataforma, configura las variables indicadas en el
[README principal](../README.md) y ejecuta `docker compose up --build`. La
documentación interactiva de la API está disponible en
<http://localhost:8000/docs>.

## Datos de prueba

Desde la raíz del repositorio, ejecuta:

```bash
docker exec plurione_backend python seed.py
```

Cuando las tablas de vacantes y candidatos están vacías, el script inserta:

- Vacante abierta **Desarrollador/a React**, con enfoque en React, JavaScript,
  interfaces accesibles y consumo de APIs.
- Vacante abierta **Ingeniero/a de Datos**, con enfoque en Python, SQL y
  pipelines de datos.
- Candidato **Valentina Ríos** (`valentina.rios.seed@example.com`), con
  habilidades en React, JavaScript, accesibilidad y APIs; canal **Webhook**.
- Candidato **Andrés Morales** (`andres.morales.seed@example.com`), con
  habilidades en Python, SQL y pipelines de datos; canal **Email**.
- Una postulación **En revisión** para cada candidato, asociada a la vacante
  correspondiente, y un registro inicial en `ContactoCanal` por candidato.

Para probar la recepción omnicanal, el directorio `docs/ejemplos/` contiene
`whatsapp.json` y `email.json`. Ambos ejemplos usan el mismo correo para
demostrar que los contactos recibidos por WhatsApp y Email se asocian a un solo
candidato.

## Flujo de evaluación

Al recibir un CV, PluriOne extrae el texto del PDF y genera un perfil
estructurado. El agente evaluador compara el perfil con la vacante. Cuando un
correo entrante menciona una vacante, el tercer agente analiza el asunto y el
mensaje, sugiere una vacante abierta y el backend crea la postulación si no
existe. Consulta el
[guion de demostración](./DEMO.md) para seguir el flujo completo.

Las respuestas de evaluación identifican si se usó Gemini o el respaldo
simulado. La afinidad es una referencia para el equipo reclutador, no una
decisión automática de selección.
