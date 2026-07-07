import json
from pathlib import Path

from pytest import raises
from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from alembic import command
from alembic.config import Config
from app.db.session import validate_database_schema
from app.models.place import Place

BACKEND_DIR = Path(__file__).resolve().parents[3]


def json_array(value):
    if isinstance(value, str):
        return json.loads(value)
    return value


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


def test_schema_validation_rejects_missing_model_foreign_keys() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE city (
                    id VARCHAR NOT NULL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    lat FLOAT NOT NULL,
                    lon FLOAT NOT NULL,
                    default_zoom INTEGER NOT NULL,
                    sort_order INTEGER NOT NULL,
                    status VARCHAR NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE place (
                    id VARCHAR NOT NULL PRIMARY KEY,
                    city_id VARCHAR NOT NULL,
                    slug VARCHAR NOT NULL,
                    title VARCHAR NOT NULL,
                    description VARCHAR,
                    local_comment VARCHAR,
                    article_blocks JSON NOT NULL,
                    lat FLOAT NOT NULL,
                    lon FLOAT NOT NULL,
                    weight FLOAT NOT NULL,
                    status VARCHAR NOT NULL,
                    custom_fields JSON NOT NULL,
                    photo_count INTEGER NOT NULL,
                    memory_count INTEGER NOT NULL,
                    cover_photo_id VARCHAR,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
        )

    with raises(RuntimeError, match="place: missing foreign key city_id -> city.id"):
        validate_database_schema(engine)


def test_schema_validation_rejects_missing_model_indexes() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with engine.begin() as connection:
        connection.execute(text("DROP INDEX ix_place_cover_photo_id"))

    with raises(RuntimeError, match="place: missing index cover_photo_id"):
        validate_database_schema(engine)


def test_schema_validation_runs_sqlite_foreign_key_check() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(Place(city_id="missing-city", slug="broken-place", title="Broken", lat=51.1, lon=17.1))
        session.commit()

    with raises(RuntimeError, match="sqlite: foreign_key_check failed place"):
        validate_database_schema(engine)


def test_migrations_create_core_integrity_constraints(tmp_path: Path) -> None:
    database_path = tmp_path / "schema-integrity.db"
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    command.upgrade(alembic_config(database_url), "head")

    with engine.connect() as connection:
        inspector = inspect(connection)
        place_foreign_keys = {
            (
                tuple(foreign_key["constrained_columns"]),
                foreign_key["referred_table"],
                tuple(foreign_key["referred_columns"]),
            )
            for foreign_key in inspector.get_foreign_keys("place")
        }
        place_indexes = {
            (tuple(index["column_names"]), bool(index.get("unique"))) for index in inspector.get_indexes("place")
        }
        place_guide_indexes = {
            (tuple(index["column_names"]), bool(index.get("unique"))) for index in inspector.get_indexes("place_guide")
        }
        foreign_key_issues = connection.execute(text("PRAGMA foreign_key_check")).fetchall()

    assert ((("city_id",), "city", ("id",))) in place_foreign_keys
    assert ((("cover_photo_id",), "photo", ("id",))) in place_foreign_keys
    assert ((("cover_photo_id",), False)) in place_indexes
    assert ((("place_id",), False)) in place_guide_indexes
    assert foreign_key_issues == []


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
                    SELECT caption, description_blocks, attribution_author, attribution_source_url,
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
    assert json_array(migrated_photo["description_blocks"]) == []
    assert migrated_photo["attribution_author"] is None
    assert migrated_photo["attribution_source_url"] is None
    assert migrated_photo["attribution_license"] is None
    assert migrated_photo["attribution_license_url"] is None
    assert "description" not in photo_columns
    assert photo_columns["attribution_author"]["nullable"] is True
    assert photo_columns["attribution_source_url"]["nullable"] is True


def test_photo_description_migration_moves_legacy_text_to_blocks(tmp_path: Path) -> None:
    database_path = tmp_path / "legacy-photo-description.db"
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
        connection.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0012_photo_description')"))
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
                    description VARCHAR(1200),
                    attribution_author VARCHAR(120),
                    attribution_source_url VARCHAR(500),
                    attribution_license VARCHAR(120),
                    attribution_license_url VARCHAR(500),
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
                    role, source, status, caption, description, consent_confirmed, created_at, approved_at
                ) VALUES (
                    :id, :place_id, :original_path, :public_path, :thumb_path,
                    :role, :source, :status, :caption, :description, :consent_confirmed, :created_at, :approved_at
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
                "description": "  Dłuższy opis zdjęcia do TTS.  ",
                "consent_confirmed": 1,
                "created_at": "2026-06-10 10:00:00",
                "approved_at": "2026-06-10 11:00:00",
            },
        )

    command.upgrade(alembic_config(database_url), "head")

    with engine.connect() as connection:
        migrated_photo = (
            connection.execute(text("SELECT description_blocks FROM photo WHERE id = 'photo-1'")).mappings().one()
        )
        photo_columns = {column["name"]: column for column in inspect(connection).get_columns("photo")}

    assert "description" not in photo_columns
    assert json_array(migrated_photo["description_blocks"]) == [
        {"type": "paragraph", "text": "Dłuższy opis zdjęcia do TTS."}
    ]


def test_legacy_starter_categories_are_archived_and_date_spot_relations_are_migrated(tmp_path: Path) -> None:
    database_path = tmp_path / "legacy-categories.db"
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
        connection.execute(
            text("INSERT INTO alembic_version (version_num) VALUES ('0015_schema_integrity_constraints')")
        )
        connection.execute(
            text(
                """
                CREATE TABLE category (
                    id VARCHAR NOT NULL PRIMARY KEY,
                    label VARCHAR NOT NULL,
                    description VARCHAR,
                    icon VARCHAR,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    status VARCHAR NOT NULL DEFAULT 'active'
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE place_category (
                    place_id VARCHAR NOT NULL,
                    category_id VARCHAR NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (place_id, category_id)
                )
                """
            )
        )
        for category_id in ("date_spot", "coffee", "after_22", "local_classic"):
            connection.execute(
                text(
                    """
                    INSERT INTO category (id, label, description, icon, sort_order, status)
                    VALUES (:id, :label, :description, :icon, :sort_order, 'active')
                    """
                ),
                {
                    "id": category_id,
                    "label": category_id,
                    "description": category_id,
                    "icon": "sparkles",
                    "sort_order": 100,
                },
            )
        connection.execute(
            text(
                """
                INSERT INTO place_category (place_id, category_id, sort_order)
                VALUES ('place-1', 'date_spot', 1)
                """
            )
        )

    command.upgrade(alembic_config(database_url), "head")

    with engine.connect() as connection:
        categories = {
            row["id"]: row
            for row in connection.execute(text("SELECT id, label, icon, sort_order, status FROM category")).mappings()
        }
        place_categories = {
            row["category_id"]
            for row in connection.execute(
                text("SELECT category_id FROM place_category WHERE place_id = 'place-1'")
            ).mappings()
        }

    assert categories["atmospheric_place"]["status"] == "active"
    assert categories["atmospheric_place"]["label"] == "Miejsce z klimatem"
    assert categories["local_classic"]["sort_order"] == 10
    assert categories["date_spot"]["status"] == "archived"
    assert categories["coffee"]["status"] == "archived"
    assert categories["after_22"]["status"] == "archived"
    assert place_categories == {"atmospheric_place"}
