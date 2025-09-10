import os
os.environ["APP_ENV"] = "test"  # e.g., to relax rate limits, etc.

import pytest
from fastapi.testclient import TestClient
from fastapi import Depends
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.main import create_app
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User


@pytest.fixture(scope="function")
def engine():
    # One shared in-memory SQLite connection for the whole test, across threads.
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=eng)
    try:
        yield eng
    finally:
        eng.dispose()


@pytest.fixture(scope="function")
def session_factory(engine):
    # Create a NEW Session per request; don't share Session objects across threads.
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture()
def client(session_factory):
    app = create_app()

    # Override get_db to return a fresh Session for every request
    def _get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = _get_db

    # Seed a test user using a throwaway Session
    with session_factory() as db:
        db.add(User(oauth_sub="test-sub", email_hash="x" * 64))
        db.commit()

    # Override auth to pull that user using the *request* Session
    def _current_user_override(db: Session = Depends(_get_db)):
        return db.execute(
            select(User).where(User.oauth_sub == "test-sub")
        ).scalar_one()

    app.dependency_overrides[get_current_user] = _current_user_override

    return TestClient(app)
