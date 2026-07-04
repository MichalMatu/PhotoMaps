#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DIST_DIR = ROOT_DIR / "frontend" / "dist"
DEFAULT_MAX_JS_MINIFIED_BYTES = int(os.getenv("FRONTEND_BUNDLE_MAX_JS_MINIFIED_BYTES", str(500 * 1024)))
DEFAULT_MAX_JS_GZIP_BYTES = int(os.getenv("FRONTEND_BUNDLE_MAX_JS_GZIP_BYTES", str(160 * 1024)))
DEFAULT_MAX_CSS_MINIFIED_BYTES = int(os.getenv("FRONTEND_BUNDLE_MAX_CSS_MINIFIED_BYTES", str(180 * 1024)))
DEFAULT_MAX_CSS_GZIP_BYTES = int(os.getenv("FRONTEND_BUNDLE_MAX_CSS_GZIP_BYTES", str(40 * 1024)))


@dataclass(frozen=True)
class AssetBudget:
    max_gzip_bytes: int
    max_minified_bytes: int


@dataclass(frozen=True)
class AssetSize:
    gzip_bytes: int
    minified_bytes: int
    path: str
    type: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "gzip_bytes": self.gzip_bytes,
            "minified_bytes": self.minified_bytes,
            "path": self.path,
            "type": self.type,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check PhotoMap frontend bundle asset budgets.")
    parser.add_argument("--dist", type=Path, default=DEFAULT_DIST_DIR, help="Built frontend dist directory.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of text.")
    parser.add_argument("--max-js-minified", type=int, default=DEFAULT_MAX_JS_MINIFIED_BYTES)
    parser.add_argument("--max-js-gzip", type=int, default=DEFAULT_MAX_JS_GZIP_BYTES)
    parser.add_argument("--max-css-minified", type=int, default=DEFAULT_MAX_CSS_MINIFIED_BYTES)
    parser.add_argument("--max-css-gzip", type=int, default=DEFAULT_MAX_CSS_GZIP_BYTES)
    return parser.parse_args()


def asset_type(path: Path) -> str | None:
    if path.suffix == ".js":
        return "js"
    if path.suffix == ".css":
        return "css"
    return None


def collect_asset_sizes(dist_dir: Path) -> list[AssetSize]:
    assets_dir = dist_dir / "assets"
    if not assets_dir.is_dir():
        raise FileNotFoundError(f"frontend assets directory does not exist: {assets_dir}")

    sizes: list[AssetSize] = []
    for path in sorted(assets_dir.iterdir()):
        kind = asset_type(path)
        if kind is None or not path.is_file():
            continue
        content = path.read_bytes()
        sizes.append(
            AssetSize(
                gzip_bytes=len(gzip.compress(content, compresslevel=9)),
                minified_bytes=len(content),
                path=path.relative_to(dist_dir).as_posix(),
                type=kind,
            )
        )
    return sizes


def budget_for_asset(asset: AssetSize, *, css_budget: AssetBudget, js_budget: AssetBudget) -> AssetBudget:
    return js_budget if asset.type == "js" else css_budget


def budget_violations(
    assets: list[AssetSize],
    *,
    css_budget: AssetBudget,
    js_budget: AssetBudget,
) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    for asset in assets:
        budget = budget_for_asset(asset, css_budget=css_budget, js_budget=js_budget)
        if asset.minified_bytes > budget.max_minified_bytes:
            violations.append(
                {
                    "actual_bytes": asset.minified_bytes,
                    "budget_bytes": budget.max_minified_bytes,
                    "metric": "minified",
                    "path": asset.path,
                    "type": asset.type,
                }
            )
        if asset.gzip_bytes > budget.max_gzip_bytes:
            violations.append(
                {
                    "actual_bytes": asset.gzip_bytes,
                    "budget_bytes": budget.max_gzip_bytes,
                    "metric": "gzip",
                    "path": asset.path,
                    "type": asset.type,
                }
            )
    return violations


def build_report(
    dist_dir: Path,
    *,
    css_budget: AssetBudget,
    js_budget: AssetBudget,
) -> dict[str, Any]:
    assets = collect_asset_sizes(dist_dir)
    violations = budget_violations(assets, css_budget=css_budget, js_budget=js_budget)
    return {
        "assets": [asset.to_dict() for asset in assets],
        "budgets": {
            "css": {
                "gzip_bytes": css_budget.max_gzip_bytes,
                "minified_bytes": css_budget.max_minified_bytes,
            },
            "js": {
                "gzip_bytes": js_budget.max_gzip_bytes,
                "minified_bytes": js_budget.max_minified_bytes,
            },
        },
        "status": "error" if violations else "ok",
        "violations": violations,
    }


def format_bytes(value: int) -> str:
    return f"{value / 1024:.2f} KiB"


def format_report(report: dict[str, Any]) -> str:
    lines = ["PhotoMap frontend bundle budget", f"Status: {str(report['status']).upper()}"]
    for asset in report["assets"]:
        lines.append(
            f"- {asset['path']} [{asset['type']}]: "
            f"minified {format_bytes(asset['minified_bytes'])}, gzip {format_bytes(asset['gzip_bytes'])}"
        )
    if report["violations"]:
        lines.append("")
        lines.append("Violations:")
        for violation in report["violations"]:
            lines.append(
                f"- {violation['path']} {violation['metric']}: "
                f"{format_bytes(violation['actual_bytes'])} > {format_bytes(violation['budget_bytes'])}"
            )
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    report = build_report(
        args.dist,
        css_budget=AssetBudget(max_gzip_bytes=args.max_css_gzip, max_minified_bytes=args.max_css_minified),
        js_budget=AssetBudget(max_gzip_bytes=args.max_js_gzip, max_minified_bytes=args.max_js_minified),
    )
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_report(report))
    return 1 if report["violations"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
