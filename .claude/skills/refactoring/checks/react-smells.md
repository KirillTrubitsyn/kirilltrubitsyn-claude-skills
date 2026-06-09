# React-специфичные smells

## Что проверять

Классические smells + набор, специфичный именно для React. Правила актуальны для React 19.x (включая RSC и React Compiler). Зафиксируй точную версию из `package.json`: проекты на React 19.0–19.2.2 нужно немедленно обновить до ≥ 19.2.3 (CVE-2025-55182 — RCE в React Server Components) — это не рефакторинг, а блокирующий security-фикс отдельным коммитом.

### 1. Prop Drilling

Пропсы передаются через 3+ промежуточных компонента без использования.

```tsx
// Smell
<App user={user}>
  <Layout user={user}>
    <Header user={user}>
      <Avatar user={user} />
```

**Рефакторинг**:

- Compound Components — родительский компонент даёт контекст, дочерние читают.
- Component Composition — передавай сами элементы как `children`, а не пропсы-примитивы:
  ```tsx
  // Вместо <Layout headerProps={...}>
  <Layout header={<Header user={user} />}>
  ```
- React Context — для действительно глобальных значений (тема, текущий пользователь, локаль).
- Custom Hook + data source — `useUser()` вместо пропса `user`.

Не используй Context для всего подряд — он превращается в скрытый глобальный стор и приводит к ненужным ре-рендерам.

### 2. useEffect для производного состояния (derived state)

Эффект, который при изменении пропса синхронизирует `useState`, — почти всегда ошибка.

```tsx
// Smell
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// Правильно
const fullName = `${firstName} ${lastName}`;
```

Если вычисление дорогое — `useMemo`. Если зависит от пропса и нужно «сбросить» при смене — ключ на компоненте (`<Profile key={userId} />`), а не effect.

### 3. useEffect для событий

Эффект, который запускается «после рендера» для реакции на пользовательское действие, — ошибка. Событийная логика должна быть в обработчиках событий.

```tsx
// Smell: эффект как reaction на клик
const [submitted, setSubmitted] = useState(false);
useEffect(() => {
  if (submitted) {
    sendAnalytics();
    navigate("/thanks");
  }
}, [submitted]);

// Правильно: логика в обработчике
function handleSubmit() {
  sendAnalytics();
  navigate("/thanks");
}
```

Ссылка: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — обязательное чтение.

### 4. Key-as-index

Использование индекса массива в качестве ключа ломает identity при reorder / insert / delete.

```tsx
// Smell
{items.map((item, i) => <Row key={i} {...item} />)}

// Правильно
{items.map(item => <Row key={item.id} {...item} />)}
```

Индекс допустим только для статического списка, в котором порядок никогда не меняется.

### 5. Inline-функции и объекты в пропсах критичных компонентов

Каждый рендер создаёт новую ссылку → `React.memo`-дочерний компонент ре-рендерится.

```tsx
// Smell, если ExpensiveList обёрнут в memo
<ExpensiveList
  items={data}
  onSelect={(id) => setSelected(id)}
  config={{ sortable: true }}
/>

// Правильно
const handleSelect = useCallback((id: string) => setSelected(id), []);
const config = useMemo(() => ({ sortable: true }), []);
<ExpensiveList items={data} onSelect={handleSelect} config={config} />
```

Важно: без `React.memo` у дочернего компонента такая оптимизация бесполезна. Не бросай `useCallback`/`useMemo` на всё — только там, где измерено.

**React Compiler 1.0 стабилен** (октябрь 2025) и автоматизирует мемоизацию на этапе сборки. Проверь, включён ли он: `babel-plugin-react-compiler` в babel-конфиге или `reactCompiler` в `next.config.ts` (Next.js 16 поддерживает его из коробки). Если включён — ручная мемоизация в новом коде не нужна, а существующие `useCallback`/`useMemo` можно постепенно удалять, проверяя DevTools Profiler. Внедрять компилятор безопаснее инкрементально: `compilationMode: "annotation"` + директива `"use memo"` по файлам, предварительно прогнав правила компилятора из `eslint-plugin-react-hooks@6` (компилятор молча пропускает файлы с нарушениями Rules of React).

### 6. Children-as-function утечки

Паттерн render-props с функцией в children часто ведёт к новой ссылке каждый рендер.

```tsx
// Smell
<DataLoader>
  {(data) => <List data={data} />}
</DataLoader>
```

**Рефакторинг**: стабильная функция через `useCallback`, или предпочти Compound Components / Custom Hook.

### 7. Стейт, который должен быть у родителя (или наоборот)

- State lifted слишком высоко → родитель ре-рендерится при каждом вводе символа в input.
- State lifted слишком низко → два sibling-а не могут синхронизироваться, костыли через effect.

**Рефакторинг**: подними состояние до ближайшего общего предка (lifting state up). Для сложных случаев — state machine (xstate) или выделенный store (Zustand для client state).

### 8. Гигантский компонент (>300 строк JSX)

Обычно совмещает fetch, form, presentation и business logic.

**Рефакторинг**:

- Extract Custom Hook для логики (`useFormData`, `useAuth`, `useDebouncedValue`).
- Extract Component для кусков разметки (`<FormField>`, `<UserAvatar>`).
- Разделение container/presentational (хотя с хуками это менее жёстко, чем раньше).

### 9. useRef как скрытый state

`useRef` для значения, которое влияет на рендер, — антипаттерн. Ref не вызывает ре-рендер. Если значение должно отражаться в UI — это `useState`.

### 10. Неправильные зависимости useEffect / useMemo / useCallback

