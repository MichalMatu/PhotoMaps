"""Add memory claim token hash.

Revision ID: 0002_memory_claim_token
Revises: 0001_initial_mvp
Create Date: 2026-06-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_memory_claim_token"
down_revision = "0001_initial_mvp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("memory")}
    if "claim_token_hash" not in columns:
        op.add_column("memory", sa.Column("claim_token_hash", sa.String(), nullable=False, server_default=""))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("memory")}
    if "claim_token_hash" in columns:
        with op.batch_alter_table("memory", recreate="always") as batch_op:
            batch_op.drop_column("claim_token_hash")
