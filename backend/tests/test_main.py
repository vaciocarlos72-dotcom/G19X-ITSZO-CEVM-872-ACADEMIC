"""Pruebas HTTP básicas para los endpoints principales de PluriOne."""

import json
import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
import ia_agent
import models
import database


@pytest.fixture
def client(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = override_get_db
    main.app.state.test_session = test_session
    monkeypatch.setenv("WEBHOOK_API_KEY", "test-webhook-key")

    with TestClient(main.app) as test_client:
        yield test_client

    main.app.dependency_overrides.clear()
    del main.app.state.test_session
    engine.dispose()


def crear_vacante(client: TestClient) -> int:
    response = client.post(
        "/vacantes/",
        json={
            "titulo": "Desarrollador Python",
            "descripcion": "Experiencia con Python y FastAPI",
            "estado": "Abierta",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_evaluar_cv_rechaza_pdf_invalido(client: TestClient):
    vacante_id = crear_vacante(client)

    response = client.post(
        f"/agente/evaluar-cv/{vacante_id}",
        files={"archivo": ("curriculum.pdf", b"no es un PDF", "application/pdf")},
    )

    assert response.status_code == 400
    assert "PDF válido" in response.json()["detail"]


def test_webhook_rechaza_solicitud_sin_api_key(client: TestClient, monkeypatch):
    monkeypatch.setenv("WEBHOOK_API_KEY", "expected-test-key")

    response = client.post(
        "/api/v1/webhooks/candidatos",
        json={
            "nombre": "Persona de prueba",
            "email": "persona@example.com",
            "canal_origen": "Webhook",
        },
    )

    assert response.status_code == 401


def test_webhook_whatsapp_normaliza_y_registra_candidato(client: TestClient):
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "candidate_email": "ana@example.com",
                            "contacts": [
                                {
                                    "profile": {"name": "Ana Pérez"},
                                    "wa_id": "525512345678",
                                }
                            ],
                            "messages": [
                                {
                                    "from": "525512345678",
                                    "text": {
                                        "body": "Experiencia en React y Python"
                                    },
                                }
                            ],
                        }
                    }
                ]
            }
        ],
    }

    response = client.post(
        "/api/v1/canales/whatsapp",
        json=payload,
        headers={"X-API-Key": "test-webhook-key"},
    )

    assert response.status_code == 201
    assert response.json()["nombre"] == "Ana Pérez"
    assert response.json()["canal_origen"] == "WhatsApp"

    candidatos = client.get("/candidatos/").json()
    assert len(candidatos) == 1
    assert candidatos[0]["email"] == "ana@example.com"
    assert candidatos[0]["telefono"] == "525512345678"
    assert candidatos[0]["habilidades"] == "Experiencia en React y Python"


def test_evaluador_devuelve_fuente_simulada(client: TestClient, monkeypatch):
    vacante_id = crear_vacante(client)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(
        main,
        "extraer_texto_pdf",
        lambda contenido: "CV con experiencia en Python y FastAPI",
    )

    response = client.post(
        f"/agente/evaluar-cv/{vacante_id}",
        files={"archivo": ("curriculum.pdf", b"%PDF-1.4 contenido", "application/pdf")},
    )
    assert response.status_code == 200
    resultado = response.json()
    assert resultado["score"] == 100
    assert resultado["fuente"] == "simulado"
    assert "python" in resultado["justificacion"].lower()


def test_extractor_devuelve_perfil_estructurado(monkeypatch):
    class FakeModels:
        def generate_content(self, **kwargs):
            assert kwargs["model"] == "gemini-1.5-flash"
            assert kwargs["config"]["response_mime_type"] == "application/json"
            assert "CV completo de prueba" in kwargs["contents"]

            class Response:
                text = (
                    '{"habilidades":["Python"],"anios_experiencia":5,'
                    '"idiomas":["español"],"resumen":"Experiencia en Python."}'
                )

            return Response()

    class FakeClient:
        models = FakeModels()

        def __init__(self, api_key):
            assert api_key == "test-gemini-key"

    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-1.5-flash")
    monkeypatch.setattr(ia_agent.genai, "Client", FakeClient)

    perfil = ia_agent.extraer_perfil("CV completo de prueba")

    assert perfil == {
        "habilidades": ["Python"],
        "anios_experiencia": 5,
        "idiomas": ["español"],
        "resumen": "Experiencia en Python.",
    }


