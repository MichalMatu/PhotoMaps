"""Allow rejected media original paths to be cleared after retention.

Revision ID: 0021_nullable_rejected_original_path
Revises: 0020_photo_private_pending_media
Create Date: 2026-09-12
"""

import sqlalchemy as sa
from alembic import op

revision = "0021_nullable_rejected_original_path"
down_revision = "0020_photo_private_pending_media"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    for table_name in ("photo", "memory"):
        columns = columns_for(table_name)
        if "original_path" not in columns:
            continue
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.alter_column("original_path", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    for table_name in ("photo", "memory"):
        columns = columns_for(table_name)
        if "original_path" not in columns:
            continue
        op.execute(
            sa.text(
                f"UPDATE {table_name} "
                "SET original_path = '__retained__/deleted-original' "
                "WHERE original_path IS NULL"
            )
        )
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.alter_column("original_path", existing_type=sa.String(), nullable=False)
