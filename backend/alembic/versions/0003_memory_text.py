"""Add memory text.

Revision ID: 0003_memory_text
Revises: 0002_memory_claim_token
Create Date: 2026-06-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_memory_text"
down_revision = "0002_memory_claim_token"
branch_labels = None
depends_on = None


def memory_columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("memory")}


def upgrade() -> None:
    if "memory_text" not in memory_columns():
        op.execute(sa.text("DROP TABLE IF EXISTS _alembic_tmp_memory"))
        op.execute(sa.text("DELETE FROM memory"))
        op.execute(sa.text("UPDATE place SET memory_count = 0"))
        with op.batch_alter_table("memory", recreate="always") as batch_op:
            batch_op.add_column(sa.Column("memory_text", sa.String(length=240), nullable=False))


def downgrade() -> None:
    if "memory_text" in memory_columns():
        op.drop_column("memory", "memory_text")