def test_evaluacion_encadena_perfil_json(
    client: TestClient, monkeypatch
):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    perfil_esperado = {
        "habilidades": ["Python"],
        "anios_experiencia": 5,
        "idiomas": ["inglés"],
        "resumen": "Experiencia profesional en Python.",
    }
    texto_recibido = []
    perfil_evaluado = []

    def extraer(texto_cv):
        texto_recibido.append(texto_cv)
        return perfil_esperado

    def evaluar(perfil, descripcion):
        perfil_evaluado.append((perfil, descripcion))
        return {
            "score": 90,
            "justificacion": "Perfil compatible.",
            "fuente": "simulado",
        }

    monkeypatch.setattr(main, "extraer_perfil", extraer)
    monkeypatch.setattr(main, "evaluar_candidato", evaluar)

    candidato_response = client.post(
        "/candidatos/",
        json={
            "nombre": "Ana Pérez",
            "email": "ana.perfil@example.com",
            "canal_origen": "Webhook",
            "habilidades": "CV con experiencia en Python",
        },
    )
    assert candidato_response.status_code == 201
    candidato_id = candidato_response.json()["id"]
    vacante_id = crear_vacante(client)

    postulacion_response = client.post(
        "/postulaciones/",
        json={"candidato_id": candidato_id, "vacante_id": vacante_id},
    )
    assert postulacion_response.status_code == 201
    postulacion_id = postulacion_response.json()["id"]

    evaluacion = client.post(f"/agente/evaluar/{postulacion_id}")

    assert evaluacion.status_code == 200
    assert evaluacion.json()["fuente_evaluacion"] == "simulado"
    assert texto_recibido == ["CV con experiencia en Python"]
    assert perfil_evaluado == [
        (
            json.dumps(perfil_esperado, ensure_ascii=False),
            "Experiencia con Python y FastAPI",
        )
    ]


def test_carga_cv_persiste_perfil_json(
    client: TestClient, monkeypatch
):
    perfil_esperado = {
        "habilidades": ["Python"],
        "anios_experiencia": 4,
        "idiomas": ["español"],
        "resumen": "Experiencia en desarrollo Python.",
    }
    async def leer_texto_pdf(_archivo):
        return "CV completo para pruebas"

    monkeypatch.setattr(main, "_leer_texto_pdf_validado", leer_texto_pdf)
    monkeypatch.setattr(main, "extraer_perfil", lambda texto: perfil_esperado)
    monkeypatch.setattr(
        main,
        "evaluar_candidato",
        lambda perfil_json, descripcion: {
            "score": 100,
            "justificacion": "Perfil compatible.",
            "fuente": "simulado",
        },
    )

    candidato_response = client.post(
        "/candidatos/",
        json={
            "nombre": "Elena Prueba",
            "email": "elena.cv@example.com",
            "canal_origen": "Webhook",
        },
    )
    assert candidato_response.status_code == 201
    candidato_id = candidato_response.json()["id"]
    vacante_id = crear_vacante(client)
    postulacion_response = client.post(
        "/postulaciones/",
        json={"candidato_id": candidato_id, "vacante_id": vacante_id},
    )
    assert postulacion_response.status_code == 201

    response = client.post(
        f"/api/v1/candidatos/{candidato_id}/cv?vacante_id={vacante_id}",
        files={"archivo": ("curriculum.pdf", b"%PDF-1.4 contenido", "application/pdf")},
    )

    assert response.status_code == 200
    assert response.json()["fuente"] == "simulado"
    with client.app.state.test_session() as db:
        curriculum = db.query(models.CandidatoCV).one()
        assert curriculum.texto_extraido == "CV completo para pruebas"
        assert curriculum.perfil_json == json.dumps(
            perfil_esperado, ensure_ascii=False
        )
        postulacion = db.query(models.Postulacion).one()
        assert postulacion.fuente_evaluacion == "simulado"

    perfil_json_esperado = json.dumps(perfil_esperado, ensure_ascii=False)
    candidatos = client.get("/candidatos/").json()
    assert candidatos[0]["perfil_json"] == perfil_json_esperado

    postulaciones = client.get(
        f"/vacantes/{vacante_id}/postulaciones"
    ).json()
    assert postulaciones[0]["perfil_json"] == perfil_json_esperado
    assert postulaciones[0]["candidato"]["perfil_json"] == perfil_json_esperado


def test_actualiza_esquema_existente_para_perfil_json(monkeypatch):
    legacy_engine = create_engine("sqlite+pysqlite:///:memory:")
    with legacy_engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE candidato_cvs (id INTEGER PRIMARY KEY, "
                "candidato_id INTEGER, nombre_archivo TEXT, "
                "texto_extraido TEXT)"
            )
        )
    monkeypatch.setattr(database, "engine", legacy_engine)

    database.ensure_cv_profile_column()
    columnas_cvs = {
        column["name"]
        for column in inspect(legacy_engine).get_columns("candidato_cvs")
    }
    assert "perfil_json" in columnas_cvs
    legacy_engine.dispose()


def test_actualiza_esquema_existente_para_fuente_evaluacion(monkeypatch):
    legacy_engine = create_engine("sqlite+pysqlite:///:memory:")
    with legacy_engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE postulaciones (id INTEGER PRIMARY KEY, "
                "candidato_id INTEGER, vacante_id INTEGER)"
            )
        )
    monkeypatch.setattr(main, "engine", legacy_engine)

    main.ensure_postulacion_fuente_column()
    main.ensure_postulacion_fuente_column()
    columnas = {
        column["name"]
        for column in inspect(legacy_engine).get_columns("postulaciones")
    }

    assert "fuente_evaluacion" in columnas
    legacy_engine.dispose()
