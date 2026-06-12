#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
CSS_DIRS = (ROOT_DIR / "frontend" / "src" / "styles", ROOT_DIR / "frontend" / "src" / "design")
TOKEN_FILE = ROOT_DIR / "frontend" / "src" / "design" / "tokens.css"

RULES = {
    "important": "Avoid new !important declarations.",
    "raw-color": "Use color/surface/content/border tokens outside tokens.css.",
    "raw-shadow": "Use elevation/shadow tokens instead of local box-shadow values.",
    "raw-radius": "Use radius tokens for component corners.",
    "raw-motion": "Use motion duration/easing tokens for component animation and transition values.",
}

BASELINE: dict[str, dict[str, int]] = {
    "frontend/src/styles/admin-categories.css": {
        "raw-radius": 3,
    },
    "frontend/src/styles/admin-controls.css": {
        "raw-color": 1,
    },
    "frontend/src/styles/admin-forms.css": {
        "important": 1,
        "raw-radius": 4,
        "raw-shadow": 1,
    },
    "frontend/src/styles/admin-guides.css": {
        "raw-radius": 4,
    },
    "frontend/src/styles/admin-photos.css": {
        "important": 1,
        "raw-color": 2,
        "raw-radius": 8,
    },
    "frontend/src/styles/admin.css": {
        "raw-radius": 7,
    },
    "frontend/src/styles/base.css": {
        "important": 4,
        "raw-motion": 2,
    },
    "frontend/src/styles/layout.css": {
        "raw-color": 2,
        "raw-motion": 1,
        "raw-radius": 1,
    },
    "frontend/src/styles/map-tools.css": {
        "important": 1,
        "raw-color": 5,
        "raw-radius": 4,
        "raw-shadow": 1,
    },
    "frontend/src/styles/map.css": {
        "raw-radius": 1,
    },
    "frontend/src/styles/ui.css": {
        "important": 6,
        "raw-color": 1,
        "raw-motion": 1,
        "raw-radius": 7,
    },
}

COLOR_RE = re.compile(r"(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()")
TIME_RE = re.compile(r"\b\d+(?:\.\d+)?m?s\b")


@dataclass(frozen=True)
class Finding:
    path: str
    rule: str
    line_number: int
    line: str


def relative_path(path: Path) -> str:
    return path.relative_to(ROOT_DIR).as_posix()


def css_files() -> list[Path]:
    files: list[Path] = []
    for directory in CSS_DIRS:
        files.extend(sorted(directory.glob("*.css")))
    return files


def is_token_file(path: Path) -> bool:
    return path == TOKEN_FILE


def has_raw_shadow(line: str) -> bool:
    if "box-shadow:" not in line:
        return False

    value = line.split("box-shadow:", 1)[1].strip().rstrip(";")
    if not value:
        return False

    return not (value.startswith("var(") or value == "none")


def has_raw_radius(line: str) -> bool:
    if "border-radius:" not in line:
        return False

    value = line.split("border-radius:", 1)[1].strip().rstrip(";")
    if value.startswith("var("):
        return False

    return value not in {"0", "50%", "999px"}


def has_raw_motion(line: str) -> bool:
    stripped = line.strip()
    if not (
        stripped.startswith("animation:")
        or stripped.startswith("animation-duration:")
        or stripped.startswith("transition:")
        or stripped.startswith("transition-duration:")
    ):
        return False

    return ("var(" not in stripped) and (bool(TIME_RE.search(stripped)) or "cubic-bezier(" in stripped)


def scan_file(path: Path) -> list[Finding]:
    findings: list[Finding] = []
    path_label = relative_path(path)
    token_file = is_token_file(path)

    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue

        if "!important" in line:
            findings.append(Finding(path_label, "important", line_number, line))

        if not token_file and COLOR_RE.search(line):
            findings.append(Finding(path_label, "raw-color", line_number, line))

        if not token_file and has_raw_shadow(line):
            findings.append(Finding(path_label, "raw-shadow", line_number, line))

        if not token_file and has_raw_radius(line):
            findings.append(Finding(path_label, "raw-radius", line_number, line))

        if not token_file and has_raw_motion(line):
            findings.append(Finding(path_label, "raw-motion", line_number, line))

    return findings


def scan() -> list[Finding]:
    findings: list[Finding] = []
    for path in css_files():
        findings.extend(scan_file(path))
    return findings


def count_findings(findings: list[Finding]) -> Counter[tuple[str, str]]:
    return Counter((finding.path, finding.rule) for finding in findings)


def print_baseline(findings: list[Finding]) -> None:
    counts = count_findings(findings)
    print("BASELINE = {")
    for path in sorted({path for path, _rule in counts}):
        print(f'    "{path}": {{')
        for rule in sorted(rule for current_path, rule in counts if current_path == path):
            print(f'        "{rule}": {counts[(path, rule)]},')
        print("    },")
    print("}")


def print_new_findings(findings: list[Finding], counts: Counter[tuple[str, str]]) -> None:
    printed = 0
    for finding in findings:
        allowed = BASELINE.get(finding.path, {}).get(finding.rule, 0)
        current = counts[(finding.path, finding.rule)]
        if current <= allowed:
            continue
        print(f"- {finding.path}:{finding.line_number} [{finding.rule}] {finding.line}")
        printed += 1
        if printed >= 40:
            print("- ...")
            return


def main() -> int:
    parser = argparse.ArgumentParser(description="Block new untokenized CSS values.")
    parser.add_argument("--print-baseline", action="store_true", help="Print the current CSS debt baseline.")
    args = parser.parse_args()

    findings = scan()
    counts = count_findings(findings)

    if args.print_baseline:
        print_baseline(findings)
        return 0

    new_debt: list[str] = []
    for path, rule_counts in BASELINE.items():
        for rule, allowed_count in rule_counts.items():
            current_count = counts[(path, rule)]
            if current_count > allowed_count:
                new_debt.append(f"{path}: {rule} grew from {allowed_count} to {current_count}")

    for path, rule in sorted(counts):
        if path not in BASELINE or rule not in BASELINE[path]:
            new_debt.append(f"{path}: new {rule} findings ({counts[(path, rule)]})")

    if not new_debt:
        print("CSS token gate passed.")
        return 0

    print("CSS token gate failed. New untokenized CSS was introduced:")
    for item in new_debt:
        print(f"- {item}")
    print()
    print("Examples:")
    print_new_findings(findings, counts)
    print()
    print("Move shared values into frontend/src/design/tokens.css or replace local values with existing tokens.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
