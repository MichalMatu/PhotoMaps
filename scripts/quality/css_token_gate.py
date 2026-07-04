#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
CSS_DIRS = (
    ROOT_DIR / "frontend" / "src" / "styles",
    ROOT_DIR / "frontend" / "src" / "design",
)
TOKEN_FILE = ROOT_DIR / "frontend" / "src" / "design" / "tokens.css"
ADMIN_CSS_FILE = ROOT_DIR / "frontend" / "src" / "styles" / "admin.css"
ADMIN_STYLE_FILES = tuple(sorted((ROOT_DIR / "frontend" / "src" / "styles").glob("admin*.css")))
ADMIN_COMPONENT_DIR = ROOT_DIR / "frontend" / "src" / "components" / "admin"

RULES = {
    "important": "Avoid new !important declarations.",
    "raw-color": "Use color/surface/content/border tokens outside tokens.css.",
    "raw-font-size": "Use text scale tokens instead of local font-size values.",
    "raw-spacing": "Use spacing tokens instead of local margin, padding, and gap values.",
    "raw-shadow": "Use elevation/shadow tokens instead of local box-shadow values.",
    "raw-radius": "Use radius tokens for component corners.",
    "raw-motion": "Use motion duration/easing tokens for component animation and transition values.",
}

BASELINE: dict[str, dict[str, int]] = {
    "frontend/src/styles/admin-tables.css": {
        "raw-font-size": 1,
        "raw-spacing": 1,
    },
    "frontend/src/styles/admin-categories.css": {
        "raw-spacing": 2,
    },
    "frontend/src/styles/admin-cities.css": {
        "raw-spacing": 2,
    },
    "frontend/src/styles/admin-photos.css": {
        "raw-spacing": 1,
    },
    "frontend/src/styles/admin.css": {
        "raw-spacing": 2,
    },
    "frontend/src/styles/base.css": {
        "raw-font-size": 1,
    },
    "frontend/src/styles/layout.css": {
        "raw-font-size": 14,
        "raw-spacing": 21,
    },
    "frontend/src/styles/map-tools.css": {
        "raw-font-size": 5,
        "raw-spacing": 11,
    },
    "frontend/src/styles/map.css": {
        "raw-font-size": 1,
        "raw-spacing": 3,
    },
    "frontend/src/styles/responsive.css": {
        "raw-font-size": 2,
        "raw-spacing": 5,
    },
    "frontend/src/styles/ui.css": {
        "raw-font-size": 2,
        "raw-spacing": 7,
    },
}

COLOR_RE = re.compile(r"(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()")
TIME_RE = re.compile(r"\b\d+(?:\.\d+)?m?s\b")
SPACING_LENGTH_RE = re.compile(r"\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|dvh|dvw|%)\b")
SPACING_PROPERTIES = {
    "gap",
    "row-gap",
    "column-gap",
    "margin",
    "margin-block",
    "margin-block-end",
    "margin-block-start",
    "margin-bottom",
    "margin-inline",
    "margin-inline-end",
    "margin-inline-start",
    "margin-left",
    "margin-right",
    "margin-top",
    "padding",
    "padding-block",
    "padding-block-end",
    "padding-block-start",
    "padding-bottom",
    "padding-inline",
    "padding-inline-end",
    "padding-inline-start",
    "padding-left",
    "padding-right",
    "padding-top",
}

ADMIN_SECTION_TAB_TOKENS = (
    "--admin-section-tabs-gap",
    "--admin-section-tabs-padding",
    "--admin-section-tab-gap",
    "--admin-section-tab-icon-track",
    "--admin-section-tab-min-height",
    "--admin-section-tab-min-width",
    "--admin-section-tab-min-width-compact",
    "--admin-section-tab-padding-inline",
    "--admin-section-tab-count-min-width",
    "--admin-section-tab-count-padding-inline",
)

ADMIN_PILL_TOKENS = (
    "--admin-pill-height",
    "--admin-pill-group-gap",
    "--admin-pill-content-gap",
    "--admin-pill-padding-inline",
    "--admin-pill-count-height",
    "--admin-pill-count-min-width",
    "--admin-pill-count-padding-inline",
)

