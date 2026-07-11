"""Make pending and rejected photo media private.

Revision ID: 0020_photo_private_pending_media
Revises: 0019_app_config_map_settings
Create Date: 2026-07-11
"""

import sqlalchemy as sa

from alembic import op

revision = "0020_photo_private_pending_media"
down_revision = "0019_app_config_map_settings"
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

    photo_columns = columns_for("photo")
    with op.batch_alter_table("photo") as batch_op:
        if "public_path" in photo_columns:
            batch_op.alter_column("public_path", existing_type=sa.String(), nullable=True)
        if "thumb_path" in photo_columns:
            batch_op.alter_column("thumb_path", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    if not table_exists("photo"):
        return

    photo_columns = columns_for("photo")
    op.execute("UPDATE photo SET public_path = '' WHERE public_path IS NULL")
    op.execute("UPDATE photo SET thumb_path = '' WHERE thumb_path IS NULL")
    with op.batch_alter_table("photo") as batch_op:
        if "public_path" in photo_columns:
            batch_op.alter_column("public_path", existing_type=sa.String(), nullable=False)
        if "thumb_path" in photo_columns:
            batch_op.alter_column("thumb_path", existing_type=sa.String(), nullable=False)
