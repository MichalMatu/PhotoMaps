"""Add structured article blocks to places.

Revision ID: 0008_place_article_blocks
Revises: 0007_media_audio_attachments
Create Date: 2026-06-19
"""

import sqlalchemy as sa

from alembic import op

revision = "0008_place_article_blocks"
down_revision = "0007_media_audio_attachments"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if "article_blocks" not in columns_for("place"):
        op.add_column(
            "place",
            sa.Column("article_blocks", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        )


def downgrade() -> None:
    if "article_blocks" in columns_for("place"):
        with op.batch_alter_table("place") as batch_op:
            batch_op.drop_column("article_blocks")
