# Arquitectura inicial del backend

El servidor inicial de PluriOne está construido con **FastAPI**, un framework
de Python orientado a la creación de APIs HTTP. La instancia `app` definida en
`backend/main.py` registra el endpoint `GET /`, que devuelve un mensaje JSON de
bienvenida y permite comprobar que el servicio está disponible.

La aplicación se ejecuta mediante **Uvicorn**, un servidor ASGI ligero y
adecuado para servir aplicaciones FastAPI. El comando `uvicorn main:app`
indica que debe cargar la instancia `app` del módulo `main`; el servidor queda
disponible localmente en `127.0.0.1:8000`. Las dependencias se instalan dentro
del entorno virtual `backend/.venv` a partir de `backend/requirements.txt`.

## Persistencia de datos

La conexión a PostgreSQL se configura en `backend/.env` mediante la variable
`DATABASE_URL`, con el valor local `postgresql://postgres:RapLife16@localhost:5432/plurione_db`.
`backend/database.py` carga este archivo con `python-dotenv` y utiliza la URL
para crear el motor y las sesiones de SQLAlchemy. La clase declarativa base es
compartida por los modelos de `backend/models.py`.

Al importar `backend/main.py`, se importan los modelos y se ejecuta
`models.Base.metadata.create_all(bind=engine)`. Esto crea las tablas definidas
que aún no existan en la base de datos antes de atender solicitudes de FastAPI.

El esquema contempla candidatos y vacantes como entidades separadas. La tabla
`Postulacion` funciona como tabla intermedia: registra la relación entre un
`Candidato` y una `Vacante` mediante llaves foráneas, además de almacenar la
fecha y el estado de cada postulación.

```mermaid
erDiagram
	CANDIDATO {
		int id PK
		string nombre
		string email UK
		string telefono
		string canal_origen
		string habilidades
		datetime fecha_postulacion
	}

	VACANTE {
		int id PK
		string titulo
		text descripcion
		string estado
	}

	POSTULACION {
		int id PK
		datetime fecha_postulacion
		string estado
		int candidato_id FK
		int vacante_id FK
	}

	CANDIDATO ||--o{ POSTULACION : realiza
	VACANTE ||--o{ POSTULACION : recibe
```

## Endpoints de la API

| Método HTTP | URL | Descripción |
| --- | --- | --- |
| `POST` | `/candidatos/` | Crea un nuevo candidato y devuelve el registro persistido. |
| `GET` | `/candidatos/` | Lista todos los candidatos registrados. |
| `POST` | `/vacantes/` | Crea una nueva vacante y devuelve el registro persistido. |
| `GET` | `/vacantes/` | Lista todas las vacantes registradas. |
| `POST` | `/postulaciones/` | Crea una postulación vinculando un candidato con una vacante. |
| `GET` | `/vacantes/{vacante_id}/postulaciones` | Lista las postulaciones de una vacante e incluye los datos de cada candidato. |
| `POST` | `/agente/evaluar/{postulacion_id}` | Evalúa la compatibilidad de una postulación y guarda su score y justificación. |

## Agente evaluador

El endpoint `POST /agente/evaluar/{postulacion_id}` obtiene la postulación,
la vacante y el candidato relacionado. El agente normaliza a minúsculas la
`vacante.descripcion` y `candidato.habilidades`, separa sus palabras por
espacios y elimina las comas. Después calcula cuántas palabras clave aparecen
en ambos textos y obtiene un `score_compatibilidad` porcentual entre `0` y
`100`.

El resultado se guarda en la postulación junto con
`justificacion_agente`, por ejemplo: `Coincide en 2 palabras clave.`.

Se integró Webhook en /api/v1/webhooks/candidatos para recepción externa y un módulo de Agente Evaluador Simulado en ia_agent.py.