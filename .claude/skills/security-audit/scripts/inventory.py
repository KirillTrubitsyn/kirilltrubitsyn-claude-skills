#!/usr/bin/env python3
"""Create a deterministic, metadata-only repository inventory."""

from __future__ import annotations

import argparse
import collections
import json
import os
import sys
from pathlib import Path


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="strict")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="strict")


IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".next",
    ".nuxt",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".tox",
    ".venv",
    "venv",
    "__pycache__",
    "bower_components",
    "coverage",
    "dist",
    "build",
    "node_modules",
    "target",
}

MANIFEST_NAMES = {
    "bun.lock",
    "bun.lockb",
    "cargo.lock",
    "cargo.toml",
    "composer.json",
    "composer.lock",
    "deno.json",
    "deno.lock",
    "gemfile",
    "gemfile.lock",
    "go.mod",
    "go.sum",
    "gradle.properties",
    "package-lock.json",
    "package.json",
    "pnpm-lock.yaml",
    "poetry.lock",
    "pom.xml",
    "pyproject.toml",
    "requirements.txt",
    "uv.lock",
    "yarn.lock",
}

SECURITY_FILE_NAMES = {
    ".dockerignore",
    ".env",
    ".env.example",
    ".gitignore",
    ".npmrc",
    ".pypirc",
    "docker-compose.yml",
    "docker-compose.yaml",
    "dockerfile",
    "security.md",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Inventory repository metadata without reading file contents, "
            "following symlinks, writing files, or using the network."
        )
    )
    parser.add_argument("root", nargs="?", default=".", help="Repository root")
    parser.add_argument(
        "--max-files",
        type=int,
        default=250_000,
        help="Stop after this many regular files (default: 250000)",
    )
    return parser.parse_args()


def relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def is_manifest(path: Path) -> bool:
    name = path.name.lower()
    return (
        name in MANIFEST_NAMES
        or name.startswith("requirements-") and name.endswith(".txt")
        or name.startswith("dockerfile")
    )


def is_security_relevant(path: Path, root: Path) -> bool:
    name = path.name.lower()
    rel_parts = {part.lower() for part in path.relative_to(root).parts}
    return (
        name in SECURITY_FILE_NAMES
        or name.startswith(".env.")
        or name.endswith((".tf", ".tfvars"))
        or ".github" in rel_parts
        and "workflows" in rel_parts
        or ".gitlab-ci.yml" == name
        or "cloudformation" in name
        or "kubernetes" in rel_parts
        or "helm" in rel_parts
    )


def build_inventory(root: Path, max_files: int) -> dict[str, object]:
    extensions: collections.Counter[str] = collections.Counter()
    manifests: list[str] = []
    security_files: list[str] = []
    skipped_directories: list[str] = []
    errors: list[dict[str, str]] = []
    file_count = 0
    directory_count = 0
    symlink_count = 0
    total_bytes = 0
    truncated = False

    for current, directories, files in os.walk(
        root, topdown=True, followlinks=False
    ):
        current_path = Path(current)
        directory_count += 1

        kept_directories: list[str] = []
        for directory in sorted(directories, key=str.casefold):
            candidate = current_path / directory
            if candidate.is_symlink():
                symlink_count += 1
                skipped_directories.append(relative(candidate, root))
            elif directory.lower() in IGNORED_DIRS:
                skipped_directories.append(relative(candidate, root))
            else:
                kept_directories.append(directory)
        directories[:] = kept_directories

        for filename in sorted(files, key=str.casefold):
            path = current_path / filename
            rel = relative(path, root)
            try:
                if path.is_symlink():
                    symlink_count += 1
                    continue
                stat = path.stat()
            except OSError as exc:
                errors.append({"path": rel, "error": type(exc).__name__})
                continue

            file_count += 1
            total_bytes += stat.st_size
            suffix = path.suffix.lower() or "[no extension]"
            extensions[suffix] += 1

            if is_manifest(path):
                manifests.append(rel)
            if is_security_relevant(path, root):
                security_files.append(rel)

            if file_count >= max_files:
                truncated = True
                break
        if truncated:
            break

    return {
        "root": str(root),
        "mode": "metadata-only",
        "file_count": file_count,
        "directory_count": directory_count,
        "symlink_count": symlink_count,
        "total_bytes": total_bytes,
        "truncated": truncated,
        "extensions": dict(
            sorted(extensions.items(), key=lambda item: (-item[1], item[0]))
        ),
        "manifests": sorted(manifests, key=str.casefold),
        "security_relevant_files": sorted(security_files, key=str.casefold),
        "skipped_directories": sorted(
            skipped_directories, key=str.casefold
        ),
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    if args.max_files < 1:
        print("--max-files must be greater than zero", file=sys.stderr)
        return 2

    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        return 2

    result = build_inventory(root, args.max_files)
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
