"""Remove legacy photo description and venue starter categories.

Revision ID: 0016_remove_photo_description_and_legacy_categories
Revises: 0015_schema_integrity_constraints
Create Date: 2026-07-04
"""

from __future__ import annotations

import json

from alembic import op
import sqlalchemy as sa

revision = "0016_remove_photo_description_and_legacy_categories"
down_revision = "0015_schema_integrity_constraints"
branch_labels = None
depends_on = None

CURRENT_CATEGORIES = [
    ("local_classic", "Lokalny klasyk", "Miejsca mocno związane z miastem i jego pamięcią.", "landmark", 10),
    ("atmospheric_place", "Miejsce z klimatem", "Nastrojowe miejsca dobre do zdjęć, spaceru i opowieści.", "sparkles", 20),
    ("viewpoint", "Punkt widokowy", "Miejsca z dobrym kadrem na miasto.", "binoculars", 30),
    ("hidden_gem", "Ukryta perła", "Miejsca poza oczywistą trasą.", "sparkles", 40),
    ("mural", "Mural", "Sztuka uliczna i ściany z historią.", "palette", 50),
]

LEGACY_CATEGORY_IDS = (
    "bar_mleczny",
    "street_food",
    "coffee",
    "cheap_food",
    "date_spot",
    "rainy_day",
    "after_22",
)


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def columns_for(table_name: str) -> set[str]:
    if not table_exists(table_name):
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def parse_blocks(value: object) -> list[dict[str, str]]:
    if isinstance(value, list):
        return [block for block in value if isinstance(block, dict)]
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []
        if isinstance(parsed, list):
            return [block for block in parsed if isinstance(block, dict)]
    return []


def migrate_photo_description_blocks() -> None:
    if not table_exists("photo"):
        return

    photo_columns = columns_for("photo")
    if "description_blocks" not in photo_columns:
        op.add_column(
            "photo",
            sa.Column("description_blocks", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        )
        photo_columns = columns_for("photo")

    if "description" not in photo_columns:
        return

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT id, description, description_blocks
            FROM photo
            WHERE description IS NOT NULL AND TRIM(description) != ''
            """
        )
    ).mappings()
    for row in rows:
        existing_blocks = parse_blocks(row["description_blocks"])
        if existing_blocks:
            continue
        connection.execute(
            sa.text("UPDATE photo SET description_blocks = :blocks WHERE id = :photo_id"),
            {
                "blocks": json.dumps([{"type": "paragraph", "text": str(row["description"]).strip()}]),
                "photo_id": row["id"],
            },
        )

    with op.batch_alter_table("photo") as batch_op:
        batch_op.drop_column("description")


def upsert_current_categories() -> None:
    if not table_exists("category"):
        return

    connection = op.get_bind()
    for category_id, label, description, icon, sort_order in CURRENT_CATEGORIES:
        connection.execute(
            sa.text(
                """
                INSERT INTO category (id, label, description, icon, sort_order, status)
                VALUES (:id, :label, :description, :icon, :sort_order, 'active')
                ON CONFLICT(id) DO UPDATE SET
                    label = excluded.label,
                    description = excluded.description,
                    icon = excluded.icon,
                    sort_order = excluded.sort_order,
                    status = 'active'
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


def migrate_place_category_relations() -> None:
    if not table_exists("place_category"):
        return

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            INSERT OR IGNORE INTO place_category (place_id, category_id, sort_order)
            SELECT place_id, 'atmospheric_place', sort_order
            FROM place_category
            WHERE category_id = 'date_spot'
            """
        )
    )
    connection.execute(sa.text("DELETE FROM place_category WHERE category_id = 'date_spot'"))


def archive_legacy_categories() -> None:
    if not table_exists("category"):
        return

    op.get_bind().execute(
        sa.text(
            """
            UPDATE category
            SET status = 'archived'
            WHERE id IN :category_ids
            """
        ).bindparams(sa.bindparam("category_ids", expanding=True)),
        {"category_ids": LEGACY_CATEGORY_IDS},
    )


def upgrade() -> None:
    migrate_photo_description_blocks()
    upsert_current_categories()
    migrate_place_category_relations()
    archive_legacy_categories()


def downgrade() -> None:
    if table_exists("photo") and "description" not in columns_for("photo"):
        op.add_column("photo", sa.Column("description", sa.String(length=1200), nullable=True))

    if table_exists("category"):
        op.get_bind().execute(
            sa.text(
                """
                UPDATE category
                SET status = 'active'
                WHERE id IN :category_ids
                """
            ).bindparams(sa.bindparam("category_ids", expanding=True)),
            {"category_ids": LEGACY_CATEGORY_IDS},
        )
