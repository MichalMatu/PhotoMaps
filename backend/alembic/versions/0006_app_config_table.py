"""Store app configuration in the database.

Revision ID: 0006_app_config_table
Revises: 0005_app_config_place_custom_fields
Create Date: 2026-06-18
"""

from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision = "0006_app_config_table"
down_revision = "0005_app_config_place_custom_fields"
branch_labels = None
depends_on = None

DEFAULT_LABELS = {
    "place": "miejsce",
    "places": "miejsca",
    "category": "kategoria",
    "categories": "kategorie",
    "guide": "kolekcja miejsc",
    "guides": "kolekcje miejsc",
}

BOOTSTRAP_PLACE_CUSTOM_FIELDS = [
    {
        "key": "opening_hours",
        "label": "Godziny otwarcia",
        "type": "text",
        "required": False,
        "public": True,
        "options": None,
        "sort_order": 10,
    },
    {
        "key": "floor",
        "label": "Piętro",
        "type": "text",
        "required": False,
        "public": True,
        "options": None,
        "sort_order": 20,
    },
    {
        "key": "price",
        "label": "Cena",
        "type": "number",
        "required": False,
        "public": True,
        "options": None,
        "sort_order": 30,
    },
    {
        "key": "booking_url",
        "label": "Link rezerwacji",
        "type": "url",
        "required": False,
        "public": True,
        "options": None,
        "sort_order": 40,
    },
    {
        "key": "accessibility",
        "label": "Dostępność",
        "type": "select",
        "required": False,
        "public": True,
        "options": ["pełna", "częściowa", "brak informacji"],
        "sort_order": 50,
    },
    {
        "key": "contact",
        "label": "Kontakt",
        "type": "text",
        "required": False,
        "public": True,
        "options": None,
        "sort_order": 60,
    },
]


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def upgrade() -> None:
    if not table_exists("app_config"):
        op.create_table(
            "app_config",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("product_name", sa.String(), nullable=False),
            sa.Column("locale", sa.String(), nullable=False),
            sa.Column("labels", sa.JSON(), nullable=False),
            sa.Column("branding", sa.JSON(), nullable=False),
            sa.Column("map_config", sa.JSON(), nullable=False),
            sa.Column("place_custom_fields", sa.JSON(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    app_config_table = sa.table(
        "app_config",
        sa.column("id", sa.String()),
        sa.column("product_name", sa.String()),
        sa.column("locale", sa.String()),
        sa.column("labels", sa.JSON()),
        sa.column("branding", sa.JSON()),
        sa.column("map_config", sa.JSON()),
        sa.column("place_custom_fields", sa.JSON()),
        sa.column("updated_at", sa.DateTime()),
    )
    existing = op.get_bind().execute(sa.text("SELECT id FROM app_config WHERE id = 'default'")).first()
    if existing is None:
        op.bulk_insert(
            app_config_table,
            [
                {
                    "id": "default",
                    "product_name": "PhotoMap",
                    "locale": "pl-PL",
                    "labels": DEFAULT_LABELS,
                    "branding": {"primary_color": "#2563eb", "logo_url": None},
                    "map_config": {"fallback_center": {"lat": 52.0, "lon": 19.0}, "fallback_zoom": 13},
                    "place_custom_fields": BOOTSTRAP_PLACE_CUSTOM_FIELDS,
                    "updated_at": datetime.now(UTC),
                }
            ],
        )


def downgrade() -> None:
    if table_exists("app_config"):
        op.drop_table("app_config")
