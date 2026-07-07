from sqlalchemy import Engine, inspect, text
from sqlmodel import SQLModel

from app import models as _models  # noqa: F401


def _column_signature(columns: list) -> tuple[str, ...]:
    return tuple(column.name for column in columns)


def _index_label(columns: tuple[str, ...], unique: bool) -> str:
    prefix = "unique index" if unique else "index"
    return f"{prefix} {', '.join(columns)}"


def _foreign_key_label(columns: tuple[str, ...], referred_table: str, referred_columns: tuple[str, ...]) -> str:
    return f"{', '.join(columns)} -> {referred_table}.{', '.join(referred_columns)}"


def database_schema_errors(target_engine: Engine) -> list[str]:
    schema_errors: list[str] = []

    with target_engine.connect() as connection:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())

        for table_name, table in SQLModel.metadata.tables.items():
            if table_name not in table_names:
                schema_errors.append(f"{table_name}: missing table")
                continue

            database_columns = {column["name"] for column in inspector.get_columns(table_name)}
            model_columns = set(table.columns.keys())
            extra_columns = sorted(database_columns - model_columns)
            missing_columns = sorted(model_columns - database_columns)

            if extra_columns:
                schema_errors.append(f"{table_name}: extra columns {', '.join(extra_columns)}")
            if missing_columns:
                schema_errors.append(f"{table_name}: missing columns {', '.join(missing_columns)}")

            database_indexes = {
                (tuple(index["column_names"]), bool(index.get("unique")))
                for index in inspector.get_indexes(table_name)
                if index.get("column_names")
            }
            model_indexes = {
                (_column_signature(list(index.columns)), bool(index.unique))
                for index in table.indexes
                if list(index.columns)
            }
            for columns, unique in sorted(model_indexes - database_indexes):
                schema_errors.append(f"{table_name}: missing {_index_label(columns, unique)}")

            database_foreign_keys = {
                (
                    tuple(foreign_key["constrained_columns"]),
                    foreign_key["referred_table"],
                    tuple(foreign_key["referred_columns"]),
                )
                for foreign_key in inspector.get_foreign_keys(table_name)
            }
            model_foreign_keys = {
                (
                    _column_signature(list(constraint.columns)),
                    next(iter(constraint.elements)).column.table.name,
                    tuple(element.column.name for element in constraint.elements),
                )
                for constraint in table.foreign_key_constraints
            }
            for columns, referred_table, referred_columns in sorted(model_foreign_keys - database_foreign_keys):
                schema_errors.append(
                    f"{table_name}: missing foreign key {_foreign_key_label(columns, referred_table, referred_columns)}"
                )

        if target_engine.dialect.name == "sqlite":
            for row in connection.execute(text("PRAGMA foreign_key_check")).mappings():
                schema_errors.append(
                    "sqlite: foreign_key_check failed "
                    f"{row['table']} rowid={row['rowid']} parent={row['parent']} fkid={row['fkid']}"
                )

    return schema_errors
