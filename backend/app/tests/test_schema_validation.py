from pathlib import Path

from pytest import raises
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import validate_database_schema

MIGRATION_DIR = Path(__file__).resolve().parents[2] / "alembic" / "versions"


def test_schema_validation_rejects_extra_model_columns() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE place ADD COLUMN obsolete_flag BOOLEAN NOT NULL DEFAULT 0"))

    with raises(RuntimeError, match="extra columns obsolete_flag"):
        validate_database_schema(engine)


def test_memory_migrations_do_not_delete_existing_records() -> None:
    migration_sources = [
        (MIGRATION_DIR / "0002_memory_claim_token.py").read_text(),
        (MIGRATION_DIR / "0003_memory_text.py").read_text(),
    ]

    for source in migration_sources:
        assert "DELETE FROM memory" not in source
        assert "memory_count = 0" not in source
