"""Pruebas HTTP y unitarias básicas solicitadas para la rúbrica."""

import json
from uuid import uuid4

import pytest

import ia_agent
import main
import models


def test_email_channel_without_api_key_returns_401(client):
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


def test_webhook_generico_registra_contacto_del_canal(client, monkeypatch):
    identificador = uuid4().hex
    email = f"webhook-{identificador}@example.com"
    monkeypatch.setenv("WEBHOOK_API_KEY", "clave-de-prueba")

    try:
        response = client.post(
            "/api/v1/webhooks/candidatos",
            headers={"X-API-Key": "clave-de-prueba"},
            json={
                "nombre": "Candidato vía webhook",
                "email": email,
                "canal_origen": "Webhook externo",
                "habilidades": "Experiencia en FastAPI",
            },
        )
        assert response.status_code == 201

        with client.app.state.test_session() as db:
            candidato = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .one()
            )
            contactos = (
                db.query(models.ContactoCanal)
                .filter(models.ContactoCanal.candidato_id == candidato.id)
                .all()
            )
            assert len(contactos) == 1
            assert contactos[0].canal == "Webhook externo"
            assert contactos[0].mensaje == "Experiencia en FastAPI"
    finally:
        with client.app.state.test_session() as db:
            candidato = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .one_or_none()
            )
            if candidato is not None:
                db.delete(candidato)
                db.commit()


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
    client, monkeypatch,
):
    identificador = uuid4().hex
    email = f"evaluacion-{identificador}@example.com"
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
        with client.app.state.test_session() as db:
            if candidato_id is not None:
                candidato = db.get(models.Candidato, candidato_id)
                if candidato is not None:
                    db.delete(candidato)
            if vacante_id is not None:
                vacante = db.get(models.Vacante, vacante_id)
                if vacante is not None:
                    db.delete(vacante)
            db.commit()


def test_alta_por_formulario_y_correo_comparten_candidato_y_contactos(
    client, monkeypatch,
):
    identificador = uuid4().hex
    email = f"form-email-{identificador}@example.com"
    candidato_id = None
    mensaje_sugerido = []
    monkeypatch.setenv("WEBHOOK_API_KEY", "clave-de-prueba")

    def sin_sugerencia(mensaje, vacantes):
        mensaje_sugerido.append((mensaje, vacantes))
        return {"vacante_id": None, "confianza": 0}

    monkeypatch.setattr(main, "sugerir_vacante", sin_sugerencia)

    try:
        alta_response = client.post(
            "/candidatos/",
            json={
                "nombre": "Persona Omnicanal",
                "email": email,
                "canal_origen": "Formulario",
                "habilidades": "Experiencia en Python",
            },
        )
        assert alta_response.status_code == 201
        candidato_id = alta_response.json()["id"]

        correo_response = client.post(
            "/api/v1/canales/email",
            headers={"X-API-Key": "clave-de-prueba"},
            json={
                "event": "email.received",
                "from": {"name": "Persona Omnicanal", "email": email},
                "message": {
                    "subject": "Consulta de postulación",
                    "text": "Tengo experiencia adicional en FastAPI.",
                },
            },
        )
        assert correo_response.status_code == 200
        assert correo_response.json() == {"existente": True}
        assert mensaje_sugerido[0][0] == (
            "Asunto: Consulta de postulación\n"
            "Tengo experiencia adicional en FastAPI."
        )

        with client.app.state.test_session() as db:
            candidatos = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .all()
            )
            contactos = (
                db.query(models.ContactoCanal)
                .filter(models.ContactoCanal.candidato_id == candidato_id)
                .all()
            )
            assert len(candidatos) == 1
            assert {contacto.canal for contacto in contactos} == {
                "Formulario",
                "Email",
            }
    finally:
        with client.app.state.test_session() as db:
            candidato = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .one_or_none()
            )
            if candidato is not None:
                db.delete(candidato)
                db.commit()


