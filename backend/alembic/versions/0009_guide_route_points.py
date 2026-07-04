"""Add optional route geometry to guides.

Revision ID: 0009_guide_route_points
Revises: 0008_place_article_blocks
Create Date: 2026-06-20
"""

import sqlalchemy as sa

from alembic import op

revision = "0009_guide_route_points"
down_revision = "0008_place_article_blocks"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if table_exists("guide") and "route_points" not in columns_for("guide"):
        op.add_column(
            "guide",
            sa.Column("route_points", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        )


def downgrade() -> None:
    if "route_points" in columns_for("guide"):
        with op.batch_alter_table("guide") as batch_op:
            batch_op.drop_column("route_points")
