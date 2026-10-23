"""Agente simulado para evaluar candidatos sin credenciales de un LLM."""

import re


# TODO: Reemplazar con LangChain y Azure OpenAI cuando se tengan las credenciales (Requerimiento PluriOne)


def evaluar_candidato_simulado(
    descripcion_vacante: str | None,
    habilidades_candidato: str | None,
) -> dict[str, int | str]:
    """Calcula una compatibilidad simple a partir de palabras compartidas."""
    palabras_vacante = {
        palabra
        for palabra in re.findall(r"[\wáéíóúüñ]+", (descripcion_vacante or "").lower())
        if palabra
    }
    palabras_candidato = {
        palabra
        for palabra in re.findall(r"[\wáéíóúüñ]+", (habilidades_candidato or "").lower())
        if palabra
    }
    coincidencias = sorted(palabras_vacante & palabras_candidato)
    score = (
        round((len(coincidencias) / len(palabras_vacante)) * 100)
        if palabras_vacante
        else 0
    )
    tecnologias = " e ".join(coincidencias) if coincidencias else "ninguna"

    return {
        "score": min(score, 100),
        "justificacion": (
            "El agente simulado detectó coincidencias en "
            f"las tecnologías {tecnologias}."
        ),
    }
