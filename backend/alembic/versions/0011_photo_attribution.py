"""Add photo attribution fields.

Revision ID: 0011_photo_attribution
Revises: 0010_editorial_photo_source
Create Date: 2026-06-22
"""

import sqlalchemy as sa

from alembic import op

revision = "0011_photo_attribution"
down_revision = "0010_editorial_photo_source"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if not table_exists("photo"):
        return

    existing_columns = columns_for("photo")
    new_columns = [
        ("attribution_author", sa.Column("attribution_author", sa.String(length=120), nullable=True)),
        ("attribution_source_url", sa.Column("attribution_source_url", sa.String(length=500), nullable=True)),
        ("attribution_license", sa.Column("attribution_license", sa.String(length=120), nullable=True)),
        ("attribution_license_url", sa.Column("attribution_license_url", sa.String(length=500), nullable=True)),
    ]
    with op.batch_alter_table("photo") as batch_op:
        for column_name, column in new_columns:
            if column_name not in existing_columns:
                batch_op.add_column(column)


def downgrade() -> None:
    if not table_exists("photo"):
        return

    existing_columns = columns_for("photo")
    with op.batch_alter_table("photo") as batch_op:
        for column_name in (
            "attribution_license_url",
            "attribution_license",
            "attribution_source_url",
            "attribution_author",
        ):
            if column_name in existing_columns:
                batch_op.drop_column(column_name)
