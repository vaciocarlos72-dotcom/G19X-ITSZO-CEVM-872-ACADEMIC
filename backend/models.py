"""Modelos relacionales principales del proceso de reclutamiento."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Candidato(Base):
    """Representa a una persona postulada a una vacante."""

    __tablename__ = "candidatos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    canal_origen: Mapped[str] = mapped_column(String(100), nullable=False)
    habilidades: Mapped[str | None] = mapped_column(String(500), nullable=True)
    fecha_postulacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    postulaciones: Mapped[list["Postulacion"]] = relationship(
        back_populates="candidato", cascade="all, delete-orphan"
    )


class Vacante(Base):
    """Representa una posicion disponible dentro del proceso de reclutamiento."""

    __tablename__ = "vacantes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(50), nullable=False)
    postulaciones: Mapped[list["Postulacion"]] = relationship(
        back_populates="vacante", cascade="all, delete-orphan"
    )


class Postulacion(Base):
    """Relaciona un candidato con una vacante y su estado de postulacion."""

    __tablename__ = "postulaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha_postulacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(50), default="En revisión", nullable=False
    )
    score_compatibilidad: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None
    )
    justificacion_agente: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    candidato_id: Mapped[int] = mapped_column(
        ForeignKey("candidatos.id"), nullable=False
    )
    vacante_id: Mapped[int] = mapped_column(
        ForeignKey("vacantes.id"), nullable=False
    )

    candidato: Mapped["Candidato"] = relationship(back_populates="postulaciones")
    vacante: Mapped["Vacante"] = relationship(back_populates="postulaciones")