"""Pruebas HTTP y unitarias básicas solicitadas para la rúbrica."""

import json

import pytest
from fastapi.testclient import TestClient

import ia_agent
import main


def test_email_channel_without_api_key_returns_401():
    client = TestClient(main.app)

    response = client.post(
        "/api/v1/canales/email",
        json={
            "event": "email.received",
            "from": {
                "name": "Persona de prueba",
                "email": "persona@example.com",
            },
            "message": {
                "subject": "Postulación",
                "text": "Experiencia con Python",
            },
        },
    )

    assert response.status_code == 401


def test_extraer_texto_pdf_invalido_lanza_value_error():
    with pytest.raises(ValueError):
        ia_agent.extraer_texto_pdf(b"esto no es un PDF")


def test_evaluador_simulado_retorna_score_100_y_fuente():
    resultado = ia_agent.evaluar_candidato_simulado(
        "Se requiere Python y FastAPI",
        json.dumps(
            {
                "habilidades": ["Python", "FastAPI"],
                "anios_experiencia": 0,
                "idiomas": [],
                "resumen": "Experiencia en desarrollo.",
            }
        ),
    )

    assert resultado["score"] == 100
    assert resultado["fuente"] == "simulado"
