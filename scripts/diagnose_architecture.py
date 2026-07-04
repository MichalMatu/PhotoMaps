#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
import re
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = ("backend/app", "frontend/src", "scripts")
SOURCE_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".css", ".html"}
EXCLUDED_PARTS = {
    ".dev",
    ".git",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "backups",
    "dist",
    "node_modules",
    "test-results",
}
ENDPOINT_RE = re.compile(r"['\"](?P<path>/(?:api|health|media)[^'\"\s)]*)['\"]")
TS_FUNCTION_RE = re.compile(
    r"\bfunction\s+(?P<fn>[A-Za-z_$][\w$]*)\s*\(|"
    r"\b(?:const|let|var)\s+(?P<const>[A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>"
)
TS_IMPORT_RE = re.compile(r"\bimport\b.*?from\s+['\"](?P<target>[^'\"]+)['\"]")


def build_report() -> dict[str, Any]:
    files = iter_source_files()
    python_files = [path for path in files if path.suffix == ".py"]
    frontend_files = [path for path in files if path.suffix in {".ts", ".tsx", ".js", ".jsx"}]
    py_trees = {path: tree for path in python_files if (tree := parse_python(path)) is not None}
    imports, graph = collect_python_imports(py_trees)
    risky_patterns = collect_risky_patterns(py_trees, frontend_files)

    return {
        "generated_at": now_iso(),
        "root": ROOT_DIR.as_posix(),
        "summary": {
            "source_files": len(files),
            "python_files": len(python_files),
            "frontend_files": len(frontend_files),
            "style_or_markup_files": len(files) - len(python_files) - len(frontend_files),
        },
        "biggest_files": biggest_files(files),
        "longest_functions": longest_functions(py_trees, frontend_files),
        "python_imports": imports,
        "dependency_cycles": find_cycles(graph),
        "http_endpoints": collect_http_endpoints(py_trees, frontend_files),
        "group_dependencies": group_dependencies(imports, frontend_files),
        "risky_patterns": risky_patterns,
        "tool_availability": collect_tool_availability(),
        "parse_errors": collect_parse_errors(python_files),
    }


