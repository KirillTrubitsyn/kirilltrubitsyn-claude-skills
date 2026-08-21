#!/usr/bin/env python3
"""Hotspot-анализ по Tornhill: churn (частота изменений) x размер файла.

Read-only: читает git log и файлы, ничего не меняет. Только stdlib.

Примеры:
  python3 scripts/hotspots.py                          # текущий репозиторий, за год
  python3 scripts/hotspots.py --repo /path --since "6 months ago" --top 30
  python3 scripts/hotspots.py --ext py --ext ts --json

Особенности:
  - rename-aware: переименования (git --name-status, статус R) склеиваются в одну
    цепочку, churn старого имени засчитывается новому;
  - коммиты ботов (github-actions и т.п.) и merge-коммиты исключены — массовые
    автокоммиты (данные корпусов, format, codemod) не должны раздувать churn;
  - исключены типичные каталоги данных/генерации (настраивается --exclude).
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

DEFAULT_EXCLUDES = [
    "node_modules/*", "dist/*", "build/*", ".next/*", "vendor/*",
    "data/*", "*/data/*", "parser/out/*", "*_delta/*", "gold/*",
    "*/generated/*", "*_pb2*.py", "*.min.js", "*.lock", "*.snap",
    "*/migrations/*", "alembic/versions/*",
]
DEFAULT_EXTS = ["py", "ts", "tsx", "js", "jsx", "go", "rs"]
BOT_AUTHOR_MARKERS = ("github-actions", "[bot]", "dependabot")


def run_git(repo: str, *args: str) -> str:
    res = subprocess.run(
        ["git", "-C", repo, *args],
        capture_output=True, text=True, check=True,
    )
    return res.stdout


def collect_churn(repo: str, since: str, exts: list[str], excludes: list[str],
                  include_bots: bool) -> Counter:
    """Считает churn по файлам с учётом переименований (лог от старых к новым)."""
    log = run_git(
        repo, "log", "--reverse", "--no-merges", f"--since={since}",
        "--name-status", "-M", "--pretty=format:@@%an",
    )
    churn: Counter = Counter()
    renames: dict[str, str] = {}  # старое имя -> актуальное
    skip_commit = False
    ext_set = {e.lstrip(".") for e in exts}

    def resolve(path: str) -> str:
        seen = set()
        while path in renames and path not in seen:
            seen.add(path)
            path = renames[path]
        return path

    def wanted(path: str) -> bool:
        if "." not in path or path.rsplit(".", 1)[1] not in ext_set:
            return False
        return not any(fnmatch.fnmatch(path, pat) for pat in excludes)

    for line in log.splitlines():
        if line.startswith("@@"):
            author = line[2:].lower()
            skip_commit = (not include_bots) and any(
                m in author for m in BOT_AUTHOR_MARKERS
            )
            continue
        if skip_commit or not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R") and len(parts) == 3:
            old, new = parts[1], parts[2]
            old_resolved = resolve(old)
            if old_resolved != new:
                carried = churn.pop(old_resolved, 0)
                renames[old_resolved] = new
                if wanted(new):  # переехал за пределы scope — churn не тащим
                    churn[new] += carried
            if wanted(new):
                churn[new] += 1
        elif len(parts) == 2:
            path = resolve(parts[1])
            if wanted(path):
                churn[path] += 1
    return churn


def line_count(path: Path) -> int:
    try:
        with open(path, "rb") as fh:
            return sum(1 for _ in fh)
    except OSError:
        return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", default=".", help="корень git-репозитория")
    ap.add_argument("--since", default="1 year ago", help='окно истории (git --since)')
    ap.add_argument("--top", type=int, default=20, help="сколько строк вывести")
    ap.add_argument("--ext", action="append", dest="exts", metavar="py",
                    help="расширение (повторяемо); по умолчанию: %s" % ",".join(DEFAULT_EXTS))
    ap.add_argument("--exclude", action="append", dest="excludes", metavar="GLOB",
                    help="доп. glob-исключение (повторяемо)")
    ap.add_argument("--include-bots", action="store_true",
                    help="учитывать коммиты ботов (по умолчанию исключены)")
    ap.add_argument("--json", action="store_true", help="вывод в JSON")
    args = ap.parse_args()

    exts = args.exts or DEFAULT_EXTS
    excludes = DEFAULT_EXCLUDES + (args.excludes or [])

    try:
        shallow = run_git(args.repo, "rev-parse", "--is-shallow-repository").strip() == "true"
        if shallow:
            oldest = run_git(args.repo, "log", "--reverse", "--format=%cs").splitlines()
            edge = oldest[0] if oldest else "?"
            print(
                f"ВНИМАНИЕ: клон неглубокий (история только с {edge}) — окно "
                f"'{args.since}' фактически урезано. Для честного churn выполни "
                f"git fetch --unshallow (read-only для worktree) и перезапусти.\n",
                file=sys.stderr,
            )
        churn = collect_churn(args.repo, args.since, exts, excludes, args.include_bots)
    except subprocess.CalledProcessError as exc:
        print(f"git error: {exc.stderr.strip()}", file=sys.stderr)
        return 2
    except FileNotFoundError:
        print("git не найден в PATH", file=sys.stderr)
        return 2

    rows = []
    repo_root = Path(args.repo)
    for path, n in churn.items():
        fp = repo_root / path
        if not fp.is_file():
            continue  # файл удалён — не hotspot
        loc = line_count(fp)
        rows.append({"file": path, "churn": n, "loc": loc, "score": n * loc})
    rows.sort(key=lambda r: r["score"], reverse=True)
    rows = rows[: args.top]

    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print(f"Hotspots (окно: {args.since}; score = churn x LOC; боты "
              f"{'включены' if args.include_bots else 'исключены'})\n")
        print(f"{'score':>10}  {'churn':>5}  {'loc':>6}  file")
        for r in rows:
            print(f"{r['score']:>10}  {r['churn']:>5}  {r['loc']:>6}  {r['file']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
