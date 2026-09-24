#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DIAGNOSTICS_PATH = ROOT_DIR / "scripts" / "diagnose_architecture.py"

# Existing broad exception handlers are known debt. New ones are not allowed.
MAX_BROAD_EXCEPTS = 3
FORBIDDEN_RISK_COUNTS = {
    "shell_true": 0,
    "dynamic_code": 0,
    "pickle_usage": 0,
    "console_calls": 0,
}


def load_diagnostics_module():
    spec = importlib.util.spec_from_file_location("photomap_architecture_diagnostics", DIAGNOSTICS_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load architecture diagnostics from {DIAGNOSTICS_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def collect_violations(report: dict) -> list[str]:
    violations: list[str] = []

    parse_errors = report["parse_errors"]
    if parse_errors:
        violations.append(f"python parse errors: {len(parse_errors)}")

    dependency_cycles = report["dependency_cycles"]
    if dependency_cycles:
        violations.append(f"python dependency cycles: {len(dependency_cycles)}")

    risky_patterns = report["risky_patterns"]
    broad_excepts = len(risky_patterns["broad_excepts"])
    if broad_excepts > MAX_BROAD_EXCEPTS:
        violations.append(f"broad exception handlers increased: {broad_excepts} > baseline {MAX_BROAD_EXCEPTS}")

    for key, allowed in FORBIDDEN_RISK_COUNTS.items():
        count = len(risky_patterns[key])
        if count > allowed:
            violations.append(f"{key} findings increased from zero: {count}")

    return violations


def main() -> int:
    diagnostics = load_diagnostics_module()
    report = diagnostics.build_report()
    violations = collect_violations(report)

    if violations:
        print("architecture gate: FAIL")
        for violation in violations:
            print(f"- {violation}")
        return 1

    print("architecture gate: OK " f"(cycles=0, parse_errors=0, broad_excepts<={MAX_BROAD_EXCEPTS}, risky_patterns=0)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
