#!/usr/bin/env python3
"""Validate security findings without echoing possible secret material."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="strict")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="strict")


REQUIRED_FIELDS = {
    "id",
    "title",
    "status",
    "severity",
    "confidence",
    "asset",
    "locations",
    "evidence",
    "preconditions",
    "impact",
    "counter_evidence",
    "remediation",
    "validation",
}

ENUMS = {
    "status": {"Verified", "Likely", "Hypothesis"},
    "severity": {"Critical", "High", "Medium", "Low", "Informational"},
    "confidence": {"High", "Medium", "Low"},
}

LIST_FIELDS = {
    "locations",
    "evidence",
    "preconditions",
    "counter_evidence",
}

TEXT_FIELDS = {
    "id",
    "title",
    "status",
    "severity",
    "confidence",
    "asset",
    "impact",
    "remediation",
    "validation",
}

ID_PATTERN = re.compile(r"^[A-Z][A-Z0-9-]{4,80}$")

# Intentionally broad enough to stop common accidental leaks. Error messages
# identify only the JSON path and pattern class, never the matched value.
SECRET_PATTERNS = {
    "private-key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "aws-access-key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "github-token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    "openai-token": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "anthropic-token": re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b"),
    "slack-token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    "bearer-token": re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b", re.I),
    "jwt": re.compile(
        r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b"
    ),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate a security-audit findings JSON file."
    )
    parser.add_argument("path", help="Path to findings JSON")
    return parser.parse_args()


def walk_strings(value: Any, path: str = "$") -> Iterable[tuple[str, str]]:
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk_strings(item, f"{path}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from walk_strings(item, f"{path}.{key}")


def validate_secret_redaction(document: Any) -> list[str]:
    errors: list[str] = []
    for path, value in walk_strings(document):
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(value):
                errors.append(
                    f"{path}: possible unredacted secret ({label}); redact it"
                )
    return errors


def nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_finding(
    finding: Any, index: int, seen_ids: set[str]
) -> tuple[list[str], list[str]]:
    prefix = f"$.findings[{index}]"
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(finding, dict):
        return [f"{prefix}: must be an object"], warnings

    missing = sorted(REQUIRED_FIELDS - finding.keys())
    if missing:
        errors.append(f"{prefix}: missing fields: {', '.join(missing)}")

    for field in sorted(TEXT_FIELDS & finding.keys()):
        if not nonempty_string(finding[field]):
            errors.append(f"{prefix}.{field}: must be a non-empty string")

    for field in sorted(LIST_FIELDS & finding.keys()):
        value = finding[field]
        if not isinstance(value, list):
            errors.append(f"{prefix}.{field}: must be an array")
        elif not value:
            errors.append(f"{prefix}.{field}: must not be empty")
        elif not all(nonempty_string(item) for item in value):
            errors.append(
                f"{prefix}.{field}: every item must be a non-empty string"
            )

    for field, allowed in ENUMS.items():
        if field in finding and finding[field] not in allowed:
            errors.append(
                f"{prefix}.{field}: expected one of {', '.join(sorted(allowed))}"
            )

    finding_id = finding.get("id")
    if isinstance(finding_id, str):
        if not ID_PATTERN.fullmatch(finding_id):
            errors.append(
                f"{prefix}.id: use 5-81 uppercase letters, digits, or hyphens"
            )
        elif finding_id in seen_ids:
            errors.append(f"{prefix}.id: duplicate finding id")
        else:
            seen_ids.add(finding_id)

    if (
        finding.get("status") == "Hypothesis"
        and finding.get("severity") in {"Critical", "High"}
    ):
        warnings.append(
            f"{prefix}: high-impact hypothesis; make uncertainty explicit"
        )

    return errors, warnings


def load_document(path: Path) -> Any:
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        raise ValueError("UTF-8 BOM is not allowed")
    return json.loads(raw.decode("utf-8"))


def main() -> int:
    args = parse_args()
    path = Path(args.path).expanduser().resolve()
    try:
        document = load_document(path)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        print(f"Invalid input: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2

    errors = validate_secret_redaction(document)
    warnings: list[str] = []

    if isinstance(document, list):
        findings = document
    elif isinstance(document, dict):
        findings = document.get("findings")
        if not isinstance(findings, list):
            errors.append("$.findings: must be an array")
            findings = []
    else:
        errors.append("$: must be an object or array")
        findings = []

    seen_ids: set[str] = set()
    for index, finding in enumerate(findings):
        finding_errors, finding_warnings = validate_finding(
            finding, index, seen_ids
        )
        errors.extend(finding_errors)
        warnings.extend(finding_warnings)

    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)

    if errors:
        print(
            json.dumps(
                {"valid": False, "findings": len(findings), "errors": len(errors)}
            )
        )
        return 1

    print(
        json.dumps(
            {
                "valid": True,
                "findings": len(findings),
                "warnings": len(warnings),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
