# Python smells

## Что проверять

Smells, специфичные для Python-кодовых баз: сервисы (FastAPI / Django / Flask / aiohttp), скрипты, пайплайны данных, боты. Применяй вместе с `classical-smells.md` (та таксономия универсальна) — здесь только то, что в ней не покрыто или в Python выглядит иначе.

### 1. Mutable default arguments

```python
# Smell — список создаётся ОДИН раз при определении функции
def append_tag(doc, tags=[]):
    tags.append(doc.tag)
    return tags
```

Все вызовы без аргумента делят один и тот же список — классический источник «призрачных» багов.

**Рефакторинг**: sentinel `None`:

```python
def append_tag(doc, tags=None):
    tags = [] if tags is None else tags
```

Ловится автоматически: `ruff check --select B006,B008` (B008 — вызовы функций в дефолтах, например `datetime.now()`).

### 2. Голый / слишком широкий except

```python
# Smell
try:
    process(item)
except:            # ловит и KeyboardInterrupt, и SystemExit
    pass           # и молча съедает всё
```

**Рефакторинг**: лови конкретные исключения; если нужен catch-all на границе (обработчик запроса, воркер) — логируй с traceback и пробрасывай или явно переводи в ответ об ошибке. `except Exception: pass` без логирования — всегда smell. Правила: ruff `E722`, `BLE001`, `S110`.

### 3. Блокирующие вызовы внутри `async def`

```python
# Smell — блокирует event loop, все конкурентные запросы встают
async def handler(request):
    data = requests.get(url).json()   # sync HTTP
    time.sleep(1)                     # sync sleep
```

**Признаки**: `requests`, `time.sleep`, синхронные драйверы БД (`psycopg2` без пула-обёртки), тяжёлый CPU-код (лемматизация, ранжирование) прямо в корутине.

**Рефакторинг**: `httpx.AsyncClient` / `aiohttp`, `asyncio.sleep`, async-драйверы (asyncpg); CPU-bound — в `run_in_executor` / отдельный процесс, либо честно оставить endpoint синхронным (FastAPI сам уведёт его в threadpool). Правила: ruff `ASYNC` (ASYNC100/210/230/251).

### 4. Отсутствие типизации на публичных границах

Функции без аннотаций, `dict` в качестве интерфейса между модулями, `# type: ignore` россыпью.

**Рефакторинг**: аннотируй публичные границы (сигнатуры функций модуля, DTO), запусти `mypy` / `pyright` и включай strict поэтапно — как описано для TS в `typescript-smells.md` (одна настройка → baseline → файл за файлом). Полная типизация внутренностей — не самоцель.

### 5. Dict-обсессия

Один и тот же безымянный `dict` с «известными» ключами гуляет через пять функций; опечатка в ключе — runtime KeyError.

**Рефакторинг**: `@dataclass` (внутренние структуры), `NamedTuple` (лёгкие немутируемые), pydantic `BaseModel` (валидация на входе: API, конфиги, JSONL). Это Python-версия Introduce Parameter Object / Encapsulate Record.

### 6. Магические строки-режимы вместо Enum / Literal

`if mode == "bm25"` в десяти местах; опечатка `"bm52"` не ловится ничем.

**Рефакторинг**: `Literal["bm25", "vector", "hybrid"]` в сигнатурах (проверяет mypy/pyright) или `enum.StrEnum`. Аналог discriminated union из TS.

### 7. Тяжёлая работа при импорте модуля

```python
# Smell — module-level side effect
INDEX = load_index("data/index.pkl.gz")   # выполняется при import
```

Импорт модуля читает файлы / ходит в сеть / строит индекс → медленный старт, невозможность импортировать модуль в тестах, сюрпризы при multi-worker запуске (каждый воркер повторяет работу).

**Рефакторинг**: ленивая инициализация — фабрика, `functools.lru_cache`-обёртка или явный `init()` на старте приложения (lifespan в FastAPI). На уровне модуля — только константы и определения.

### 8. Скрытое глобальное состояние на уровне модуля

Module-level mutable синглтоны (`_cache = {}`, `engine = ...`), которые мутируются из разных мест. Усложняет тесты (состояние течёт между ними) и multi-worker деплой (`/admin`-ручка меняет состояние только своего процесса — остальные воркеры живут со старым).

**Рефакторинг**: передавай зависимости параметрами (function-level DI), для FastAPI — `Depends` / `app.state`; для тестов — фабрики с in-memory реализациями. Если глобальный объект оправдан (тяжёлый индекс) — оформи явный контейнер с документированным протоколом подмены.

### 9. Циклические импорты и импорты внутри функций как костыль

`import` посреди функции «потому что иначе circular import» — симптом запутанных границ модулей.

