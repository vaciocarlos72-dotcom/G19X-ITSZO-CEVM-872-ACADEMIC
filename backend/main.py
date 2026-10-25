"""Aplicacion inicial del backend de PluriOne."""

import os
import secrets
from collections.abc import Generator

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from database import SessionLocal, engine
from ia_agent import evaluar_candidato, extraer_texto_pdf
import models
from schemas import (
    CandidatoCreate,
    CandidatoResponse,
    EmailWebhookPayload,
    PostulacionEvaluacionResponse,
    PostulacionCreate,
    PostulacionResponse,
    VacanteCreate,
    VacanteResponse,
    WhatsAppWebhookPayload,
)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
models.Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Proporciona una sesion SQLAlchemy y la cierra al terminar la solicitud."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def validar_api_key_webhook(
    api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> None:
    """Valida la clave configurada para recibir candidatos vía Webhook."""
    api_key_configurada = os.getenv("WEBHOOK_API_KEY")
    if not api_key_configurada:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La autenticación del Webhook no está configurada.",
        )

    if api_key is None or not secrets.compare_digest(
        api_key.encode("utf-8"),
        api_key_configurada.encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida o ausente.",
        )


@app.get("/")
def read_root():
    """Devuelve un mensaje de bienvenida para comprobar que la API funciona."""
    return {"message": "Bienvenido a PluriOne"}


@app.post(
    "/candidatos/",
    response_model=CandidatoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_candidato(
    candidato_data: CandidatoCreate,
    db: Session = Depends(get_db),
):
    """Crea un candidato y devuelve el registro persistido."""
    candidato = models.Candidato(**candidato_data.model_dump(exclude_unset=True))
    try:
        db.add(candidato)
        db.commit()
        db.refresh(candidato)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo crear el candidato.",
        ) from exc
    return candidato


@app.post(
    "/api/v1/candidatos/con-cv",
    status_code=status.HTTP_201_CREATED,
    tags=["Candidatos"],
)
async def create_candidate_with_cv(
    nombre: str = Form(...),
    email: str = Form(...),
    telefono: str | None = Form(default=None),
    canal_origen: str = Form(...),
    habilidades: str | None = Form(default=None),
    archivo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    """Crea un candidato y, si se envía, adjunta el texto extraído del CV."""
    texto_cv = None
    nombre_archivo = None

    if archivo is not None:
        try:
            contenido = await archivo.read(10 * 1024 * 1024 + 1)
            if len(contenido) > 10 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="El PDF no puede superar los 10 MB.",
                )
            if (
                archivo.content_type != "application/pdf"
                or not contenido.startswith(b"%PDF-")
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El archivo seleccionado no es un PDF válido.",
                )
            texto_cv = extraer_texto_pdf(contenido)
            nombre_archivo = os.path.basename(archivo.filename or "cv.pdf")[:255]
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se pudo leer el PDF: {exc}",
            ) from exc
        finally:
            await archivo.close()

    candidato_data = CandidatoCreate(
        nombre=nombre.strip(),
        email=email.strip(),
        telefono=telefono.strip() if telefono and telefono.strip() else None,
        canal_origen=canal_origen.strip(),
        habilidades=habilidades.strip() if habilidades and habilidades.strip() else None,
    )
    candidato = models.Candidato(**candidato_data.model_dump(exclude_unset=True))

    try:
        db.add(candidato)
        db.flush()
        if texto_cv is not None and nombre_archivo is not None:
            db.add(
                models.CandidatoCV(
                    candidato_id=candidato.id,
                    nombre_archivo=nombre_archivo,
                    texto_extraido=texto_cv,
                )
            )
        db.commit()
        db.refresh(candidato)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo crear el candidato o adjuntar su CV.",
        ) from exc

    return {
        "mensaje": "Candidato creado correctamente.",
        "id": candidato.id,
        "nombre": candidato.nombre,
        "cv_adjunto": texto_cv is not None,
        "nombre_archivo": nombre_archivo,
    }


@app.post("/api/v1/webhooks/candidatos", tags=["Integraciones Omnicanal"])
def receive_candidate_webhook(
    candidato_data: CandidatoCreate,
    _: None = Depends(validar_api_key_webhook),
    db: Session = Depends(get_db),
):
    """Recibe candidatos enviados automáticamente por fuentes externas."""
    candidato = models.Candidato(**candidato_data.model_dump(exclude_unset=True))
    try:
        db.add(candidato)
        db.commit()
        db.refresh(candidato)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo recibir el candidato vía Webhook.",
        ) from exc

    return {
        "mensaje": "Candidato recibido vía Webhook exitosamente",
        "id": candidato.id,
    }


def _registrar_candidato_omnicanal(
    candidato_data: CandidatoCreate,
    db: Session,
) -> dict[str, int | str]:
    candidato = models.Candidato(**candidato_data.model_dump(exclude_unset=True))
    try:
        db.add(candidato)
        db.commit()
        db.refresh(candidato)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo registrar el candidato del canal.",
        ) from exc

    return {
        "mensaje": "Candidato registrado correctamente.",
        "id": candidato.id,
        "nombre": candidato.nombre,
        "canal_origen": candidato.canal_origen,
    }


