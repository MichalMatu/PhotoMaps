"""Enforce core schema integrity constraints.

Revision ID: 0015_schema_integrity_constraints
Revises: 0014_memory_private_pending_media
Create Date: 2026-07-04
"""

from collections.abc import Iterable

from alembic import op
import sqlalchemy as sa

revision = "0015_schema_integrity_constraints"
down_revision = "0014_memory_private_pending_media"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def indexes_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table_name)}


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in columns_for(table_name):
        op.add_column(table_name, column)


def create_index_if_missing(name: str, table_name: str, columns: Iterable[str], unique: bool = False) -> None:
    if name not in indexes_for(table_name):
        op.create_index(name, table_name, list(columns), unique=unique)


def drop_index_if_exists(name: str, table_name: str) -> None:
    if name in indexes_for(table_name):
        op.drop_index(name, table_name=table_name)


def foreign_keys_for(table_name: str) -> list[dict]:
    if not table_exists(table_name):
        return []
    return sa.inspect(op.get_bind()).get_foreign_keys(table_name)


def foreign_key_exists(
    table_name: str,
    columns: tuple[str, ...],
    referred_table: str,
    referred_columns: tuple[str, ...],
) -> bool:
    return any(
        tuple(foreign_key["constrained_columns"]) == columns
        and foreign_key["referred_table"] == referred_table
        and tuple(foreign_key["referred_columns"]) == referred_columns
        for foreign_key in foreign_keys_for(table_name)
    )


def foreign_key_names(
    table_name: str,
    columns: tuple[str, ...],
    referred_table: str,
    referred_columns: tuple[str, ...],
) -> list[str]:
    return [
        foreign_key["name"]
        for foreign_key in foreign_keys_for(table_name)
        if foreign_key["name"]
        and tuple(foreign_key["constrained_columns"]) == columns
        and foreign_key["referred_table"] == referred_table
        and tuple(foreign_key["referred_columns"]) == referred_columns
    ]


def clean_place_references() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE place
            SET city_id = 'wroclaw'
            WHERE city_id IS NULL
               OR NOT EXISTS (SELECT 1 FROM city WHERE city.id = place.city_id)
            """
        )
    )
    if table_exists("photo") and "cover_photo_id" in columns_for("place"):
        connection.execute(
            sa.text(
                """
                UPDATE place
                SET cover_photo_id = NULL
                WHERE cover_photo_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM photo WHERE photo.id = place.cover_photo_id)
                """
            )
        )


def upgrade() -> None:
    if table_exists("place"):
        add_column_if_missing("place", sa.Column("cover_photo_id", sa.String(), nullable=True))
        clean_place_references()
        needs_city_fk = not foreign_key_exists("place", ("city_id",), "city", ("id",))
        needs_cover_fk = table_exists("photo") and not foreign_key_exists(
            "place", ("cover_photo_id",), "photo", ("id",)
        )
        if needs_city_fk or needs_cover_fk:
            with op.batch_alter_table("place") as batch_op:
                if needs_city_fk:
                    batch_op.create_foreign_key("fk_place_city_id_city", "city", ["city_id"], ["id"])
                if needs_cover_fk:
                    batch_op.create_foreign_key("fk_place_cover_photo_id_photo", "photo", ["cover_photo_id"], ["id"])
        create_index_if_missing("ix_place_cover_photo_id", "place", ["cover_photo_id"])

    if table_exists("place_guide"):
        create_index_if_missing("ix_place_guide_place_id", "place_guide", ["place_id"])


def downgrade() -> None:
    if table_exists("place_guide"):
        drop_index_if_exists("ix_place_guide_place_id", "place_guide")

    if table_exists("place"):
        drop_index_if_exists("ix_place_cover_photo_id", "place")
        city_fk_names = foreign_key_names("place", ("city_id",), "city", ("id",))
        cover_fk_names = foreign_key_names("place", ("cover_photo_id",), "photo", ("id",))
        if city_fk_names or cover_fk_names:
            with op.batch_alter_table("place") as batch_op:
                for foreign_key_name in city_fk_names + cover_fk_names:
                    batch_op.drop_constraint(foreign_key_name, type_="foreignkey")
