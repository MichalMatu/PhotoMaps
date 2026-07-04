from pathlib import Path

from pytest import raises
from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine
from sqlmodel.pool import StaticPool

from alembic import command
from alembic.config import Config
from app.db.session import validate_database_schema

BACKEND_DIR = Path(__file__).resolve().parents[3]


def alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


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


def test_schema_validation_rejects_missing_model_columns() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE place (id VARCHAR NOT NULL PRIMARY KEY)"))

    with raises(RuntimeError, match="place: missing columns"):
        validate_database_schema(engine)


def test_memory_migrations_preserve_existing_records_and_backfill_new_fields(tmp_path: Path) -> None:
    database_path = tmp_path / "legacy-memory.db"
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
        connection.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001_initial_mvp')"))
        connection.execute(text("CREATE TABLE place (id VARCHAR NOT NULL PRIMARY KEY, memory_count INTEGER NOT NULL)"))
        connection.execute(
            text(
                """
                CREATE TABLE memory (
                    id VARCHAR NOT NULL PRIMARY KEY,
                    place_id VARCHAR NOT NULL,
                    author_name VARCHAR,
                    author_city VARCHAR,
                    caption VARCHAR NOT NULL,
                    original_path VARCHAR NOT NULL,
                    public_path VARCHAR NOT NULL,
                    thumb_path VARCHAR NOT NULL,
                    status VARCHAR NOT NULL DEFAULT 'pending',
                    paid BOOLEAN NOT NULL DEFAULT 0,
                    share_slug VARCHAR NOT NULL,
                    consent_confirmed BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL,
                    approved_at DATETIME
                )
                """
            )
        )
        connection.execute(
            text("INSERT INTO place (id, memory_count) VALUES (:id, :memory_count)"),
            {"id": "place-1", "memory_count": 7},
        )
        connection.execute(
            text(
                """
                INSERT INTO memory (
                    id, place_id, author_name, author_city, caption,
                    original_path, public_path, thumb_path, status,
                    paid, share_slug, consent_confirmed, created_at, approved_at
                ) VALUES (
                    :id, :place_id, :author_name, :author_city, :caption,
                    :original_path, :public_path, :thumb_path, :status,
                    :paid, :share_slug, :consent_confirmed, :created_at, :approved_at
                )
                """
            ),
            {
                "id": "memory-1",
                "place_id": "place-1",
                "author_name": "Marta",
                "author_city": "Wrocław",
                "caption": "Stary podpis",
                "original_path": "memories/original.jpg",
                "public_path": "/media/memories/public.jpg",
                "thumb_path": "/media/memories/thumb.jpg",
                "status": "approved",
                "paid": 0,
                "share_slug": "legacyshare01",
                "consent_confirmed": 1,
                "created_at": "2026-06-10 10:00:00",
                "approved_at": "2026-06-10 11:00:00",
            },
        )

    command.upgrade(alembic_config(database_url), "head")

    with engine.connect() as connection:
        migrated_memory = (
            connection.execute(text("SELECT caption, memory_text, claim_token_hash FROM memory WHERE id = 'memory-1'"))
            .mappings()
            .one()
        )
        migrated_place = (
            connection.execute(text("SELECT memory_count, custom_fields FROM place WHERE id = 'place-1'"))
            .mappings()
            .one()
        )
        migrated_app_config = (
            connection.execute(text("SELECT product_name, locale FROM app_config WHERE id = 'default'"))
            .mappings()
            .one()
        )
        memory_columns = {column["name"]: column for column in inspect(connection).get_columns("memory")}

    assert migrated_memory["caption"] == "Stary podpis"
    assert migrated_memory["memory_text"] == "Stary podpis"
    assert migrated_memory["claim_token_hash"] == ""
    assert migrated_place["memory_count"] == 7
    assert migrated_place["custom_fields"] == "{}"
    assert migrated_app_config["product_name"] == "PhotoMap"
    assert migrated_app_config["locale"] == "pl-PL"
    assert memory_columns["claim_token_hash"]["default"] is None


def test_photo_attribution_migration_preserves_existing_records(tmp_path: Path) -> None:
    database_path = tmp_path / "legacy-photo.db"
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
        connection.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0010_editorial_photo_source')"))
        connection.execute(
            text(
                """
                CREATE TABLE photo (
                    id VARCHAR NOT NULL PRIMARY KEY,
                    place_id VARCHAR NOT NULL,
                    original_path VARCHAR NOT NULL,
                    public_path VARCHAR NOT NULL,
                    thumb_path VARCHAR NOT NULL,
                    role VARCHAR NOT NULL DEFAULT 'gallery',
                    source VARCHAR NOT NULL DEFAULT 'editorial',
                    status VARCHAR NOT NULL DEFAULT 'pending',
                    caption VARCHAR,
                    consent_confirmed BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL,
                    approved_at DATETIME
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO photo (
                    id, place_id, original_path, public_path, thumb_path,
                    role, source, status, caption, consent_confirmed, created_at, approved_at
                ) VALUES (
                    :id, :place_id, :original_path, :public_path, :thumb_path,
                    :role, :source, :status, :caption, :consent_confirmed, :created_at, :approved_at
                )
                """
            ),
            {
                "id": "photo-1",
                "place_id": "place-1",
                "original_path": "photos/original.jpg",
                "public_path": "/media/photos/public.jpg",
                "thumb_path": "/media/photos/thumb.jpg",
                "role": "gallery",
                "source": "editorial",
                "status": "approved",
                "caption": "Rynek",
                "consent_confirmed": 1,
                "created_at": "2026-06-10 10:00:00",
                "approved_at": "2026-06-10 11:00:00",
            },
        )

    command.upgrade(alembic_config(database_url), "head")

    with engine.connect() as connection:
        migrated_photo = (
            connection.execute(
                text(
                    """
                    SELECT caption, description, attribution_author, attribution_source_url,
                           attribution_license, attribution_license_url
                    FROM photo WHERE id = 'photo-1'
                    """
                )
            )
            .mappings()
            .one()
        )
        photo_columns = {column["name"]: column for column in inspect(connection).get_columns("photo")}

    assert migrated_photo["caption"] == "Rynek"
    assert migrated_photo["description"] is None
    assert migrated_photo["attribution_author"] is None
    assert migrated_photo["attribution_source_url"] is None
    assert migrated_photo["attribution_license"] is None
    assert migrated_photo["attribution_license_url"] is None
    assert photo_columns["description"]["nullable"] is True
    assert photo_columns["attribution_author"]["nullable"] is True
    assert photo_columns["attribution_source_url"]["nullable"] is True