def test_alta_multipart_guarda_contacto_del_formulario(client):
    identificador = uuid4().hex
    email = f"form-cv-{identificador}@example.com"

    try:
        response = client.post(
            "/api/v1/candidatos/con-cv",
            data={
                "nombre": "Candidata multipart",
                "email": email,
                "canal_origen": "Formulario web",
                "habilidades": "Python y SQL",
            },
        )
        assert response.status_code == 201
        candidato_id = response.json()["id"]

        with client.app.state.test_session() as db:
            contactos = (
                db.query(models.ContactoCanal)
                .filter(models.ContactoCanal.candidato_id == candidato_id)
                .all()
            )
            assert len(contactos) == 1
            assert contactos[0].canal == "Formulario web"
            assert contactos[0].mensaje == "Python y SQL"
    finally:
        with client.app.state.test_session() as db:
            candidato = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .one_or_none()
            )
            if candidato is not None:
                db.delete(candidato)
                db.commit()


def test_correo_con_titulo_de_vacante_crea_postulacion_automatica(
    client, monkeypatch,
):
    identificador = uuid4().hex
    titulo_vacante = f"Ingeniero de Datos {identificador}"
    email = f"vacante-email-{identificador}@example.com"
    candidato_id = None
    vacante_id = None
    monkeypatch.setenv("WEBHOOK_API_KEY", "clave-de-prueba")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    try:
        vacante_response = client.post(
            "/vacantes/",
            json={
                "titulo": titulo_vacante,
                "descripcion": "Experiencia en Python y SQL.",
                "estado": "Abierta",
            },
        )
        assert vacante_response.status_code == 201
        vacante_id = vacante_response.json()["id"]

        correo_response = client.post(
            "/api/v1/canales/email",
            headers={"X-API-Key": "clave-de-prueba"},
            json={
                "event": "email.received",
                "from": {"name": "Candidata de prueba", "email": email},
                "message": {
                    "subject": f"Postulación para {titulo_vacante}",
                    "text": "Adjunto mi experiencia profesional.",
                },
            },
        )
        assert correo_response.status_code == 201
        candidato_id = correo_response.json()["id"]

        with client.app.state.test_session() as db:
            postulaciones = (
                db.query(models.Postulacion)
                .filter(
                    models.Postulacion.candidato_id == candidato_id,
                    models.Postulacion.vacante_id == vacante_id,
                )
                .all()
            )
            assert len(postulaciones) == 1
            assert postulaciones[0].estado == "En revisión"
    finally:
        with client.app.state.test_session() as db:
            if candidato_id is not None:
                candidato = db.get(models.Candidato, candidato_id)
                if candidato is not None:
                    db.delete(candidato)
            if vacante_id is not None:
                vacante = db.get(models.Vacante, vacante_id)
                if vacante is not None:
                    db.delete(vacante)
            db.commit()


def test_correo_no_postula_a_vacante_cerrada(test_session, monkeypatch):
    identificador = uuid4().hex
    titulo_vacante = f"Ingeniero de Datos {identificador}"
    email = f"vacante-cerrada-{identificador}@example.com"
    candidato_id = None
    vacante_id = None
    vacantes_recibidas = []

    def sugerir_vacante_cerrada_si_disponible(mensaje, vacantes):
        vacantes_recibidas.extend(vacantes)
        vacante_cerrada = next(
            (vacante for vacante in vacantes if vacante["id"] == vacante_id),
            None,
        )
        return {
            "vacante_id": vacante_cerrada["id"] if vacante_cerrada else None,
            "confianza": 100 if vacante_cerrada else 0,
        }

    monkeypatch.setattr(
        main,
        "sugerir_vacante",
        sugerir_vacante_cerrada_si_disponible,
    )

    with test_session() as db:
        vacante = models.Vacante(
            titulo=titulo_vacante,
            descripcion="Experiencia en Python y SQL.",
            estado="Cerrada",
        )
        db.add(vacante)
        db.flush()
        vacante_id = vacante.id

        payload = main.EmailWebhookPayload.model_validate(
            {
                "event": "email.received",
                "from": {"name": "Candidata de prueba", "email": email},
                "message": {
                    "subject": f"Postulación para {titulo_vacante}",
                    "text": "Me interesa esta oportunidad.",
                },
            }
        )
        response = main.Response()
        resultado = main.receive_email_candidate(payload, response, None, db)

        assert response.status_code == 201
        candidato_id = resultado["id"]
        assert all(
            vacante.get("id") != vacante_id for vacante in vacantes_recibidas
        )
        postulaciones = (
            db.query(models.Postulacion)
            .filter(
                models.Postulacion.candidato_id == candidato_id,
                models.Postulacion.vacante_id == vacante_id,
            )
            .all()
        )
        assert postulaciones == []


