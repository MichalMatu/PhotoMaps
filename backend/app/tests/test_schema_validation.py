from pytest import raises
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import validate_database_schema


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
