"""Add explicit city region.

Revision ID: 0018_city_region
Revises: 0017_guide_kind
Create Date: 2026-07-05
"""

from alembic import op
import sqlalchemy as sa

revision = "0018_city_region"
down_revision = "0017_guide_kind"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if not table_exists("city") or "region" in columns_for("city"):
        return

    op.add_column("city", sa.Column("region", sa.String(), nullable=False, server_default="Dolnośląskie"))
    op.get_bind().execute(sa.text("UPDATE city SET region = 'Dolnośląskie' WHERE region IS NULL OR region = ''"))


def downgrade() -> None:
    if not table_exists("city") or "region" not in columns_for("city"):
        return

    with op.batch_alter_table("city") as batch_op:
        batch_op.drop_column("region")