def test_whatsapp_sugiere_solo_vacantes_abiertas(test_session, monkeypatch):
    identificador = uuid4().hex
    email = f"whatsapp-vacante-{identificador}@example.com"
    titulo_abierto = f"Desarrollador React {identificador}"
    vacantes_recibidas = []

    with test_session() as db:
        vacante_abierta = models.Vacante(
            titulo=titulo_abierto,
            descripcion="Experiencia en React.",
            estado="Abierta",
        )
        vacante_cerrada = models.Vacante(
            titulo=f"Ingeniero de Datos {identificador}",
            descripcion="Experiencia en Python y SQL.",
            estado="Cerrada",
        )
        db.add_all([vacante_abierta, vacante_cerrada])
        db.flush()
        vacante_abierta_id = vacante_abierta.id
        vacante_cerrada_id = vacante_cerrada.id

        def sugerir_vacante_abierta(mensaje, vacantes):
            vacantes_recibidas.extend(vacantes)
            assert "Desarrollador React" in mensaje
            return {"vacante_id": vacante_abierta_id, "confianza": 100}

        monkeypatch.setattr(main, "sugerir_vacante", sugerir_vacante_abierta)
        payload = main.WhatsAppWebhookPayload.model_validate(
            {
                "object": "whatsapp_business_account",
                "entry": [
                    {
                        "changes": [
                            {
                                "value": {
                                    "candidate_email": email,
                                    "contacts": [
                                        {
                                            "profile": {
                                                "name": "Candidata WhatsApp"
                                            },
                                            "wa_id": "525500000099",
                                        }
                                    ],
                                    "messages": [
                                        {
                                            "from": "525500000099",
                                            "text": {
                                                "body": (
                                                    f"Me interesa {titulo_abierto}"
                                                )
                                            },
                                        }
                                    ],
                                }
                            }
                        ]
                    }
                ],
            }
        )
        response = main.Response()
        resultado = main.receive_whatsapp_candidate(payload, response, None, db)

        assert response.status_code == 201
        assert resultado["id"]
        assert [vacante["id"] for vacante in vacantes_recibidas] == [
            vacante_abierta_id
        ]
        postulaciones = (
            db.query(models.Postulacion)
            .filter(
                models.Postulacion.vacante_id.in_(
                    [vacante_abierta_id, vacante_cerrada_id]
                )
            )
            .all()
        )
        assert len(postulaciones) == 1
        assert postulaciones[0].vacante_id == vacante_abierta_id
        assert postulaciones[0].estado == "En revisión"


def test_whatsapp_y_email_unifican_contactos_en_un_candidato(client):
    email = f"contactos-{uuid4().hex}@example.com"
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

        with client.app.state.test_session() as db:
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
        with client.app.state.test_session() as db:
            candidato = (
                db.query(models.Candidato)
                .filter(models.Candidato.email == email)
                .one_or_none()
            )
            if candidato is not None:
                db.delete(candidato)
                db.commit()
