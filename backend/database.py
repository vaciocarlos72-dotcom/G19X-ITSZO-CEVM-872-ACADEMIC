"""Configuracion de la conexion y la base declarativa de SQLAlchemy."""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_FILE)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(f"DATABASE_URL no esta definida en {ENV_FILE}")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Clase base para los modelos persistidos en PostgreSQL."""


def ensure_cv_profile_column() -> None:
    """Añade el perfil JSON a la tabla de CV en bases existentes."""
    inspector = inspect(engine)
    with engine.begin() as connection:
        if inspector.has_table("candidato_cvs"):
            columnas_cvs = {
                column["name"]
                for column in inspector.get_columns("candidato_cvs")
            }
            if "perfil_json" not in columnas_cvs:
                connection.execute(
                    text("ALTER TABLE candidato_cvs ADD COLUMN perfil_json TEXT")
                )


def ensure_postulacion_fuente_column() -> None:
    """Añade la fuente de evaluación a bases existentes."""
    inspector = inspect(engine)
    if not inspector.has_table("postulaciones"):
        return

    columnas = {
        column["name"] for column in inspector.get_columns("postulaciones")
    }
    if "fuente_evaluacion" not in columnas:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE postulaciones "
                    "ADD COLUMN fuente_evaluacion VARCHAR(20)"
                )
            )