from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest

MIGRATION_PATH = (
    Path(__file__).resolve().parents[3]
    / "alembic"
    / "versions"
    / "0021_nullable_rejected_original_path.py"
)


def load_migration_module():
    spec = spec_from_file_location("nullable_original_path_migration", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_downgrade_refuses_to_invent_paths_for_purged_originals(monkeypatch) -> None:
    migration = load_migration_module()
    monkeypatch.setattr(migration, "columns_for", lambda _table_name: {"original_path"})
    monkeypatch.setattr(
        migration,
        "null_original_path_count",
        lambda table_name: 1 if table_name == "photo" else 0,
    )

    def forbidden_batch_alter_table(_table_name):
        raise AssertionError("schema alteration must not start when purged originals exist")

    monkeypatch.setattr(migration.op, "batch_alter_table", forbidden_batch_alter_table)

    with pytest.raises(
        RuntimeError,
        match=r"Cannot downgrade 0021: photo has 1 rows with purged original_path",
    ):
        migration.downgrade()
