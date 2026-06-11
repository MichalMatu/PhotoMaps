"""Data foundation for multi-city content.

Revision ID: 0004_data_foundation_v2
Revises: 0003_memory_text
Create Date: 2026-06-12
"""

from collections.abc import Iterable

from alembic import op
import sqlalchemy as sa

revision = "0004_data_foundation_v2"
down_revision = "0003_memory_text"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def indexes_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table_name)}


def add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in columns_for(table_name):
        op.add_column(table_name, column)


def create_index_if_missing(name: str, table_name: str, columns: Iterable[str], unique: bool = False) -> None:
    if name not in indexes_for(table_name):
        op.create_index(name, table_name, list(columns), unique=unique)


def create_city_table() -> None:
    if table_exists("city"):
        return
    op.create_table(
        "city",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("default_zoom", sa.Integer(), nullable=False, server_default="13"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
    )
    create_index_if_missing("ix_city_status", "city", ["status"])


def seed_wroclaw_city() -> None:
    op.get_bind().execute(
        sa.text(
            """
            INSERT INTO city (id, name, lat, lon, default_zoom, sort_order, status)
            SELECT 'wroclaw', 'Wrocław', 51.1079, 17.0385, 13, 10, 'active'
            WHERE NOT EXISTS (SELECT 1 FROM city WHERE id = 'wroclaw')
            """
        )
    )


def create_place_category_table() -> None:
    if table_exists("place_category"):
        return
    op.create_table(
        "place_category",
        sa.Column("place_id", sa.String(), sa.ForeignKey("place.id"), primary_key=True),
        sa.Column("category_id", sa.String(), sa.ForeignKey("category.id"), primary_key=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    create_index_if_missing("ix_place_category_category_id", "place_category", ["category_id"])


def migrate_place_category_id() -> None:
    if "category_id" not in columns_for("place"):
        return
    op.get_bind().execute(
        sa.text(
            """
            INSERT OR IGNORE INTO place_category (place_id, category_id, sort_order)
            SELECT id, category_id, 0
            FROM place
            WHERE category_id IS NOT NULL
            """
        )
    )
    with op.batch_alter_table("place") as batch_op:
        batch_op.drop_column("category_id")


def upgrade() -> None:
    create_city_table()
    seed_wroclaw_city()

    if table_exists("place"):
        add_column_if_missing("place", sa.Column("city_id", sa.String(), nullable=False, server_default="wroclaw"))
        create_index_if_missing("ix_place_city_id", "place", ["city_id"])

    create_place_category_table()
    if table_exists("place"):
        migrate_place_category_id()

    if table_exists("photo"):
        add_column_if_missing("photo", sa.Column("role", sa.String(), nullable=False, server_default="gallery"))
        add_column_if_missing("photo", sa.Column("source", sa.String(), nullable=False, server_default="user_upload"))
        create_index_if_missing("ix_photo_role", "photo", ["role"])
        create_index_if_missing("ix_photo_source", "photo", ["source"])


def downgrade() -> None:
    if table_exists("photo"):
        if "source" in columns_for("photo"):
            with op.batch_alter_table("photo") as batch_op:
                batch_op.drop_column("source")
        if "role" in columns_for("photo"):
            with op.batch_alter_table("photo") as batch_op:
                batch_op.drop_column("role")

    if table_exists("place"):
        if "category_id" not in columns_for("place"):
            op.add_column("place", sa.Column("category_id", sa.String(), nullable=True))
        if table_exists("place_category"):
            op.get_bind().execute(
                sa.text(
                    """
                    UPDATE place
                    SET category_id = (
                        SELECT category_id
                        FROM place_category
                        WHERE place_category.place_id = place.id
                        ORDER BY sort_order ASC
                        LIMIT 1
                    )
                    """
                )
            )
        if "city_id" in columns_for("place"):
            with op.batch_alter_table("place") as batch_op:
                batch_op.drop_column("city_id")

    if table_exists("place_category"):
        op.drop_table("place_category")
    if table_exists("city"):
        op.drop_table("city")