ADMIN_TOOLBAR_TOKENS = (
    "--admin-toolbar-gap",
    "--admin-toolbar-action-gap",
    "--admin-toolbar-margin-bottom",
    "--admin-toolbar-icon-action-size",
    "--admin-toolbar-secondary-action-width",
    "--admin-toolbar-primary-action-width",
)

ADMIN_SECTION_TAB_SELECTOR_CONTRACT: dict[str, dict[str, str]] = {
    ".admin-section-tabs": {
        "display": "grid",
        "gap": "var(--admin-section-tabs-gap)",
        "grid-template-columns": "repeat(auto-fit, minmax(min(100%, var(--admin-section-tab-min-width)), 1fr))",
        "padding": "var(--admin-section-tabs-padding)",
    },
    ".admin-section-tab": {
        "align-items": "center",
        "display": "grid",
        "gap": "var(--admin-section-tab-gap)",
        "grid-template-columns": "var(--admin-section-tab-icon-track) minmax(0, 1fr) auto",
        "min-height": "var(--admin-section-tab-min-height)",
        "padding": "0 var(--admin-section-tab-padding-inline)",
    },
    ".admin-section-tab-count": {
        "min-width": "var(--admin-section-tab-count-min-width)",
        "padding": "var(--space-1) var(--admin-section-tab-count-padding-inline)",
    },
}

ADMIN_PILL_SELECTOR_CONTRACT: dict[str, dict[str, str]] = {
    ".admin-segment-tabs": {
        "gap": "var(--admin-pill-group-gap)",
        "min-height": "var(--admin-pill-height)",
    },
    ".admin-summary-pills": {
        "gap": "var(--admin-pill-group-gap)",
        "min-height": "var(--admin-pill-height)",
    },
    ".admin-segment-tab": {
        "align-items": "center",
        "box-sizing": "border-box",
        "display": "inline-flex",
        "gap": "var(--admin-pill-content-gap)",
        "justify-content": "center",
        "line-height": "1",
        "min-height": "var(--admin-pill-height)",
        "padding": "0 var(--admin-pill-padding-inline)",
    },
    ".admin-summary-pill": {
        "align-items": "center",
        "box-sizing": "border-box",
        "display": "inline-flex",
        "justify-content": "center",
        "line-height": "1",
        "min-height": "var(--admin-pill-height)",
        "padding": "0 var(--admin-pill-padding-inline)",
    },
    ".admin-segment-tab-count": {
        "align-items": "center",
        "box-sizing": "border-box",
        "display": "inline-flex",
        "height": "var(--admin-pill-count-height)",
        "justify-content": "center",
        "line-height": "1",
        "min-width": "var(--admin-pill-count-min-width)",
        "padding": "0 var(--admin-pill-count-padding-inline)",
    },
}

ADMIN_TOOLBAR_SELECTOR_CONTRACT: dict[str, dict[str, str]] = {
    ".admin-toolbar": {
        "align-items": "center",
        "display": "flex",
        "flex-wrap": "wrap",
        "gap": "var(--admin-toolbar-gap)",
        "margin-bottom": "var(--admin-toolbar-margin-bottom)",
        "min-width": "0",
    },
    ".admin-toolbar-actions": {
        "align-items": "center",
        "display": "flex",
        "gap": "var(--admin-toolbar-action-gap)",
        "margin-left": "auto",
        "min-width": "0",
    },
    ".admin-toolbar-action-slot--filter": {
        "width": "var(--admin-toolbar-icon-action-size)",
    },
    ".admin-toolbar-action-slot--secondary": {
        "width": "var(--admin-toolbar-secondary-action-width)",
    },
    ".admin-toolbar-action-slot--primary": {
        "width": "var(--admin-toolbar-primary-action-width)",
    },
    ".admin-toolbar-action-slot--primary:has(.admin-icon-action)": {
        "width": "var(--admin-toolbar-icon-action-size)",
    },
    ".admin-toolbar-action-slot--secondary:has(.admin-icon-action)": {
        "width": "var(--admin-toolbar-icon-action-size)",
    },
    ".admin-toolbar-action-slot .admin-icon-action": {
        "flex": "0 0 var(--admin-toolbar-icon-action-size)",
        "min-height": "var(--admin-toolbar-icon-action-size)",
        "min-width": "var(--admin-toolbar-icon-action-size)",
        "width": "var(--admin-toolbar-icon-action-size)",
    },
}

