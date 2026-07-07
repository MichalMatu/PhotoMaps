"""Initial MVP schema.

Revision ID: 0001_initial_mvp
Revises:
Create Date: 2026-06-10
"""

from collections.abc import Iterable

from alembic import op
import sqlalchemy as sa

revision = "0001_initial_mvp"
down_revision = None
branch_labels = None
depends_on = None

STARTER_CATEGORIES = [
    ("local_classic", "Lokalny klasyk", "Miejsca mocno związane z miastem i jego pamięcią.", "landmark", 10),
    ("atmospheric_place", "Miejsce z klimatem", "Nastrojowe miejsca dobre do zdjęć, spaceru i opowieści.", "sparkles", 20),
    ("viewpoint", "Punkt widokowy", "Miejsca z dobrym kadrem na miasto.", "binoculars", 30),
    ("hidden_gem", "Ukryta perła", "Miejsca poza oczywistą trasą.", "sparkles", 40),
    ("mural", "Mural", "Sztuka uliczna i ściany z historią.", "palette", 50),
]


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in columns_for(table_name):
        op.add_column(table_name, column)


def create_index_if_missing(name: str, table_name: str, columns: Iterable[str], unique: bool = False) -> None:
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table_name)}
    if name not in indexes:
        op.create_index(name, table_name, list(columns), unique=unique)


def create_category_table() -> None:
    op.create_table(
        "category",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
    )
    create_index_if_missing("ix_category_status", "category", ["status"])


def create_place_table() -> None:
    op.create_table(
        "place",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("local_comment", sa.String(), nullable=True),
        sa.Column("category_id", sa.String(), sa.ForeignKey("category.id"), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("photo_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("memory_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cover_photo_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_place_slug", "place", ["slug"], unique=True)
    create_index_if_missing("ix_place_status", "place", ["status"])


def create_photo_table() -> None:
    op.create_table(
        "photo",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("place_id", sa.String(), sa.ForeignKey("place.id"), nullable=False),
        sa.Column("original_path", sa.String(), nullable=False),
        sa.Column("public_path", sa.String(), nullable=False),
        sa.Column("thumb_path", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("caption", sa.String(), nullable=True),
        sa.Column("consent_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    create_index_if_missing("ix_photo_place_id", "photo", ["place_id"])
    create_index_if_missing("ix_photo_status", "photo", ["status"])


def create_memory_table() -> None:
    op.create_table(
        "memory",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("place_id", sa.String(), sa.ForeignKey("place.id"), nullable=False),
        sa.Column("author_name", sa.String(), nullable=True),
        sa.Column("author_city", sa.String(), nullable=True),
        sa.Column("caption", sa.String(), nullable=False),
        sa.Column("memory_text", sa.String(length=240), nullable=False),
        sa.Column("original_path", sa.String(), nullable=False),
        sa.Column("public_path", sa.String(), nullable=False),
        sa.Column("thumb_path", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("paid", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("share_slug", sa.String(), nullable=False),
        sa.Column("consent_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("claim_token_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    create_index_if_missing("ix_memory_place_id", "memory", ["place_id"])
    create_index_if_missing("ix_memory_share_slug", "memory", ["share_slug"], unique=True)
    create_index_if_missing("ix_memory_status", "memory", ["status"])


def create_guide_tables() -> None:
    op.create_table(
        "guide",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="route"),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_guide_slug", "guide", ["slug"], unique=True)
    create_index_if_missing("ix_guide_kind", "guide", ["kind"])
    create_index_if_missing("ix_guide_status", "guide", ["status"])

    op.create_table(
        "place_guide",
        sa.Column("guide_id", sa.String(), sa.ForeignKey("guide.id"), primary_key=True),
        sa.Column("place_id", sa.String(), sa.ForeignKey("place.id"), primary_key=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )


def create_report_table() -> None:
    op.create_table(
        "report",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("target_type", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_report_target_type", "report", ["target_type"])
    create_index_if_missing("ix_report_target_id", "report", ["target_id"])
    create_index_if_missing("ix_report_status", "report", ["status"])


def seed_categories() -> None:
    connection = op.get_bind()
    for category_id, label, description, icon, sort_order in STARTER_CATEGORIES:
        connection.execute(
            sa.text(
                """
                INSERT INTO category (id, label, description, icon, sort_order, status)
                SELECT :id, :label, :description, :icon, :sort_order, 'active'
                WHERE NOT EXISTS (SELECT 1 FROM category WHERE id = :id)
                """
            ),
            {
                "id": category_id,
                "label": label,
                "description": description,
                "icon": icon,
                "sort_order": sort_order,
            },
        )


def upgrade() -> None:
    if not table_exists("category"):
        create_category_table()
    if not table_exists("place"):
        create_place_table()
    if not table_exists("photo"):
        create_photo_table()
    else:
        add_column_if_missing(
            "photo",
            sa.Column("consent_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if not table_exists("memory"):
        create_memory_table()
    if not table_exists("guide"):
        create_guide_tables()
    elif not table_exists("place_guide"):
        op.create_table(
            "place_guide",
            sa.Column("guide_id", sa.String(), sa.ForeignKey("guide.id"), primary_key=True),
            sa.Column("place_id", sa.String(), sa.ForeignKey("place.id"), primary_key=True),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        )
    if not table_exists("report"):
        create_report_table()

    seed_categories()


def downgrade() -> None:
    op.drop_table("report")
    op.drop_table("place_guide")
    op.drop_table("guide")
    op.drop_table("memory")
    if "consent_confirmed" in columns_for("photo"):
        op.drop_column("photo", "consent_confirmed")
