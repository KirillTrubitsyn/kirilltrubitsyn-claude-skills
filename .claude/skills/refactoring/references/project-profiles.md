# Профили известных проектов

Профили трёх рабочих репозиториев владельца. Работая в одном из них, читай его раздел ДО шага 1 (автодетекции): здесь точные команды проверок и опасные зоны, которые автодетекция не увидит. Профили собраны 2026-08-21 по фактическому состоянию репозиториев; при расхождении с живым кодом верь коду и CI, а профиль пометь как устаревший в отчёте.

Общее для всех трёх: рабочая среда владельца — полностью облачная (Claude Code on the web), команды выполняет агент в контейнере сессии; всё ценное коммитится и пушится на ветку сессии, контейнер эфемерный.

## VASRF (CasusLegal) — `KirillTrubitsyn/VASRF`

Монорепо продукта: MCP-сервер поиска судебной практики + Telegram-бот + SPA-кабинет + статический лендинг.

- **Стек**: Python 3.11 (`app/` — FastAPI/uvicorn MCP-сервер, `bot/` — Telegram-бот); `web/` — React 18.3 + TypeScript 5.6 + Vite 5 (SPA кабинета); `landing/` — статические HTML; alembic-миграции; деплой Railway (4 сервиса).
- **Проверки (из `.github/workflows/ci.yml`)**:
  - линт: `ruff check app bot tests` — **`scripts/` сознательно НЕ линтуется** («боевой архив» одноразовых скриптов, см. CLAUDE.md) — не предлагай его чистку как находку по умолчанию;
  - тесты: `pytest -q` c `PYTHONHASHSEED=0`; часть тестов требует реальных Postgres (`VASRF_TEST_PG_DSN`) и Redis (`VASRF_TEST_REDIS_URL`) и без них скипается — это норма, не дефект;
  - mypy: `strict = true` в pyproject, но **в CI не гейтится** (~125 замечаний, чистка — отдельная задача); не выдавай это за свежую находку;
  - `web/`: тестов нет; проверка — `tsc -b && vite build` (`npm run build` в `web/`).
