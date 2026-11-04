"""Pruebas HTTP y unitarias básicas solicitadas para la rúbrica."""

import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

import ia_agent
import main
import models


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


def test_evaluacion_persistida_muestra_fuente_simulada_en_postulaciones(
    monkeypatch,
):
    client = TestClient(main.app)
    identificador = uuid4().hex
    email = f"evaluacion-{identificador}@example.com"
    candidato_id = None
    vacante_id = None

    monkeypatch.setattr(
        main,
        "extraer_perfil",
        lambda texto: {
            "habilidades": ["Python"],
            "anios_experiencia": 2,
            "idiomas": [],
            "resumen": texto,
        },
    )
    monkeypatch.setattr(
        main,
        "evaluar_candidato",
        lambda perfil_json, descripcion: {
            "score": 85,
            "justificacion": "Perfil compatible para la prueba.",
            "fuente": "simulado",
        },
    )

    try:
        candidato_response = client.post(
            "/candidatos/",
            json={
                "nombre": "Candidato de prueba",
                "email": email,
                "canal_origen": "Prueba",
                "habilidades": "Python",
            },
        )
        assert candidato_response.status_code == 201
        candidato_id = candidato_response.json()["id"]

        vacante_response = client.post(
            "/vacantes/",
            json={
                "titulo": f"Vacante de prueba {identificador}",
                "descripcion": "Se requiere Python",
                "estado": "Abierta",
            },
        )
        assert vacante_response.status_code == 201
        vacante_id = vacante_response.json()["id"]

        postulacion_response = client.post(
            "/postulaciones/",
            json={"candidato_id": candidato_id, "vacante_id": vacante_id},
        )
        assert postulacion_response.status_code == 201
        postulacion_id = postulacion_response.json()["id"]

        evaluacion_response = client.post(
            f"/agente/evaluar/{postulacion_id}"
        )
        assert evaluacion_response.status_code == 200
        assert evaluacion_response.json()["fuente_evaluacion"] == "simulado"

        postulaciones_response = client.get(
            f"/vacantes/{vacante_id}/postulaciones"
        )
        assert postulaciones_response.status_code == 200
        postulacion_evaluada = next(
            postulacion
            for postulacion in postulaciones_response.json()
            if postulacion["id"] == postulacion_id
        )
        assert postulacion_evaluada["fuente_evaluacion"] == "simulado"
    finally:
        with main.SessionLocal() as db:
            if candidato_id is not None:
                candidato = db.get(models.Candidato, candidato_id)
                if candidato is not None:
                    db.delete(candidato)
            if vacante_id is not None:
                vacante = db.get(models.Vacante, vacante_id)
                if vacante is not None:
                    db.delete(vacante)
            db.commit()


def test_whatsapp_y_email_unifican_contactos_en_un_candidato():
    email = f"contactos-{uuid4().hex}@example.com"
    client = TestClient(main.app)
    headers = {"X-API-Key": "clave-de-prueba"}
    whatsapp_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "candidate_email": email,
                            "contacts": [
                                {
                                    "wa_id": "525500000001",
                                    "profile": {"name": "Persona Omnicanal"},
                                }
                            ],
                            "messages": [
                                {
                                    "from": "525500000001",
                                    "text": {"body": "Experiencia en Python"},
                                }
                            ],
                        }
                    }
                ]
            }
        ],
    }

    try:
        whatsapp_response = client.post(
            "/api/v1/canales/whatsapp",
            json=whatsapp_payload,
            headers=headers,
        )
        email_response = client.post(
            "/api/v1/canales/email",
            json={
                "event": "email.received",
                "from": {"name": "Persona Omnicanal", "email": email},
                "message": {
                    "subject": "Postulación",
                    "text": "También tengo experiencia en FastAPI",
                },
            },
            headers=headers,
        )

        assert whatsapp_response.status_code == 201
        assert email_response.status_code == 200
        assert email_response.json() == {"existente": True}

        with main.SessionLocal() as db:
            candidatos = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .all()
            )
            assert len(candidatos) == 1
            contactos = (
                db.query(models.ContactoCanal)
                .filter(models.ContactoCanal.candidato_id == candidatos[0].id)
                .all()
            )
            assert {contacto.canal for contacto in contactos} == {
                "WhatsApp",
                "Email",
            }
            assert len(contactos) == 2
        candidato_api = next(
            candidato
            for candidato in client.get("/candidatos/").json()
            if candidato["email"] == email
        )
        assert set(candidato_api["canales_contacto"]) == {"WhatsApp", "Email"}
    finally:
        with main.SessionLocal() as db:
            candidato = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .one_or_none()
            )
            if candidato is not None:
                db.delete(candidato)
                db.commit()
