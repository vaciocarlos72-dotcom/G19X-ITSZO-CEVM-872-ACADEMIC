"""Configuración de entorno para las pruebas del backend."""

import os


os.environ["DATABASE_URL"] = "sqlite:///./test_plurione.db"
os.environ["WEBHOOK_API_KEY"] = "clave-de-prueba"
os.environ["GEMINI_API_KEY"] = ""