@app.post(
    "/api/v1/canales/whatsapp",
    tags=["Integraciones Omnicanal"],
    status_code=status.HTTP_201_CREATED,
)
def receive_whatsapp_candidate(
    payload: WhatsAppWebhookPayload,
    _: None = Depends(validar_api_key_webhook),
    db: Session = Depends(get_db),
):
    """Normaliza y registra un candidato recibido por WhatsApp Business."""
    if payload.object != "whatsapp_business_account":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento no corresponde a una cuenta de WhatsApp Business.",
        )

    try:
        value = payload.entry[0].changes[0].value
        contact = value.contacts[0]
        message = next(
            item for item in value.messages if item.sender_id == contact.wa_id
        )
    except (IndexError, StopIteration) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento de WhatsApp no contiene un contacto y mensaje válidos.",
        ) from exc

    candidato_data = CandidatoCreate(
        nombre=contact.profile.name.strip(),
        email=value.candidate_email.strip(),
        telefono=contact.wa_id,
        canal_origen="WhatsApp",
        habilidades=message.text.body.strip() or None,
    )
    return _registrar_candidato_omnicanal(candidato_data, db)


@app.post(
    "/api/v1/canales/email",
    tags=["Integraciones Omnicanal"],
    status_code=status.HTTP_201_CREATED,
)
def receive_email_candidate(
    payload: EmailWebhookPayload,
    _: None = Depends(validar_api_key_webhook),
    db: Session = Depends(get_db),
):
    """Normaliza y registra un candidato recibido desde un proveedor de correo."""
    if payload.event != "email.received":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento de correo no es compatible.",
        )

    candidato_data = CandidatoCreate(
        nombre=payload.sender.name.strip(),
        email=payload.sender.email.strip(),
        canal_origen="Email",
        habilidades=payload.message.text.strip() or None,
    )
    return _registrar_candidato_omnicanal(candidato_data, db)


@app.get("/api/v1/candidatos", response_model=list[CandidatoResponse])
@app.get("/candidatos/", response_model=list[CandidatoResponse])
def list_candidatos(db: Session = Depends(get_db)):
    """Devuelve todos los candidatos registrados."""
    return db.scalars(select(models.Candidato)).all()


@app.post(
    "/vacantes/",
    response_model=VacanteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_vacante(
    vacante_data: VacanteCreate,
    db: Session = Depends(get_db),
):
    """Crea una vacante y devuelve el registro persistido."""
    vacante = models.Vacante(**vacante_data.model_dump(exclude_unset=True))
    try:
        db.add(vacante)
        db.commit()
        db.refresh(vacante)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo crear la vacante.",
        ) from exc
    return vacante


@app.get("/api/v1/vacantes", response_model=list[VacanteResponse])
@app.get("/vacantes/", response_model=list[VacanteResponse])
def list_vacantes(db: Session = Depends(get_db)):
    """Devuelve todas las vacantes registradas."""
    return db.scalars(select(models.Vacante)).all()


@app.post(
    "/postulaciones/",
    response_model=PostulacionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_postulacion(
    postulacion_data: PostulacionCreate,
    db: Session = Depends(get_db),
):
    """Crea una postulacion vinculando un candidato con una vacante."""
    candidato = db.get(models.Candidato, postulacion_data.candidato_id)
    vacante = db.get(models.Vacante, postulacion_data.vacante_id)
    if candidato is None or vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El candidato o la vacante no existen.",
        )

    postulacion = models.Postulacion(**postulacion_data.model_dump())
    try:
        db.add(postulacion)
        db.commit()
        db.refresh(postulacion)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo crear la postulacion.",
        ) from exc
    return postulacion


@app.get("/vacantes/{vacante_id}/postulaciones")
def list_vacante_postulaciones(
    vacante_id: int,
    db: Session = Depends(get_db),
):
    """Devuelve las postulaciones de una vacante junto con sus candidatos."""
    vacante = db.get(models.Vacante, vacante_id)
    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    postulaciones = db.scalars(
        select(models.Postulacion)
        .where(models.Postulacion.vacante_id == vacante_id)
        .options(joinedload(models.Postulacion.candidato))
    ).all()

    return [
        {
            **PostulacionResponse.model_validate(postulacion).model_dump(),
            "candidato": CandidatoResponse.model_validate(
                postulacion.candidato
            ).model_dump(exclude={"postulaciones"}),
        }
        for postulacion in postulaciones
    ]


