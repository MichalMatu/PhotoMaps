"""Add content blocks for guides and photos.

Revision ID: 0013_content_blocks_for_guides_photos
Revises: 0012_photo_description
Create Date: 2026-07-02
"""

from __future__ import annotations

import json

import sqlalchemy as sa

from alembic import op

revision = "0013_content_blocks_for_guides_photos"
down_revision = "0012_photo_description"
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()

    if table_exists("guide") and "article_blocks" not in columns_for("guide"):
        op.add_column(
            "guide",
            sa.Column("article_blocks", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        )

    if table_exists("photo") and "description_blocks" not in columns_for("photo"):
        op.add_column(
            "photo",
            sa.Column("description_blocks", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        )
        if "description" in columns_for("photo"):
            rows = bind.execute(
                sa.text("SELECT id, description FROM photo WHERE description IS NOT NULL AND TRIM(description) != ''")
            )
            for photo_id, description in rows:
                bind.execute(
                    sa.text("UPDATE photo SET description_blocks = :blocks WHERE id = :photo_id"),
                    {
                        "blocks": json.dumps([{"type": "paragraph", "text": str(description).strip()}]),
                        "photo_id": photo_id,
                    },
                )


def downgrade() -> None:
    if table_exists("photo") and "description_blocks" in columns_for("photo"):
        with op.batch_alter_table("photo") as batch_op:
            batch_op.drop_column("description_blocks")

    if table_exists("guide") and "article_blocks" in columns_for("guide"):
        with op.batch_alter_table("guide") as batch_op:
            batch_op.drop_column("article_blocks")
