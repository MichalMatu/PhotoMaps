"""Add runtime map display settings.

Revision ID: 0019_app_config_map_settings
Revises: 0018_city_region
Create Date: 2026-07-06
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from copy import deepcopy
from typing import Any

from alembic import op
import sqlalchemy as sa

revision = "0019_app_config_map_settings"
down_revision = "0018_city_region"
branch_labels = None
depends_on = None

DEFAULT_MARKER_SCALE = {
    "base_size": {"width": 72, "height": 58},
    "min_render_scale": 0.55,
    "max_render_scale": 1.9,
    "priority": {"min_scale": 0.72, "max_scale": 1.9, "curve": 1.12},
}
DEFAULT_MARKER_DENSITY = {
    "marker_viewport_area": 18_000,
    "min_zoom": 6,
    "full_density_zoom": 15,
    "min_zoom_fill_ratio": 0.12,
    "max_zoom_fill_ratio": 1,
    "zoom_curve": 1.35,
}
DEFAULT_MARKER_PRIORITY = {
    "editorial_weight_multiplier": 12,
    "photo_count_sqrt_multiplier": 3.2,
    "memory_count_multiplier": 2,
    "score_multiplier": 0.28,
}


def table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def parse_json(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        parsed = json.loads(value)
        return dict(parsed) if isinstance(parsed, Mapping) else {}
    return dict(value) if isinstance(value, Mapping) else {}


def merge_defaults(value: Any, defaults: Mapping[str, Any]) -> dict[str, Any]:
    current = dict(value) if isinstance(value, Mapping) else {}
    merged = deepcopy(current)
    for key, default_value in defaults.items():
        if isinstance(default_value, Mapping):
            merged[key] = merge_defaults(merged.get(key), default_value)
        else:
            merged.setdefault(key, default_value)
    return merged


def upgrade() -> None:
    if not table_exists("app_config"):
        return

    app_config_table = sa.table(
        "app_config",
        sa.column("id", sa.String()),
        sa.column("map_config", sa.JSON()),
    )
    connection = op.get_bind()
    for row in connection.execute(sa.select(app_config_table.c.id, app_config_table.c.map_config)).mappings():
        map_config = parse_json(row["map_config"])
        map_config["marker_scale"] = merge_defaults(map_config.get("marker_scale"), DEFAULT_MARKER_SCALE)
        map_config["marker_density"] = merge_defaults(map_config.get("marker_density"), DEFAULT_MARKER_DENSITY)
        map_config["marker_priority"] = merge_defaults(map_config.get("marker_priority"), DEFAULT_MARKER_PRIORITY)
        connection.execute(
            app_config_table.update()
            .where(app_config_table.c.id == row["id"])
            .values(map_config=map_config)
        )


def downgrade() -> None:
    if not table_exists("app_config"):
        return

    app_config_table = sa.table(
        "app_config",
        sa.column("id", sa.String()),
        sa.column("map_config", sa.JSON()),
    )
    connection = op.get_bind()
    for row in connection.execute(sa.select(app_config_table.c.id, app_config_table.c.map_config)).mappings():
        map_config = parse_json(row["map_config"])
        map_config.pop("marker_scale", None)
        map_config.pop("marker_density", None)
        map_config.pop("marker_priority", None)
        connection.execute(
            app_config_table.update()
            .where(app_config_table.c.id == row["id"])
            .values(map_config=map_config)
        )
