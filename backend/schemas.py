"""Esquemas Pydantic para validar entradas y respuestas de la API."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
    postulaciones: list[PostulacionResponse] | None = None
    model_config = ConfigDict(from_attributes=True)


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
