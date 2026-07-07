"""Make pending memory media private until approval.

Revision ID: 0014_memory_private_pending_media
Revises: 0013_content_blocks_for_guides_photos
Create Date: 2026-07-04
"""

from alembic import op
import sqlalchemy as sa

revision = "0014_memory_private_pending_media"
down_revision = "0013_content_blocks_for_guides_photos"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if not table_exists("memory"):
        return

    memory_columns = columns_for("memory")
    with op.batch_alter_table("memory") as batch_op:
        if "public_path" in memory_columns:
            batch_op.alter_column("public_path", existing_type=sa.String(), nullable=True)
        if "thumb_path" in memory_columns:
            batch_op.alter_column("thumb_path", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    if not table_exists("memory"):
        return

    memory_columns = columns_for("memory")
    op.execute("UPDATE memory SET public_path = '' WHERE public_path IS NULL")
    op.execute("UPDATE memory SET thumb_path = '' WHERE thumb_path IS NULL")
    with op.batch_alter_table("memory") as batch_op:
        if "public_path" in memory_columns:
            batch_op.alter_column("public_path", existing_type=sa.String(), nullable=False)
        if "thumb_path" in memory_columns:
            batch_op.alter_column("thumb_path", existing_type=sa.String(), nullable=False)