- Массив зависимостей вручную «оптимизирован» (что-то пропущено) → stale closures.
- `eslint-plugin-react-hooks/exhaustive-deps` должен быть `error`, не `warn`. Используй `eslint-plugin-react-hooks@6+` — flat config по умолчанию, понимает `useEffectEvent`, опциональные правила на базе React Compiler.
- Если ESLint требует зависимости, которая «не нужна» — проблема не в ESLint, а в дизайне компонента.
- Каждый `// eslint-disable-next-line react-hooks/exhaustive-deps` в кодовой базе — кандидат на рефакторинг через **`useEffectEvent`** (стабилен с React 19.2): он выделяет «событийную» часть логики из эффекта, всегда видит свежие props/state и не указывается в зависимостях. Правила: объявлять в том же компоненте/хуке, не передавать как проп, не использовать просто для глушения линтера.

### 11. Формы через useState для каждого поля

```tsx
// Smell: 10 полей = 10 useState
const [name, setName] = useState("");
const [email, setEmail] = useState("");
// ... ещё 8
```

**Рефакторинг**: `useReducer` для сложной формы, или специализированная библиотека (React Hook Form, TanStack Form). Они решают валидацию, touched/dirty, submit.

### 12. Серверное состояние в `useState` + `useEffect(fetch)`

```tsx
// Smell
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
useEffect(() => {
  fetch("/api/items").then(...).catch(...);
}, []);
```

Это переизобретает кэширование, invalidation, retry, deduplication.

**Рефакторинг**: TanStack Query (React Query), SWR. Для Next.js App Router — серверные компоненты с нативным fetch + React `cache()`. См. также модуль `nextjs-smells.md`.

### 13. Неконтролируемый vs контролируемый input — микс

Компонент одновременно использует `defaultValue` и `value`, или переключается между ними.

**Рефакторинг**: явно выбирай один режим; для форм — обычно контролируемый через React Hook Form (который внутри использует uncontrolled для производительности).

### 14. Обработчик события прямо в JSX с логикой

```tsx
// Smell
<button onClick={() => {
  if (user.role === "admin") {
    api.delete(item.id);
    refresh();
    toast.success("Deleted");
  } else {
    toast.error("Not allowed");
  }
}}>
```

**Рефакторинг**: Extract Function с говорящим именем (`handleDelete`). Не только для читаемости, но и для тестируемости.

### 15. Propsы-флаги (boolean props)

```tsx
// Smell
<Button primary secondary large small disabled loading />
```

Один компонент пытается быть всем сразу. Комбинации пропсов ведут к невалидным состояниям (`primary + secondary`).

**Рефакторинг**: variant-пропс с дискриминированным типом (`variant: "primary" | "secondary"`); отдельные компоненты (`PrimaryButton`, `SecondaryButton`), если вариаций мало; CVA (class-variance-authority) для styling-вариантов.

### 16. Устаревшие API: forwardRef, propTypes, string refs

В React 19 `ref` передаётся как обычный проп — `forwardRef` больше не нужен и будет deprecated. `propTypes`, `contextTypes` и string refs удалены.

```tsx
// Устаревший паттерн
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));

// React 19
function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

**Рефакторинг**: механическая миграция через codemod (`npx codemod react/19/migration-recipe` или `types-react-codemod` для типов). Отдельный mechanical-коммит.

### 17. useContext без мемоизации value

```tsx
// Smell — value создаётся заново каждый рендер провайдера
<AuthContext.Provider value={{ user, login, logout }}>

// Правильно
const value = useMemo(() => ({ user, login, logout }), [user]);
```

Все потребители контекста ре-рендерятся при любом рендере провайдера. Мемоизация value + разбиение контекста (данные отдельно от actions) решают проблему.

## Как искать в коде

```bash
# useEffect для синхронизации state (подозрительно)
grep -rn "useEffect" --include="*.{tsx,jsx}" -A 5 | grep -B 2 "setState\|set[A-Z]"

# inline-объекты в JSX (подозрительно при memoized children)
grep -rnE "=\s*\{\s*\{" --include="*.{tsx,jsx}"

# key={index}
grep -rnE "key=\{.*index\}" --include="*.{tsx,jsx}"
grep -rnE "key=\{i\}" --include="*.{tsx,jsx}"

# массовое использование useState (форма-smell)
grep -rn "useState" --include="*.{tsx,jsx}" | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head

# Эффект + fetch (server state в client state)
grep -rn "useEffect" --include="*.{tsx,jsx}" -A 5 | grep "fetch\|axios\|api\."

# Огромные компоненты по числу строк
find src -name "*.tsx" -exec wc -l {} \; | sort -rn | head -20

# Отсутствие exhaustive-deps ESLint-правила
grep -rn "react-hooks/exhaustive-deps" .eslintrc.* biome.json eslint.config.*
```

## На что обращать внимание дополнительно

- **React 19**: новые хуки (`use`, `useActionState`, `useOptimistic`) заменяют часть паттернов. Проверь, не использует ли код устаревшие паттерны форм.
- **React 19.2**: `useEffectEvent` — стабильное решение stale closures в эффектах; `<Activity />` — скрытие UI без потери состояния (заменяет костыли с `display: none` + сохранением state вручную для табов/модалок).
- **React Compiler**: стабилен с 1.0. Если включён, не плоди ручную мемоизацию; существующую удаляй постепенно с проверкой профайлером.
- **Concurrent rendering**: `useTransition`, `useDeferredValue` для тяжёлых обновлений.
- **Strict Mode**: компоненты должны быть устойчивы к двойному рендеру в dev. Если что-то ломается только в Strict Mode — это реальный баг, а не ложное срабатывание.
- **Безопасность**: React < 19.2.3 с RSC уязвим к CVE-2025-55182. Проверка версии — обязательная часть шага автодетекции стека.