- **Ruff-конфиг знает о проекте больше линтера**: `E501` и `RUF001/002/003` отключены из-за русскоязычных строк, документирующие `noqa` намеренны (`RUF100` в ignore). Не «чини» это.
- **Опасные зоны**:
  - `landing/**` частично обновляется CI: цифры корпуса патчит `scripts/corpus_stats.py` (workflow `corpus-stats.yml`), ссылки `/case/<id>` перевыпускает `landing-eternal-links.yml`. Ручной рефакторинг этих мест перезатрётся или сломает гард;
  - `data/`, `*_delta/`, `gold/` — данные корпусов, не код;
  - **намеренные зеркала-дубли под гард-тестами**: `bot/config.py` ↔ `app/config.py` (канареечные бакеты, лимиты), Python- и SQL-классификаторы `client_env` из одного списка, пять Lua-гейтов общего бюджета. «Устранить дублирование» здесь = сломать гард; сперва грепни `tests/` по имени конструкции;
  - fail-open-ветки (сбой Redis/БД → доступ разрешён) и «мягкий JSON вместо 401» — продуктовые решения (claude.ai защёлкивает коннектор на 401), не небрежность;
  - уборка в `finally`, `asyncio.shield`, `CancelledError` — выстраданные инварианты (см. CLAUDE.md, разборы #814/#817): не упрощай.
- **Конституция**: корневой `CLAUDE.md` — очень подробный, содержит десятки «не трогать/не возвращать»; перед правкой любого подозрительного места ищи его упоминание там. Отчёты рефакторинга проект хранит в корне: `refactoring-report-YYYY-MM-DD.md` (уже есть три — делай delta против последнего).
- **Гард-культура**: почти каждый инвариант закрыт тестом `tests/test_*.py` (173 файла). Flaky-карантин запрещён культурой проекта — падающий тест разбирается до причины.

## glossa — `KirillTrubitsyn/glossa`

MCP-коннектор и сайт по книгам «Глосса» (парсер PDF → корпус → сервер поиска).

- **Стек**: только Python 3.11 (`server/` — MCP-сервер на starlette/uvicorn, `parser/` — разбор томов, `embeddings/`); JS/TS нет; `pyproject.toml`/`pytest.ini` нет; деплой Docker + Railway + отдельный контур через Caddy (`deploy/`).
- **Проверки — БЕЗ pytest**: тесты — самостоятельные скрипты со своим раннером и `sys.exit`. Запуск как в CI (`deploy-ru.yml`): `cd server && PYTHONPATH=. python test_roles.py` (и далее по списку: test_internalapi, test_oauth, test_admin, test_admin_keys, test_private, test_security, test_accounts, test_feedback, test_mailer, test_mailqueue, test_notes…); полный перечень — в `AGENTS.md`, раздел «Как запускать». В parser — `python parser/test_textclean.py` и соседние. `pytest`-команды здесь не работают — не предлагай их.
- **Линтеров и тайпчекеров нет вовсе** (единственный автогейт — еженедельный `pip-audit`). Введение ruff/mypy — отдельное предложение пользователю, не самовольная правка конфигов.
- **Версии зависимостей прибиты точно** (`server/requirements.txt`, `==`), комментарий в файле запрещает возврат к `>=` — не «модернизируй».
- **Опасные зоны**:
  - `parser/out/` (592 МБ) — корпус, который генерируют и коммитят workflow (`embeddings.yml`, `casus-match.yml`, `page-map.yml`, `practice-since-book.yml`); также CI коммитит `server/bench/retrieval_snapshot_*.json` и `server/examples/*.html`. Руками не редактировать; после переименования чего-либо в `parser/out` — грепнуть `.github/workflows` (пути в `git add` перечислены дословно, правило 7 AGENTS.md);
  - `server/` не должен импортировать из `parser/` ничего сверх `COPY`-строк `server/Dockerfile` — гард `server/test_support.py`;
  - схему записей корпуса и формат `id` не менять (правило 6); `GLOSSA_LINK_KEY`/`MCP_SECRET_KEY` не ротировать (правило 10);
  - `books/*.pdf` — под копирайтом; `docs/glossa-poisk-po-tomam.html` правится руками, остальные примеры — скриптами.
- **Конституция**: `AGENTS.md` (25 КБ, раздел «Жёсткие правила») — здесь он играет роль CLAUDE.md. Гард-тесты фиксируют неочевидные инварианты (`test_vectors.py` — порядок id в `.npy`; `test_notes.py` — посимвольное равенство рендера; `test_practice_retained.py` — кураторский вердикт переживает дрейф поиска): падение такого теста после «безобидного» рефакторинга = реальная регрессия.
- **Хотспоты по истории**: `server/glossa_server.py`, `server/accounts.py`, `server/pagerender.py` (4 806 строк), `server/auth.py`, `server/admin.py`.

## sgc-legal-ai — `KirillTrubitsyn/sgc-legal-ai`

Юридический AI-сервис: FastAPI-бэкенд + Next.js-фронтенд.

- **Стек**: `backend/` — Python 3.12, FastAPI 0.125, Pydantic v2, Supabase (REST), Redis, grpc-клиент КонсультантПлюс (~88K LOC Python); `frontend/` — Next.js 14.2 (App Router) + React 18.3 + TS 5.3 (strict) + Tailwind (~48K LOC TS/TSX). Lock-файлов нет (`package-lock.json` в .gitignore).
- **Проверки (из `.github/workflows/tests.yml`, только backend)**: cwd `backend/`, `pip install -r requirements.txt && pip install pytest pytest-asyncio`, затем `python -m pytest tests/ -v` (~675 тестов в 56 файлах). Frontend в CI не гоняется; его гейт — `npm run build` (= `next build`) в `frontend/`; `tsc --noEmit` доступен после `npm install`. Единственный фронт-тест запускается `node frontend/tests/sw-navigation.test.mjs`.
- **Линтеров нет** (ни eslint-конфига, ни ruff/mypy, ни pre-commit) — как в glossa: предлагать, не вводить самовольно.
- **Хрупкость тестов**: `backend/tests/conftest.py` мокает `app.config`, `app.database`, `app.messages` и тяжёлые сервисы через `sys.modules` — **рефакторинг импортов/имён модулей ломает тестовый бутстрап**, проверяй его первым. Golden-master `backend/tests/golden/penalty_docx_*.txt` сравнивается байт-в-байт — не переформатируй. `backend/test_cache_monitoring.py` и `backend/test_consultant_api.py` лежат вне `tests/` и CI их не видит.
- **Опасные зоны**:
  - `backend/app/services/consultant_api/generated/*_pb2*.py` — сгенерированный protobuf, не трогать;
  - SQL-миграции (`database/*.sql`, `backend/supabase/migrations/`, корневые `SUPABASE_*.sql`) — применённые, append-only;
  - `frontend/next.config.js`, `backend/Dockerfile`, `backend/railway.toml` содержат комментарии-решения (прокси `/api/*` для httpOnly-кук, `watchPatterns` против рестарта SSE) — не «чистить»;
  - `backend/scripts/{log_digest,quality_probe,run_job}.py` — их CLI-контракт (`python -m scripts.<name>`, флаги `--check/--yes/--dry-run/--notify/--max-failures`) зовут плановые workflow, ходящие в прод; переименование ломает кроны;
  - `backend/skills/court-practice/data/court_practice_db.json` (22 МБ) — данные.
- **Конституция**: CLAUDE.md **сознательно отсутствует и в .gitignore («may contain secrets») — не создавать и не коммитить его**. Правила задают `.claude/commands/refactoring.md` (шаг 0 — прочитать последний отчёт `reports/refactoring/*.md` и делать delta; без явной цели — только hotspot-диагностика без правок) и `reports/refactoring/README.md` (отчёты append-only, старые не переписывать). При работе в этом репозитории команда проекта имеет приоритет над этим скиллом.
- **Известные крупные цели** (из прошлых отчётов, перепроверь актуальность): `backend/app/database.py` — God Module ~4300 строк (re-export shim к repositories); задокументированное расхождение дублированной 2FA-логики; `chat_file_indexer.py` — возможно мёртвый, но удаление только с подтверждения владельца.
