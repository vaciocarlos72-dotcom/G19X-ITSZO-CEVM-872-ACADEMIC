"""Pruebas HTTP básicas para los endpoints principales de PluriOne."""

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
    monkeypatch.setenv("WEBHOOK_API_KEY", "test-webhook-key")

    with TestClient(main.app) as test_client:
        yield test_client

    main.app.dependency_overrides.clear()
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
            assert "CV completo de prueba" in kwargs["contents"]

            class Response:
                text = (
                    '{"habilidades":["Python"],"años_experiencia":5,'
                    '"idiomas":["español"]}'
                )

            return Response()

    class FakeClient:
        models = FakeModels()

        def __init__(self, api_key):
            assert api_key == "test-gemini-key"

    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-1.5-flash")
    monkeypatch.setattr(ia_agent.genai, "Client", FakeClient)

    perfil = ia_agent.extraer_perfil_candidato("CV completo de prueba")

    assert perfil == {
        "habilidades": ["Python"],
        "años_experiencia": 5,
        "idiomas": ["español"],
    }


def test_evaluacion_encadena_y_persiste_perfil_estructurado(
    client: TestClient, monkeypatch
):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    perfil_esperado = {
        "habilidades": ["Python"],
        "años_experiencia": 5,
        "idiomas": ["inglés"],
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

    monkeypatch.setattr(main, "extraer_perfil_candidato", extraer)
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
    assert texto_recibido == ["CV con experiencia en Python"]
    assert perfil_evaluado == [
        (perfil_esperado, "Experiencia con Python y FastAPI")
    ]
    candidato_actualizado = client.get("/candidatos/").json()[0]
    assert candidato_actualizado["perfil_estructurado"] == perfil_esperado


def test_actualiza_esquema_existente_para_perfil_estructurado(monkeypatch):
    legacy_engine = create_engine("sqlite+pysqlite:///:memory:")
    with legacy_engine.begin() as connection:
        connection.execute(
            text("CREATE TABLE candidatos (id INTEGER PRIMARY KEY)")
        )
    monkeypatch.setattr(database, "engine", legacy_engine)

    database.ensure_candidate_profile_column()

    columnas = {
        column["name"]
        for column in inspect(legacy_engine).get_columns("candidatos")
    }
    assert "perfil_estructurado" in columnas
    legacy_engine.dispose()
