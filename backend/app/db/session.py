from collections.abc import Generator

from sqlalchemy import Engine, event
from sqlmodel import Session, create_engine

from app import models as _models  # noqa: F401
from app.core.config import DATA_DIR, DATABASE_URL, PRIVATE_STORAGE_DIR, PUBLIC_STORAGE_DIR
from app.db.migrations import run_migrations
from app.db.schema_validation import database_schema_errors

connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


@event.listens_for(engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    if engine.dialect.name != "sqlite":
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def create_db_and_tables() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    run_migrations()
    validate_database_schema(engine)


def validate_database_schema(target_engine: Engine) -> None:
    schema_errors = database_schema_errors(target_engine)

    if schema_errors:
        details = "; ".join(schema_errors)
        raise RuntimeError(
            "Database schema does not match the current models. "
            f"{details}. Reset local dev data with scripts/reset_dev_data.sh or rebuild the database."
        )


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
