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


def claim_token_column() -> dict[str, object] | None:
    inspector = sa.inspect(op.get_bind())
    for column in inspector.get_columns("memory"):
        if column["name"] == "claim_token_hash":
            return column
    return None


def upgrade() -> None:
    column = claim_token_column()
    if column is None:
        op.add_column("memory", sa.Column("claim_token_hash", sa.String(), nullable=False, server_default=""))
        column = claim_token_column()

    if column is not None and column.get("default") is not None:
        with op.batch_alter_table("memory", recreate="always") as batch_op:
            batch_op.alter_column("claim_token_hash", existing_type=sa.String(), nullable=False, server_default=None)


def downgrade() -> None:
    if claim_token_column() is not None:
        with op.batch_alter_table("memory", recreate="always") as batch_op:
            batch_op.drop_column("claim_token_hash")
