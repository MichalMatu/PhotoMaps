from collections.abc import Generator

from sqlalchemy import Engine, inspect
from sqlmodel import Session, SQLModel, create_engine

from app import models as _models  # noqa: F401
from app.core.config import DATA_DIR, DATABASE_URL, PRIVATE_STORAGE_DIR, PUBLIC_STORAGE_DIR

connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
    validate_database_schema(engine)


def validate_database_schema(target_engine: Engine) -> None:
    schema_errors: list[str] = []

    with target_engine.connect() as connection:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())

        for table_name, table in SQLModel.metadata.tables.items():
            if table_name not in table_names:
                continue

            database_columns = {column["name"] for column in inspector.get_columns(table_name)}
            model_columns = set(table.columns.keys())
            extra_columns = sorted(database_columns - model_columns)
            missing_columns = sorted(model_columns - database_columns)

            if extra_columns:
                schema_errors.append(f"{table_name}: extra columns {', '.join(extra_columns)}")
            if missing_columns:
                schema_errors.append(f"{table_name}: missing columns {', '.join(missing_columns)}")

    if schema_errors:
        details = "; ".join(schema_errors)
        raise RuntimeError(
            "Database schema does not match the current models. "
            f"{details}. Reset local dev data with scripts/reset_dev_data.sh or rebuild the database."
        )


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
