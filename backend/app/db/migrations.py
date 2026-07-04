from alembic import command
from alembic.config import Config
from app.core.config import BASE_DIR, DATABASE_URL


def alembic_config() -> Config:
    config = Config(str(BASE_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BASE_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", DATABASE_URL)
    return config


def run_migrations() -> None:
    command.upgrade(alembic_config(), "head")
