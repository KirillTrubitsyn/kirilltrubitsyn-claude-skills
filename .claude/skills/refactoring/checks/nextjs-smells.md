# Next.js App Router smells

## Что проверять

Набор smells, специфичных именно для Next.js с App Router (`app/`). Правила актуальны для Next.js 15/16. Для Pages Router (`pages/`) многие пункты неприменимы.

Сначала определи версию по `package.json` — между 15 и 16 принципиально изменилась модель кэширования (Cache Components) и появился `proxy.ts` вместо `middleware.ts`. Next.js 16 требует Node.js 20.9+, а Turbopack стал дефолтным бандлером. Актуальная линия — 16.x (16.2, март 2026: ускоренный dev-старт, логирование server functions; 16.3, июнь 2026: persistent cache для билдов, Rust-порт React Compiler в Turbopack) — минорные релизы модель кэширования 16 не меняют.

### 1. Избыточное использование `"use client"`

Самый распространённый smell в App Router. `"use client"` «заражает» всё дерево: ребёнок серверного компонента становится клиентским, если родитель клиентский. Избыточные client-директивы увеличивают JS-бандл и теряют преимущества RSC.

**Признаки**:

- `"use client"` в `layout.tsx` корневого уровня.
- `"use client"` в компоненте, который не использует ни одного из: `useState`, `useEffect`, `onClick`, `onChange`, `useRouter`, browser API.
- `"use client"` в компоненте только потому, что один его потомок интерактивен.

**Рефакторинг**:

- По умолчанию — серверный компонент. Клиент — только для интерактивности.
- Изолируй клиентский «остров»: оставь оборачивающий компонент серверным, перенеси только `onClick`-кнопку в отдельный `ClientButton.tsx` с `"use client"`.
- Если компонент клиентский, но его children могут быть серверными — принимай children как пропс, это сохраняет серверный рендеринг вложенных:

```tsx
// ClientWrapper.tsx
"use client";
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div onClick={() => setOpen(!open)}>{children}</div>;
}

// page.tsx (server)
<ClientWrapper>
  <ServerOnlyContent /> {/* остаётся серверным */}
</ClientWrapper>
```

### 2. Нарушение server/client-границы

Серверные данные утекают в клиентский контекст, или наоборот.

**Признаки**:

- Несериализуемые объекты (функции, классы, Date в старых версиях) передаются как пропсы из server в client component.
- Переменные окружения без префикса `NEXT_PUBLIC_` используются в клиентском коде — рантайм-ошибка в production.
- `headers()`, `cookies()`, `draftMode()` вызываются в клиентском компоненте.
- Прямые SQL-запросы или работа с `fs` внутри файла с `"use client"`.

**Рефакторинг**: серверную работу оставляй на сервере; клиенту передавай только сериализуемые DTO. Для секретов — строго серверные переменные окружения и Server Actions для записи.

### 3. Антипаттерны fetch-а данных в RSC

- **Водопад запросов**: серверный компонент ждёт `await fetch(A)`, затем дочерний ждёт `await fetch(B)`. Если они независимы — это потеря времени.

  **Рефакторинг**: `Promise.all([fetchA, fetchB])`, или параллельные компоненты с `Suspense`-границами.

- **Дубли одних и тех же запросов в разных местах**: каждый компонент делает свой `fetch` того же URL.

  **Рефакторинг**: Next.js автоматически дедуплицирует идентичные fetch-запросы в рамках одного рендера. Убедись, что URL и опции идентичны. Для более сложных случаев — `React.cache()` вокруг data-access-функции; в Next.js 16 для дорогих вычислений и не-fetch источников — `"use cache"`.

- **Fetch в клиентском компоненте для начальной загрузки**: вместо RSC запрашиваем данные на клиенте после гидратации → мигающий UI, лишний JS.

  **Рефакторинг**: перенеси data fetching в серверный компонент, передавай данные как пропс. Клиентское состояние — только для interactive updates. Общий разбор антипаттерна «server state в client state» — `state-smells.md`, пункт 1.

### 4. Неявное или устаревшее кэширование

Модель кэширования менялась в каждой мажорной версии — это главный источник «загадочного» поведения:

- **Next.js 14**: агрессивное implicit-кэширование fetch и Route Handlers по умолчанию.
- **Next.js 15**: GET Route Handlers и fetch по умолчанию **не кэшируются**.
- **Next.js 16**: модель **Cache Components** — кэширование полностью explicit и opt-in. Включается `cacheComponents: true` в `next.config.ts`, кэшируемые страницы/компоненты/функции помечаются директивой `"use cache"`, время жизни задаётся через `cacheLife()`, инвалидация — через `cacheTag()` + `revalidateTag()` / `updateTag()` / `refresh()`. `cacheLife` и `cacheTag` стали стабильными (префикс `unstable_` больше не нужен). Флаги `experimental.dynamicIO` и `experimental.useCache` устарели — заменены top-level `cacheComponents`.

**Проверить**:

- Какая версия Next.js? (`package.json`).
- Используются ли явно `cache: "force-cache"`, `cache: "no-store"`, `revalidate`?
- Остался ли `unstable_cache` / `unstable_cacheLife` (на 16 — мигрировать на `"use cache"` + `cacheLife`)?
- При `cacheComponents: true`: помнит ли команда, что весь динамический код теперь выполняется на каждый запрос, пока явно не закэширован?

**Рефакторинг**: явно указывай стратегию кэширования для каждого data-доступа. Не полагайся на defaults, которые меняются между версиями. При апгрейде на 16 — `npx @next/codemod upgrade` выполняет значительную часть миграции механически.

### 5. Неправильное использование `layout.tsx`

- В `layout.tsx` делается fetch, который на самом деле нужен только одной странице.
- `layout.tsx` помечен как `"use client"` — тогда ВСЕ дочерние страницы теряют RSC.
- State в layout для модалок/меню, которое живёт между навигациями, — иногда это и нужно, но часто неожиданно.

**Рефакторинг**: fetch на уровне страницы, а не layout, если данные нужны только ей. Клиентскую логику layout'а выноси в отдельный клиентский подкомпонент.

### 6. Parallel Routes и Intercepting Routes без необходимости

Parallel routes (`@modal`, `@sidebar`) и intercepting routes (`(.)modal`) — мощные инструменты, но усложняют отладку. Их использование для простой модалки — overkill.

**Рефакторинг**: для диалогов внутри страницы — обычный клиентский state. Parallel/intercepting — только когда нужно, чтобы URL отражал состояние, и при deep link работала fallback-страница.

Внимание при апгрейде: в Next.js 16 каждый parallel-route slot обязан иметь явный `default.tsx` — без него билд падает.

### 7. Server Actions вместо API Routes там, где нужен API

- Server Action для публичного API, которое зовётся из мобильного приложения — не работает, Server Actions внутренний механизм.
- API Route для внутренней формы внутри приложения — лишний слой; Server Action проще.

**Рефакторинг**:

- Внутренние формы → Server Actions + `useActionState`, `useFormStatus`.
- Публичное API для внешних клиентов → Route Handlers (`app/api/.../route.ts`) или tRPC / oRPC.

### 8. Использование `generateStaticParams` + dynamic данные

Если страница строится статически (`generateStaticParams`), а внутри использует `cookies()` / `headers()` / `searchParams` — конфликт: либо Next.js выдаст ошибку, либо страница станет динамической.

**Рефакторинг**: явно определи, статическая страница или динамическая. Для частично динамических страниц — Partial Prerendering: статический shell + динамические куски в `<Suspense>`. В Next.js 16 PPR больше не экспериментальный флаг — включается через `cacheComponents: true` (сегментный `experimental_ppr` удалён).

### 9. Metadata разбросана по компонентам

`generateMetadata` используется непоследовательно: часть страниц имеет метаданные, часть нет, часть дублирует логику.

**Рефакторинг**: единый helper для построения Metadata из доменной модели; `generateMetadata` в каждой странице вызывает его.

### 10. Ошибки и loading не на месте

`loading.tsx` и `error.tsx` — route-level Suspense boundaries. Если их нет, весь сегмент ждёт самый медленный запрос; любая ошибка ломает страницу.

**Рефакторинг**:

- Добавь `loading.tsx` для каждого сегмента с медленной загрузкой.
- Добавь `error.tsx` для критичных сегментов (и `global-error.tsx` для корня).
- Для более гранулярных границ — `<Suspense>` и `<ErrorBoundary>` внутри разметки.

### 11. Middleware / Proxy делает слишком много

В Next.js 16 `middleware.ts` переименован в `proxy.ts` (экспорт `middleware` → `proxy`) и работает на **Node.js runtime**, а не Edge. Старый `middleware.ts` (Edge) deprecated и будет удалён. Конфиг-флаги тоже переименованы (`skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`).

Сам smell не изменился: этот код запускается на каждый запрос, тяжёлая логика там — проблема, даже без ограничений Edge.

**Признаки**:

- Импорт тяжёлых библиотек (ORM, криптография, image processing).
- Несколько fetch-ов для авторизации на каждый запрос.
- Проект на Next.js 16+ всё ещё держит логику в deprecated `middleware.ts`.

**Рефакторинг**: минимизируй proxy/middleware до редиректов, rewrites и проверок токенов. Тяжёлую логику вынеси в Route Handlers или Server Components. На Next.js 16 — механическое переименование `middleware.ts` → `proxy.ts` отдельным коммитом.

### 12. Клиентские env-переменные в большом количестве

`NEXT_PUBLIC_*` зашиваются в клиентский бандл. Если их много — часть из них, вероятно, не должна быть публичной.

**Рефакторинг**: каждую `NEXT_PUBLIC_*` переменную проверь: действительно ли клиент должен её видеть? Секреты (API-ключи с полным доступом, DB credentials) — строго без префикса.

### 13. Неправильная обработка Server Action errors

Server Action бросает исключение → клиент получает generic «something went wrong» без деталей.

**Рефакторинг**: возвращай из Server Action discriminated result (`{ success: true, data }` | `{ success: false, error }`). Используй `useActionState` для отображения.

### 14. Route Groups без цели

`(group)` — организационный приём, не должен влиять на URL. Если в проекте десятки route groups без чёткой логики группировки — это лишний шум.

**Рефакторинг**: используй route groups только для: (а) общего layout для части страниц, (б) разделения на логические секции (marketing vs app). Иначе — flat structure.

## Как искать в коде

```bash
# Излишние "use client" (клиентские без интерактивности)
grep -rln '"use client"' app/ components/ | while read f; do
  if ! grep -qE "useState|useEffect|onClick|onChange|onSubmit|useRouter|useFormState|useActionState" "$f"; then
    echo "Подозрительно клиентский: $f"
  fi
done

# "use client" в layout (find вместо glob — `**` работает не во всех шеллах)
find app -name "layout.tsx" -exec grep -l '"use client"' {} +

# fetch с неявной политикой кэширования
rg -n "fetch\(" -g '*.{ts,tsx}' app/ | rg -v "cache:|revalidate:|next:"

# Server-only API в клиентских компонентах
for f in $(grep -rln '"use client"' app/ components/); do
  grep -n "cookies()\|headers()\|draftMode()\|process\.env\.[A-Z_]*[^_]" "$f"
done

# Несериализуемое в пропсах (эвристика)
rg -n "<[A-Z][a-zA-Z]*\s+[a-zA-Z]+=\{.*function|<[A-Z][a-zA-Z]*\s+[a-zA-Z]+=\{.*new Date" -g '*.tsx'

# Отсутствие error.tsx и loading.tsx по сегментам
find app -type d -mindepth 1 | while read d; do
  [[ ! -f "$d/error.tsx" && -f "$d/page.tsx" ]] && echo "Нет error.tsx: $d"
  [[ ! -f "$d/loading.tsx" && -f "$d/page.tsx" ]] && echo "Нет loading.tsx: $d"
done

# Избыточное количество NEXT_PUBLIC_
grep -rn "NEXT_PUBLIC_" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*" | wc -l
```

## Полезные ссылки

- React team: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- Next.js docs: [Composition Patterns](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- Next.js docs: [Caching behavior](https://nextjs.org/docs/app/deep-dive/caching)
- Next.js blog: [Next.js 16 — Cache Components, Turbopack, proxy.ts](https://nextjs.org/blog/next-16)
- Next.js docs: [Upgrading to Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- Next.js docs: [cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
