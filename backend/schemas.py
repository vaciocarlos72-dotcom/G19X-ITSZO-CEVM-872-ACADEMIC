"""Esquemas Pydantic para validar entradas y respuestas de la API."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PostulacionBase(BaseModel):
    """Datos compartidos de una postulacion."""

    estado: str = "En revisión"


class PostulacionCreate(PostulacionBase):
    """Datos necesarios para crear una postulacion."""

    candidato_id: int
    vacante_id: int


class PostulacionResponse(PostulacionCreate):
    """Representacion de una postulacion devuelta por la API."""

    id: int
    fecha_postulacion: datetime
    score_compatibilidad: int | None = None
    justificacion_agente: str | None = None
    model_config = ConfigDict(from_attributes=True)


class PostulacionEvaluacionResponse(PostulacionResponse):
    """Postulacion evaluada con la fuente usada por el agente."""

    fuente: Literal["gemini", "simulado"]


class CandidatoCreate(BaseModel):
    """Datos necesarios para crear un candidato."""

    nombre: str
    email: str
    telefono: str | None = None
    canal_origen: str
    habilidades: str | None = None
    fecha_postulacion: datetime | None = None


class CandidatoResponse(CandidatoCreate):
    """Representacion de un candidato devuelta por la API."""

    id: int
    perfil_json: str | None = None
    postulaciones: list[PostulacionResponse] | None = None
    model_config = ConfigDict(from_attributes=True)


class WhatsAppProfile(BaseModel):
    """Perfil de contacto incluido en el evento estilo Meta WhatsApp."""

    name: str


class WhatsAppContact(BaseModel):
    """Contacto de WhatsApp y correo recopilado por el flujo de registro."""

    wa_id: str
    profile: WhatsAppProfile


class WhatsAppText(BaseModel):
    """Cuerpo de un mensaje de texto de WhatsApp."""

    body: str


class WhatsAppMessage(BaseModel):
    """Mensaje entrante con la forma usada por la API de Meta."""

    sender_id: str = Field(alias="from")
    text: WhatsAppText


class WhatsAppValue(BaseModel):
    """Datos de un cambio de mensaje y contacto para el webhook."""

    candidate_email: str
    contacts: list[WhatsAppContact]
    messages: list[WhatsAppMessage]


class WhatsAppChange(BaseModel):
    value: WhatsAppValue


class WhatsAppEntry(BaseModel):
    changes: list[WhatsAppChange]


class WhatsAppWebhookPayload(BaseModel):
    """Envelope reducido de webhook de WhatsApp Business (Meta)."""

    object: str
    entry: list[WhatsAppEntry]


class EmailSender(BaseModel):
    """Remitente enviado por el proveedor de correo."""

    name: str
    email: str


class EmailMessage(BaseModel):
    """Contenido del mensaje de aplicación recibido por correo."""

    subject: str
    text: str


class EmailWebhookPayload(BaseModel):
    """Evento reducido de entrada de un proveedor de correo electrónico."""

    event: str
    sender: EmailSender = Field(alias="from")
    message: EmailMessage


class VacanteCreate(BaseModel):
    """Datos necesarios para crear una vacante."""

    titulo: str
    descripcion: str | None = None
    estado: str


class VacanteResponse(VacanteCreate):
    """Representacion de una vacante devuelta por la API."""

    id: int
    postulaciones: list[PostulacionResponse] | None = None
    model_config = ConfigDict(from_attributes=True)