LEGACY_ADMIN_TOOLBAR_CLASSES = (
    "admin-filter-bar",
    "admin-filter-actions",
    "admin-filter-primary-action",
    "admin-filter-separator",
    "category-toolbar",
    "guide-toolbar",
    "place-toolbar",
    "place-toolbar-actions",
    "photo-queue-toolbar",
    "report-queue-toolbar",
)

CSS_BLOCK_RE = re.compile(r"(?P<selectors>[^{}]+)\{(?P<body>[^{}]*)\}", re.MULTILINE | re.DOTALL)


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


def has_raw_font_size(line: str) -> bool:
    if "font-size:" not in line:
        return False

    value = line.split("font-size:", 1)[1].strip().rstrip(";")
    if value.startswith("var("):
        return False

    return value not in {"inherit", "initial", "unset"}


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


def has_raw_spacing(line: str) -> bool:
    if ":" not in line:
        return False

    property_name, value = line.split(":", 1)
    property_name = property_name.strip()
    if property_name not in SPACING_PROPERTIES:
        return False

    value = value.strip().rstrip(";")

    return bool(SPACING_LENGTH_RE.search(value))


def is_reduced_motion_reset(path_label: str, line: str) -> bool:
    if path_label != "frontend/src/styles/base.css":
        return False

    if "!important" not in line:
        return False

    return line.startswith(
        (
            "animation-duration:",
            "animation-iteration-count:",
            "scroll-behavior:",
            "transition-duration:",
        )
    )


def scan_file(path: Path) -> list[Finding]:
    findings: list[Finding] = []
    path_label = relative_path(path)
    token_file = is_token_file(path)

    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue

        if "!important" in line and not is_reduced_motion_reset(path_label, line):
            findings.append(Finding(path_label, "important", line_number, line))

        if not token_file and COLOR_RE.search(line):
            findings.append(Finding(path_label, "raw-color", line_number, line))

        if not token_file and has_raw_font_size(line):
            findings.append(Finding(path_label, "raw-font-size", line_number, line))

        if not token_file and has_raw_spacing(line):
            findings.append(Finding(path_label, "raw-spacing", line_number, line))

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


def scan_spacing() -> list[Finding]:
    findings: list[Finding] = []
    for path in css_files():
        if is_token_file(path):
            continue
        path_label = relative_path(path)
        for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            line = raw_line.strip()
            if line and has_raw_spacing(line):
                findings.append(Finding(path_label, "raw-spacing", line_number, line))
    return findings


def selector_declarations(css_text: str, selector: str) -> dict[str, str]:
    declarations: dict[str, str] = {}
    for match in CSS_BLOCK_RE.finditer(css_text):
        selectors = [current_selector.strip() for current_selector in match.group("selectors").split(",")]
        if selector not in selectors:
            continue
        for raw_line in match.group("body").splitlines():
            line = raw_line.strip().rstrip(";")
            if not line or ":" not in line:
                continue
            property_name, value = line.split(":", 1)
            declarations.setdefault(property_name.strip(), value.strip())
    return declarations


def validate_admin_pill_contract() -> list[str]:
    errors: list[str] = []
    token_text = TOKEN_FILE.read_text(encoding="utf-8")
    admin_css = ADMIN_CSS_FILE.read_text(encoding="utf-8")

    for token in ADMIN_PILL_TOKENS:
        if f"{token}:" not in token_text:
            errors.append(f"Missing {token} in frontend/src/design/tokens.css")

    for selector, required_declarations in ADMIN_PILL_SELECTOR_CONTRACT.items():
        declarations = selector_declarations(admin_css, selector)
        if not declarations:
            errors.append(f"Missing {selector} in frontend/src/styles/admin.css")
            continue
        for property_name, expected_value in required_declarations.items():
            actual_value = declarations.get(property_name)
            if actual_value != expected_value:
                errors.append(
                    f"{selector} must use {property_name}: {expected_value}; found {actual_value or 'missing'}",
                )

    return errors