@app.post(
    "/agente/evaluar/{postulacion_id}",
    response_model=PostulacionEvaluacionResponse,
)
def evaluar_postulacion(postulacion_id: int, db: Session = Depends(get_db)):
    """Evalua la compatibilidad entre un candidato y una vacante."""
    postulacion = db.get(models.Postulacion, postulacion_id)
    if postulacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulacion no encontrada.",
        )

    candidato = postulacion.candidato
    vacante = postulacion.vacante

    cv_reciente = max(
        candidato.curriculums,
        key=lambda curriculum: curriculum.fecha_carga,
        default=None,
    )
    texto_cv = (
        cv_reciente.texto_extraido
        if cv_reciente is not None
        else candidato.habilidades
    )
    resultado_agente = evaluar_candidato(texto_cv, vacante.descripcion)
    postulacion.score_compatibilidad = resultado_agente["score"]
    postulacion.justificacion_agente = resultado_agente["justificacion"]

    try:
        db.commit()
        db.refresh(postulacion)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo guardar la evaluacion de la postulacion.",
        ) from exc
    return {
        **PostulacionResponse.model_validate(postulacion).model_dump(),
        "fuente": resultado_agente["fuente"],
    }


@app.post("/agente/evaluar-cv/{vacante_id}")
async def evaluar_cv_pdf(
    vacante_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Evalua un CV PDF contra una vacante sin persistir el archivo."""
    vacante = db.get(models.Vacante, vacante_id)
    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    if archivo.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El archivo debe ser un PDF.",
        )

    contenido = await archivo.read(10 * 1024 * 1024 + 1)
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El PDF no puede superar los 10 MB.",
        )
    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no contiene un PDF válido.",
        )

    try:
        texto_cv = extraer_texto_pdf(contenido)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return evaluar_candidato(texto_cv, vacante.descripcion)


@app.post("/api/v1/candidatos/{candidato_id}/cv")
async def cargar_cv_candidato(
    candidato_id: int,
    archivo: UploadFile = File(...),
    vacante_id: int = Query(
        ...,
        description="Vacante a la que está asociada la postulación del candidato.",
    ),
    db: Session = Depends(get_db),
):
    """Carga un CV en memoria y lo evalúa para una vacante del candidato."""
    candidato = db.get(models.Candidato, candidato_id)
    if candidato is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato no encontrado.",
        )

    vacante = db.get(models.Vacante, vacante_id)
    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    postulacion = db.scalar(
        select(models.Postulacion).where(
            models.Postulacion.candidato_id == candidato_id,
            models.Postulacion.vacante_id == vacante_id,
        )
    )
    if postulacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El candidato no tiene una postulación para esta vacante.",
        )

    try:
        contenido = await archivo.read(10 * 1024 * 1024 + 1)
        if len(contenido) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="El PDF no puede superar los 10 MB.",
            )
        if not contenido.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo está vacío o no es un PDF válido.",
            )

        texto_cv = extraer_texto_pdf(contenido)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo leer el PDF: {exc}",
        ) from exc
    finally:
        await archivo.close()

    resultado = evaluar_candidato(texto_cv, vacante.descripcion)
    postulacion.score_compatibilidad = resultado["score"]
    postulacion.justificacion_agente = resultado["justificacion"]

    try:
        db.commit()
        db.refresh(postulacion)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la evaluación del CV.",
        ) from exc

    return {
        "candidato_id": candidato.id,
        "vacante_id": vacante.id,
        "postulacion_id": postulacion.id,
        **resultado,
    }


@app.delete("/vacantes/{vacante_id}")
def delete_vacante(vacante_id: int, db: Session = Depends(get_db)):
    """Elimina una vacante existente por su identificador."""
    try:
        vacante = db.get(models.Vacante, vacante_id)
        if vacante is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vacante no encontrada.",
            )

        db.delete(vacante)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo eliminar la vacante por un error de base de datos.",
        ) from exc
    return {"mensaje": "Eliminado correctamente"}


@app.delete("/candidatos/{candidato_id}")
def delete_candidato(candidato_id: int, db: Session = Depends(get_db)):
    """Elimina un candidato existente por su identificador."""
    try:
        candidato = db.get(models.Candidato, candidato_id)
        if candidato is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidato no encontrado.",
            )

        db.delete(candidato)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo eliminar el candidato por un error de base de datos.",
        ) from exc
    return {"mensaje": "Eliminado correctamente"}


@app.put("/vacantes/{vacante_id}", response_model=VacanteResponse)
def update_vacante(
    vacante_id: int,
    vacante_data: VacanteCreate,
    db: Session = Depends(get_db),
):
    """Actualiza una vacante existente y devuelve el registro actualizado."""
    vacante = db.get(models.Vacante, vacante_id)
    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    for field, value in vacante_data.model_dump(exclude_unset=True).items():
        setattr(vacante, field, value)

    try:
        db.commit()
        db.refresh(vacante)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar la vacante.",
        ) from exc
    return vacante


@app.put("/candidatos/{candidato_id}", response_model=CandidatoResponse)
def update_candidato(
    candidato_id: int,
    candidato_data: CandidatoCreate,
    db: Session = Depends(get_db),
):
    """Actualiza un candidato existente y devuelve el registro actualizado."""
    candidato = db.get(models.Candidato, candidato_id)
    if candidato is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato no encontrado.",
        )

    for field, value in candidato_data.model_dump(exclude_unset=True).items():
        setattr(candidato, field, value)

    try:
        db.commit()
        db.refresh(candidato)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar el candidato.",
        ) from exc
    return candidato