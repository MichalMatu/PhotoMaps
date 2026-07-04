"""Retire public user-upload photo source.

Revision ID: 0010_editorial_photo_source
Revises: 0009_guide_route_points
Create Date: 2026-06-21
"""

import sqlalchemy as sa

from alembic import op

revision = "0010_editorial_photo_source"
down_revision = "0009_guide_route_points"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if not table_exists("photo") or "source" not in columns_for("photo"):
        return

    op.get_bind().execute(sa.text("UPDATE photo SET source = 'editorial' WHERE source = 'user_upload'"))
    with op.batch_alter_table("photo") as batch_op:
        batch_op.alter_column("source", existing_type=sa.String(), server_default="editorial")


def downgrade() -> None:
    if not table_exists("photo") or "source" not in columns_for("photo"):
        return

    with op.batch_alter_table("photo") as batch_op:
        batch_op.alter_column("source", existing_type=sa.String(), server_default="user_upload")
