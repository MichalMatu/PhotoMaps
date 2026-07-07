"""Add guide kind for routes and collections.

Revision ID: 0017_guide_kind
Revises: 0016_remove_photo_description_and_legacy_categories
Create Date: 2026-07-04
"""

from collections.abc import Iterable

from alembic import op
import sqlalchemy as sa

revision = "0017_guide_kind"
down_revision = "0016_remove_photo_description_and_legacy_categories"
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


def create_index_if_missing(name: str, table_name: str, columns: Iterable[str], unique: bool = False) -> None:
    if name not in indexes_for(table_name):
        op.create_index(name, table_name, list(columns), unique=unique)


def drop_index_if_exists(name: str, table_name: str) -> None:
    if name in indexes_for(table_name):
        op.drop_index(name, table_name=table_name)


def upgrade() -> None:
    if not table_exists("guide"):
        return

    if "kind" not in columns_for("guide"):
        op.add_column("guide", sa.Column("kind", sa.String(), nullable=False, server_default="route"))
    op.get_bind().execute(
        sa.text(
            """
            UPDATE guide
            SET kind = 'route'
            WHERE kind IS NULL OR kind NOT IN ('route', 'collection')
            """
        )
    )
    create_index_if_missing("ix_guide_kind", "guide", ["kind"])


def downgrade() -> None:
    if not table_exists("guide"):
        return

    drop_index_if_exists("ix_guide_kind", "guide")
    if "kind" in columns_for("guide"):
        with op.batch_alter_table("guide") as batch_op:
            batch_op.drop_column("kind")