def format_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# PhotoMap Architecture Diagnostics",
        "",
        f"Generated: `{report['generated_at']}`",
        "",
        "## Summary",
        "",
        table(["Metric", "Value"], [[key, value] for key, value in report["summary"].items()]),
        "## Biggest Files",
        "",
        table(
            ["Path", "Lines", "Bytes"],
            [[item["path"], item["lines"], item["bytes"]] for item in report["biggest_files"][:20]],
        ),
        "## Longest Functions",
        "",
        table(
            ["Path", "Function", "Line", "Lines", "Kind"],
            [
                [item["path"], item["name"], item["line"], item["lines"], item["kind"]]
                for item in report["longest_functions"][:30]
            ],
        ),
        "## Dependency Cycles",
        "",
    ]
    cycles = report["dependency_cycles"]
    lines.append("\n".join(f"- {' -> '.join(cycle)}" for cycle in cycles) if cycles else "_None found._")
    lines.extend(
        [
            "",
            "## Group Dependencies",
            "",
            table(
                ["From", "To", "Count"],
                [[item["from"], item["to"], item["count"]] for item in report["group_dependencies"]],
            ),
            "## HTTP Endpoints And Route Strings",
            "",
            table(
                ["Endpoint", "Source", "Line", "Method hint"],
                [
                    [item["path"], item["source"], item["line"], item["method_hint"]]
                    for item in report["http_endpoints"][:80]
                ],
            ),
            "## Risky Patterns",
            "",
        ]
    )
    for key, findings in report["risky_patterns"].items():
        lines.extend([f"### {key}", ""])
        lines.append(
            table(
                ["Path", "Line", "Detail"],
                [
                    [item.get("path"), item.get("line"), item.get("detail") or item.get("call") or ""]
                    for item in findings[:40]
                ],
            )
        )
    lines.extend(
        [
            "## Tool Availability",
            "",
            table(
                ["Command", "Available", "Version"],
                [
                    [item["command"], item["available"], item.get("version") or item.get("error") or ""]
                    for item in report["tool_availability"]
                ],
            ),
        ]
    )
    if report["parse_errors"]:
        lines.extend(
            [
                "## Parse Errors",
                "",
                table(
                    ["Path", "Line", "Error"],
                    [[item["path"], item["line"], item["error"]] for item in report["parse_errors"]],
                ),
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def rel(path: Path) -> str:
    return path.relative_to(ROOT_DIR).as_posix()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def iter_source_files() -> list[Path]:
    files: list[Path] = []
    for source_root in SOURCE_ROOTS:
        root = ROOT_DIR / source_root
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix not in SOURCE_SUFFIXES:
                continue
            if any(part in EXCLUDED_PARTS for part in path.relative_to(ROOT_DIR).parts):
                continue
            files.append(path)
    return sorted(files)


def biggest_files(files: list[Path], limit: int = 30) -> list[dict[str, Any]]:
    rows = []
    for path in files:
        text = read_text(path)
        rows.append({"path": rel(path), "bytes": path.stat().st_size, "lines": text.count("\n") + 1})
    return sorted(rows, key=lambda item: (item["lines"], item["bytes"]), reverse=True)[:limit]


def parse_python(path: Path) -> ast.AST | None:
    try:
        return ast.parse(read_text(path), filename=rel(path))
    except SyntaxError:
        return None


def module_name(path: Path) -> str | None:
    if path.suffix != ".py":
        return None
    parts = path.relative_to(ROOT_DIR).with_suffix("").parts
    if parts[:2] == ("backend", "app"):
        parts = ("app", *parts[2:])
    if parts[-1:] == ("__init__",):
        parts = parts[:-1]
    return ".".join(parts) if parts else None


def longest_functions(
    py_trees: dict[Path, ast.AST],
    frontend_files: list[Path],
    limit: int = 50,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path, tree in py_trees.items():
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                end_lineno = getattr(node, "end_lineno", node.lineno)
                rows.append(
                    {
                        "path": rel(path),
                        "name": node.name,
                        "line": node.lineno,
                        "lines": max(1, end_lineno - node.lineno + 1),
                        "kind": "python",
                    }
                )
    for path in frontend_files:
        rows.extend(frontend_long_functions(path))
    return sorted(rows, key=lambda item: item["lines"], reverse=True)[:limit]


def frontend_long_functions(path: Path) -> list[dict[str, Any]]:
    lines = read_text(path).splitlines()
    rows: list[dict[str, Any]] = []
    for index, line in enumerate(lines):
        match = TS_FUNCTION_RE.search(line)
        if not match:
            continue
        name = match.group("fn") or match.group("const") or "<anonymous>"
        brace_depth = line.count("{") - line.count("}")
        end_index = index
        while brace_depth > 0 and end_index + 1 < len(lines):
            end_index += 1
            brace_depth += lines[end_index].count("{") - lines[end_index].count("}")
        rows.append(
            {
                "path": rel(path),
                "name": name,
                "line": index + 1,
                "lines": max(1, end_index - index + 1),
                "kind": "frontend",
            }
        )
    return rows


def collect_python_imports(py_trees: dict[Path, ast.AST]) -> tuple[list[dict[str, Any]], dict[str, set[str]]]:
    modules_by_path = {path: module_name(path) for path in py_trees}
    modules = {name for name in modules_by_path.values() if name}
    imports: list[dict[str, Any]] = []
    graph: dict[str, set[str]] = defaultdict(set)
    for path, tree in py_trees.items():
        current = modules_by_path[path]
        if not current:
            continue
        for node in ast.walk(tree):
            targets = python_import_targets(current, node, modules)
            for target in targets:
                if target == current:
                    continue
                imports.append({"from": current, "to": target, "path": rel(path), "line": node.lineno})
                graph[current].add(target)
    imports = sorted(imports, key=lambda item: (item["from"], item["to"], item["line"]))
    return imports, graph


def python_import_targets(current: str, node: ast.AST, modules: set[str]) -> list[str]:
    if isinstance(node, ast.Import):
        return [target for alias in node.names if (target := known_module(alias.name, modules))]
    if not isinstance(node, ast.ImportFrom):
        return []
    base = resolve_relative_import(current, node) if node.level else node.module
    if not base:
        return []
    targets: list[str] = []
    for alias in node.names:
        imported = base if alias.name == "*" else f"{base}.{alias.name}"
        target = known_module(imported, modules) or known_module(base, modules)
        if target:
            targets.append(target)
    return targets


def resolve_relative_import(current: str, node: ast.ImportFrom) -> str | None:
    current_parts = current.split(".")
    base_parts = current_parts[: -node.level] if node.level else current_parts[:-1]
    if node.module:
        base_parts.extend(part for part in node.module.split(".") if part)
    return ".".join(base_parts) if base_parts else None


def known_module(imported: str, modules: set[str]) -> str | None:
    parts = imported.split(".")
    while parts:
        module_prefix = ".".join(parts)
        if module_prefix in modules:
            return module_prefix
        parts.pop()
    root = imported.split(".", 1)[0]
    return root if root in {"app", "scripts"} else None


def find_cycles(graph: dict[str, set[str]], limit: int = 30) -> list[list[str]]:
    cycles: list[list[str]] = []
    seen: set[tuple[str, ...]] = set()

    def canonical(cycle: list[str]) -> tuple[str, ...]:
        body = cycle[:-1]
        rotations = [tuple(body[index:] + body[:index]) for index in range(len(body))]
        return min(rotations)

    def walk(start: str, node: str, stack: list[str]) -> None:
        if len(cycles) >= limit:
            return
        for target in sorted(graph.get(node, set())):
            if target == start:
                cycle = stack + [start]
                key = canonical(cycle)
                if key not in seen:
                    seen.add(key)
                    cycles.append(cycle)
                continue
            if target in stack or len(stack) >= 12:
                continue
            walk(start, target, stack + [target])

    for start in sorted(graph):
        walk(start, start, [start])
        if len(cycles) >= limit:
            break
    return cycles


def collect_http_endpoints(py_trees: dict[Path, ast.AST], frontend_files: list[Path]) -> list[dict[str, Any]]:
    endpoints: dict[tuple[str, str, int], dict[str, Any]] = {}
    for path, tree in py_trees.items():
        parents = parent_map(tree)
        for node in ast.walk(tree):
            if not isinstance(node, ast.Constant) or not isinstance(node.value, str):
                continue
            value = node.value
            if value == "/" or value.startswith(("/api", "/health", "/media")):
                context = current_function_name(node, parents)
                method_hint = "HTTP"
                if isinstance(parents.get(node), ast.Call):
                    method_hint = call_name(parents[node].func).split(".")[-1].upper()
                endpoints[(value, rel(path), node.lineno)] = {
                    "path": value,
                    "source": rel(path),
                    "line": node.lineno,
                    "method_hint": method_hint,
                    "context": context,
                }
    for path in frontend_files:
        for lineno, line in enumerate(read_text(path).splitlines(), start=1):
            for match in ENDPOINT_RE.finditer(line):
                endpoint = match.group("path")
                endpoints[(endpoint, rel(path), lineno)] = {
                    "path": endpoint,
                    "source": rel(path),
                    "line": lineno,
                    "method_hint": "FRONTEND",
                    "context": "",
                }
    return sorted(endpoints.values(), key=lambda item: (item["path"], item["source"], item["line"]))


def parent_map(tree: ast.AST) -> dict[ast.AST, ast.AST]:
    parents: dict[ast.AST, ast.AST] = {}
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            parents[child] = parent
    return parents


def current_function_name(node: ast.AST, parents: dict[ast.AST, ast.AST]) -> str:
    cursor = node
    while cursor in parents:
        cursor = parents[cursor]
        if isinstance(cursor, ast.FunctionDef | ast.AsyncFunctionDef):
            return cursor.name
    return ""


def call_name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        prefix = call_name(node.value)
        return f"{prefix}.{node.attr}" if prefix else node.attr
    return ""


def collect_risky_patterns(
    py_trees: dict[Path, ast.AST],
    frontend_files: list[Path],
) -> dict[str, list[dict[str, Any]]]:
    findings: dict[str, list[dict[str, Any]]] = {
        "broad_excepts": [],
        "shell_true": [],
        "dynamic_code": [],
        "pickle_usage": [],
        "console_calls": [],
    }
    for path, tree in py_trees.items():
        for node in ast.walk(tree):
            if isinstance(node, ast.ExceptHandler):
                broad = node.type is None
                detail = "bare"
                if isinstance(node.type, ast.Name):
                    detail = node.type.id
                    broad = detail in {"Exception", "BaseException"}
                if broad:
                    findings["broad_excepts"].append({"path": rel(path), "line": node.lineno, "detail": detail})
            elif isinstance(node, ast.Call):
                name = call_name(node.func)
                if name in {"eval", "exec"}:
                    findings["dynamic_code"].append({"path": rel(path), "line": node.lineno, "call": name})
                if any(
                    keyword.arg == "shell" and isinstance(keyword.value, ast.Constant) and keyword.value.value is True
                    for keyword in node.keywords
                ):
                    findings["shell_true"].append({"path": rel(path), "line": node.lineno, "call": name})
            elif isinstance(node, ast.Import | ast.ImportFrom):
                imported = [alias.name for alias in node.names] if isinstance(node, ast.Import) else [node.module or ""]
                if any(name == "pickle" or name.startswith("pickle.") for name in imported):
                    findings["pickle_usage"].append(
                        {"path": rel(path), "line": node.lineno, "detail": ", ".join(imported)}
                    )
    for path in frontend_files:
        for lineno, line in enumerate(read_text(path).splitlines(), start=1):
            if "console." in line:
                findings["console_calls"].append({"path": rel(path), "line": lineno, "detail": line.strip()[:160]})
    return findings


def group_dependencies(imports: list[dict[str, Any]], frontend_files: list[Path]) -> list[dict[str, Any]]:
    counter: Counter[tuple[str, str]] = Counter()
    for item in imports:
        counter[(module_group(item["from"]), module_group(item["to"]))] += 1
    for path in frontend_files:
        source_group = frontend_group(path)
        for match in TS_IMPORT_RE.finditer(read_text(path)):
            target = match.group("target")
            if target.startswith("."):
                counter[(source_group, "frontend-local")] += 1
            else:
                counter[(source_group, "frontend-package")] += 1
    return [
        {"from": source, "to": target, "count": count}
        for (source, target), count in sorted(counter.items(), key=lambda item: (item[0][0], item[0][1]))
    ]


def module_group(module: str) -> str:
    if module.startswith("app.api"):
        return "backend-api"
    if module.startswith("app.models"):
        return "backend-models"
    if module.startswith("app.schemas"):
        return "backend-schemas"
    if module.startswith("app.serializers"):
        return "backend-serializers"
    if module.startswith("app.services"):
        return "backend-services"
    if module.startswith("app.db"):
        return "backend-db"
    if module.startswith("app."):
        return "backend-core"
    return module.split(".", 1)[0]


def frontend_group(path: Path) -> str:
    relative_parts = path.relative_to(ROOT_DIR).parts
    if len(relative_parts) >= 4 and relative_parts[:2] == ("frontend", "src"):
        return f"frontend-{relative_parts[2]}"
    return "frontend"


def collect_tool_availability() -> list[dict[str, Any]]:
    return [
        {"command": "python", "available": True, "path": sys.executable, "version": sys.version.split()[0]},
        tool_info("git", "--version"),
        tool_info("ruff", "--version", module="ruff"),
        tool_info("pytest", "--version", module="pytest"),
        tool_info("node", "--version"),
        tool_info("npm", "--version"),
    ]


def tool_info(command: str, *version_args: str, module: str | None = None) -> dict[str, Any]:
    executable = shutil.which(command)
    if executable:
        args = [executable, *(version_args or ("--version",))]
        path_label = executable
    elif module:
        args = [sys.executable, "-m", module, *(version_args or ("--version",))]
        path_label = f"{sys.executable} -m {module}"
    else:
        return {"command": command, "available": False}
    try:
        completed = subprocess.run(args, capture_output=True, text=True, timeout=5, check=False)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"command": command, "available": False, "path": path_label, "error": str(exc)}
    output = (completed.stdout or completed.stderr).strip().splitlines()
    result = {
        "command": command,
        "available": completed.returncode == 0,
        "path": path_label,
        "returncode": completed.returncode,
    }
    if completed.returncode == 0:
        result["version"] = output[0] if output else ""
    else:
        result["error"] = output[0] if output else f"{command} exited with {completed.returncode}"
    return result


def collect_parse_errors(python_files: list[Path]) -> list[dict[str, Any]]:
    errors = []
    for path in python_files:
        try:
            ast.parse(read_text(path), filename=rel(path))
        except SyntaxError as exc:
            errors.append({"path": rel(path), "line": exc.lineno, "error": exc.msg})
    return errors


def table(headers: list[str], rows: list[list[Any]]) -> str:
    if not rows:
        return "_None found._\n"
    output = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for row in rows:
        output.append("| " + " | ".join(str(value) for value in row) + " |")
    return "\n".join(output) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only architecture diagnostics for PhotoMap.")
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--markdown", action="store_true", help="Print a Markdown report.")
    parser.add_argument("--output-json", type=Path, help="Write the full JSON report to this path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = build_report()

    if args.output_json:
        output_path = args.output_json if args.output_json.is_absolute() else ROOT_DIR / args.output_json
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    elif args.markdown or not args.output_json:
        print(format_markdown(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
