"""Carga datos de demostración cuando la base de datos está vacía."""

import logging

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

import models
from database import SessionLocal, engine, ensure_candidate_profile_column


def seed_database() -> None:
    """Inserta vacantes, candidatos y postulaciones iniciales una sola vez."""
    models.Base.metadata.create_all(bind=engine)
    ensure_candidate_profile_column()
    db = SessionLocal()

    try:
        hay_vacantes = db.scalar(
            select(func.count()).select_from(models.Vacante)
        )
        hay_candidatos = db.scalar(
            select(func.count()).select_from(models.Candidato)
        )
        if hay_vacantes or hay_candidatos:
            print(
                "La base de datos ya contiene vacantes o candidatos; "
                "no se agregaron datos de demostración."
            )
            return

        vacante_react = models.Vacante(
            titulo="Desarrollador/a React",
            descripcion=(
                "Desarrollo de interfaces web accesibles con React, "
                "JavaScript y consumo de APIs."
            ),
            estado="Abierta",
        )
        vacante_datos = models.Vacante(
            titulo="Ingeniero/a de Datos",
            descripcion=(
                "Diseño de pipelines de datos con Python, SQL y "
                "herramientas de integración."
            ),
            estado="Abierta",
        )
        candidato_react = models.Candidato(
            nombre="Valentina Ríos",
            email="valentina.rios.seed@example.com",
            telefono="+52 55 0101 0202",
            canal_origen="Webhook",
            habilidades="React, JavaScript, accesibilidad y APIs",
        )
        candidato_datos = models.Candidato(
            nombre="Andrés Morales",
            email="andres.morales.seed@example.com",
            telefono="+52 55 0101 0303",
            canal_origen="Email",
            habilidades="Python, SQL y pipelines de datos",
        )
        db.add_all(
            [
                vacante_react,
                vacante_datos,
                candidato_react,
                candidato_datos,
            ]
        )
        db.flush()
        db.add_all(
            [
                models.Postulacion(
                    candidato_id=candidato_react.id,
                    vacante_id=vacante_react.id,
                    estado="En revisión",
                ),
                models.Postulacion(
                    candidato_id=candidato_datos.id,
                    vacante_id=vacante_datos.id,
                    estado="En revisión",
                ),
            ]
        )
        db.commit()
        print("Datos de demostración insertados: 2 vacantes y 2 candidatos.")
    except SQLAlchemyError:
        db.rollback()
        logging.exception("No se pudieron insertar los datos de demostración.")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