def validate_admin_section_tab_contract() -> list[str]:
    errors: list[str] = []
    token_text = TOKEN_FILE.read_text(encoding="utf-8")
    admin_css = ADMIN_CSS_FILE.read_text(encoding="utf-8")

    for token in ADMIN_SECTION_TAB_TOKENS:
        if f"{token}:" not in token_text:
            errors.append(f"Missing {token} in frontend/src/design/tokens.css")

    for selector, required_declarations in ADMIN_SECTION_TAB_SELECTOR_CONTRACT.items():
        declarations = selector_declarations(admin_css, selector)
        if not declarations:
            errors.append(f"Missing {selector} in frontend/src/styles/admin.css")
            continue
        for property_name, expected_value in required_declarations.items():
            actual_value = declarations.get(property_name)
            if actual_value != expected_value:
                errors.append(
                    f"{selector} must use {property_name}: {expected_value}; found {actual_value or 'missing'}",
                )

    return errors


def validate_admin_toolbar_contract() -> list[str]:
    errors: list[str] = []
    token_text = TOKEN_FILE.read_text(encoding="utf-8")
    admin_css = ADMIN_CSS_FILE.read_text(encoding="utf-8")

    for token in ADMIN_TOOLBAR_TOKENS:
        if f"{token}:" not in token_text:
            errors.append(f"Missing {token} in frontend/src/design/tokens.css")

    for selector, required_declarations in ADMIN_TOOLBAR_SELECTOR_CONTRACT.items():
        declarations = selector_declarations(admin_css, selector)
        if not declarations:
            errors.append(f"Missing {selector} in frontend/src/styles/admin.css")
            continue
        for property_name, expected_value in required_declarations.items():
            actual_value = declarations.get(property_name)
            if actual_value != expected_value:
                errors.append(
                    f"{selector} must use {property_name}: {expected_value}; found {actual_value or 'missing'}",
                )

    scan_paths = [*ADMIN_STYLE_FILES, *ADMIN_COMPONENT_DIR.glob("*.tsx")]
    for path in scan_paths:
        text = path.read_text(encoding="utf-8")
        for class_name in LEGACY_ADMIN_TOOLBAR_CLASSES:
            if class_name in text:
                errors.append(f"Legacy toolbar class {class_name} remains in {relative_path(path)}")

    return errors


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


def print_spacing_report(findings: list[Finding]) -> None:
    counts = count_findings(findings)
    if not findings:
        print("No raw spacing values found.")
        return

    print("Raw spacing report (baseline-enforced by default gate):")
    for path, rule in sorted(counts):
        if rule == "raw-spacing":
            print(f"- {path}: {counts[(path, rule)]}")

    print()
    print("Examples:")
    for finding in findings[:40]:
        print(f"- {finding.path}:{finding.line_number} {finding.line}")
    if len(findings) > 40:
        print("- ...")


def main() -> int:
    parser = argparse.ArgumentParser(description="Block new untokenized CSS values.")
    parser.add_argument(
        "--print-baseline",
        action="store_true",
        help="Print the current CSS debt baseline.",
    )
    parser.add_argument(
        "--print-spacing-report",
        action="store_true",
        help="Print raw spacing findings tracked by baseline.",
    )
    args = parser.parse_args()

    if args.print_spacing_report:
        print_spacing_report(scan_spacing())
        return 0

    findings = scan()
    counts = count_findings(findings)
    admin_section_tab_contract_errors = validate_admin_section_tab_contract()
    admin_pill_contract_errors = validate_admin_pill_contract()
    admin_toolbar_contract_errors = validate_admin_toolbar_contract()

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

    if (
        not new_debt
        and not admin_section_tab_contract_errors
        and not admin_pill_contract_errors
        and not admin_toolbar_contract_errors
    ):
        print("CSS token gate passed.")
        return 0

    print("CSS token gate failed.")
    if new_debt:
        print("New untokenized CSS was introduced:")
        for item in new_debt:
            print(f"- {item}")
        print()
        print("Examples:")
        print_new_findings(findings, counts)
        print()
        print("Move shared values into frontend/src/design/tokens.css or replace local values with existing tokens.")
    if admin_pill_contract_errors:
        print("Admin pill geometry drifted from the shared token contract:")
        for item in admin_pill_contract_errors:
            print(f"- {item}")
    if admin_section_tab_contract_errors:
        print("Admin section tab geometry drifted from the shared token contract:")
        for item in admin_section_tab_contract_errors:
            print(f"- {item}")
    if admin_toolbar_contract_errors:
        print("Admin toolbar layout drifted from the shared token contract:")
        for item in admin_toolbar_contract_errors:
            print(f"- {item}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
