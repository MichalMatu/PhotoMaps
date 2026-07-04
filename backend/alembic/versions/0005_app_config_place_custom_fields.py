"""Add custom fields to places.

Revision ID: 0005_app_config_place_custom_fields
Revises: 0004_data_foundation_v2
Create Date: 2026-06-18
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_app_config_place_custom_fields"
down_revision = "0004_data_foundation_v2"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if "custom_fields" not in columns_for("place"):
        op.add_column("place", sa.Column("custom_fields", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade() -> None:
    if "custom_fields" in columns_for("place"):
        with op.batch_alter_table("place") as batch_op:
            batch_op.drop_column("custom_fields")
