from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import DATA_DIR, DATABASE_URL, PRIVATE_STORAGE_DIR, PUBLIC_STORAGE_DIR

connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
    ensure_category_schema()


def ensure_category_schema() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "category" not in inspector.get_table_names():
            return

        columns = {column["name"] for column in inspector.get_columns("category")}
        if "status" not in columns:
            connection.execute(text("ALTER TABLE category ADD COLUMN status VARCHAR NOT NULL DEFAULT 'active'"))


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
