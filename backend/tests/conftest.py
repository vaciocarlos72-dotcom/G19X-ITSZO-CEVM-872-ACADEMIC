"""Configuración compartida de base de datos y cliente para las pruebas."""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["WEBHOOK_API_KEY"] = "clave-de-prueba"
os.environ["GEMINI_API_KEY"] = ""

import main
import models


@pytest.fixture
def test_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )
    yield session_factory
    engine.dispose()


@pytest.fixture
def client(test_session, monkeypatch):
    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = override_get_db
    main.app.state.test_session = test_session
    monkeypatch.setenv("WEBHOOK_API_KEY", "clave-de-prueba")

    with TestClient(main.app) as test_client:
        yield test_client

    main.app.dependency_overrides.clear()
    del main.app.state.test_session
