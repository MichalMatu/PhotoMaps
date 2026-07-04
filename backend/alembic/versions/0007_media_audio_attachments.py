"""Add optional audio attachments to media.

Revision ID: 0007_media_audio_attachments
Revises: 0006_app_config_table
Create Date: 2026-06-18
"""

import sqlalchemy as sa

from alembic import op

revision = "0007_media_audio_attachments"
down_revision = "0006_app_config_table"
branch_labels = None
depends_on = None

AUDIO_COLUMNS = (
    ("audio_original_path", sa.String()),
    ("audio_public_path", sa.String()),
    ("audio_mime_type", sa.String()),
    ("audio_size_bytes", sa.Integer()),
    ("audio_duration_seconds", sa.Float()),
)


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def add_audio_columns(table_name: str) -> None:
    existing_columns = columns_for(table_name)
    for column_name, column_type in AUDIO_COLUMNS:
        if column_name not in existing_columns:
            op.add_column(table_name, sa.Column(column_name, column_type, nullable=True))


def drop_audio_columns(table_name: str) -> None:
    existing_columns = columns_for(table_name)
    with op.batch_alter_table(table_name) as batch_op:
        for column_name, _column_type in reversed(AUDIO_COLUMNS):
            if column_name in existing_columns:
                batch_op.drop_column(column_name)


def upgrade() -> None:
    for table_name in ("photo", "memory"):
        if table_exists(table_name):
            add_audio_columns(table_name)


def downgrade() -> None:
    for table_name in ("photo", "memory"):
        if table_exists(table_name):
            drop_audio_columns(table_name)
