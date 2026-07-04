"""Add editorial photo descriptions.

Revision ID: 0012_photo_description
Revises: 0011_photo_attribution
Create Date: 2026-07-01
"""

import sqlalchemy as sa

from alembic import op

revision = "0012_photo_description"
down_revision = "0011_photo_attribution"
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

    if "description" not in columns_for("photo"):
        with op.batch_alter_table("photo") as batch_op:
            batch_op.add_column(sa.Column("description", sa.String(length=1200), nullable=True))


def downgrade() -> None:
    if not table_exists("photo"):
        return

    if "description" in columns_for("photo"):
        with op.batch_alter_table("photo") as batch_op:
            batch_op.drop_column("description")