**Рефакторинг**: выпрямить зависимости (вынести общий тип/протокол в отдельный модуль ниже обоих), `typing.TYPE_CHECKING` для аннотаций. Границы фиксируй `import-linter` (контракты «domain не импортирует web»), аналог dependency-cruiser.

### 10. `os.path`-конкатенации и строковые пути

`open(dir + "/" + name)`, `os.path.join` вперемешку со строками.

**Рефакторинг**: `pathlib.Path` последовательно по всей кодовой базе. Ловится ruff `PTH`.

### 11. `print` вместо logging и eager f-string в логах

```python
print(f"processed {n}")          # не фильтруется по уровням, теряется в проде
logger.debug(f"heavy: {expensive()}")  # expensive() выполнится даже при выключенном DEBUG
```

**Рефакторинг**: `logging` с уровнями; в вызовах логгера — ленивые параметры: `logger.debug("heavy: %s", value)`. Правила: ruff `T201`, `G004`.

### 12. Ресурсы без контекстных менеджеров

`open()` / сессии / соединения без `with` — утечки дескрипторов при исключениях.

**Рефакторинг**: `with` / `async with`; для собственных ресурсов — `contextlib.contextmanager`. Правило: ruff `SIM115`.

### 13. Наследование ради переиспользования, mixin-лапша

Иерархии `BaseHandler → JsonHandler → CachedJsonHandler` c переопределением половины методов — Python-версия Refused Bequest.

**Рефакторинг**: композиция + `Protocol` (структурная типизация вместо ABC там, где нужен только контракт); Replace Inheritance with Delegation.

### 14. Копипаст-скрипты рядом с библиотечным кодом

Каталог `scripts/` из почти одинаковых файлов, отличающихся парой констант (парсеры разных корпусов, генераторы тегов). Изменение логики требует правки всех копий — Shotgun Surgery.

**Рефакторинг**: выдели общее ядро в переиспользуемый модуль, скрипты сведи к тонким CLI-обёрткам с параметрами (`argparse`). Дубли ищи `jscpd` — он умеет Python.

## Как искать в коде

```bash
# Один прогон ruff покрывает большинство пунктов выше:
ruff check --select B006,B008,E722,BLE001,S110,ASYNC,PTH,T201,G004,SIM115,C901 .

# Типизация: доля неаннотированных публичных функций
ruff check --select ANN001,ANN201 app/ | wc -l
mypy app/ --ignore-missing-imports          # или pyright

# Сложность и длина функций (ранг C и хуже — кандидаты):
radon cc -s -n C .
xenon --max-absolute D --max-average B .    # как CI-gate

# Dead code:
vulture app/ scripts/ --min-confidence 80

# Дублирование (jscpd умеет Python):
npx jscpd --min-lines 10 --min-tokens 50 --pattern "**/*.py" .

# Циклические импорты:
pydeps app --show-cycles --no-output
lint-imports                                 # import-linter, контракты в setup.cfg/pyproject

# Блокирующие вызовы в async-файлах:
rg -l "async def" -g '*.py' | xargs rg -n "time\.sleep\(|requests\.(get|post)"

# Module-level side effects (эвристика: вызовы на верхнем уровне):
rg -n "^[A-Z_]+ = \w+\(" -g '*.py' | rg -v "TypeVar|Enum|namedtuple|Field"

# Голые except:
rg -n "except\s*:" -g '*.py'
```

## Пороги метрик

| Метрика | Порог внимания | Порог действия |
|---|---|---|
| Cyclomatic complexity (radon rank) | C | D и хуже |
| Длина функции (строки) | > 40 | > 80 |
| Длина модуля (строки) | > 500 | > 1000 |
| Число параметров | > 5 | > 8 |
| `# type: ignore` на модуль | > 3 | > 10 |
| Голых `except:` в кодовой базе | 1 | — чинить все |

Пороги — ориентиры. Скрипт-однодневка и ядро сервиса заслуживают разной строгости; для ядра пороги жёстче.

## Инструменты

- **ruff** — линтер+фиксер, заменяет flake8/isort/pyupgrade и часть pylint; основной инструмент.
- **mypy / pyright** — типы; strict включать поэтапно.
- **radon / xenon** — cyclomatic complexity, maintainability index; xenon как CI-gate.
- **vulture** — dead code.
- **import-linter / pydeps** — границы модулей и циклы.
- **jscpd** — дубли (мультиязычный, Python поддерживает).
- **pytest --cov**, **hypothesis** (property-based), **mutmut** (mutation testing) — качество safety net, см. `safety-net.md` и `test-smells.md`.

## Ссылки

- Ruff rules: [https://docs.astral.sh/ruff/rules/](https://docs.astral.sh/ruff/rules/)
- import-linter: [https://import-linter.readthedocs.io/](https://import-linter.readthedocs.io/)
- Brett Slatkin. *Effective Python*, 2nd ed.
- Martin Fowler. *Refactoring*, 2nd ed. — каталог применим к Python без изменений.
