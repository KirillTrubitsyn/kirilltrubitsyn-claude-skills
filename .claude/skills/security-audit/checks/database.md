# База данных

## Что проверять

### 1. Row Level Security (Supabase / PostgreSQL)
- Включён ли RLS на всех таблицах? Таблица без RLS доступна любому с `anon` key.
- Для каждой таблицы с RLS: какие политики применяются? Достаточно ли они restrictive?
- Есть ли политика `USING (true)` (разрешает всё)? Это анти-паттерн.
- Проверь, что SELECT/INSERT/UPDATE/DELETE покрыты отдельными политиками, а не одной permissive.

```bash
# Если есть доступ к Supabase CLI или SQL
# Таблицы без RLS:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;
# Политики:
SELECT * FROM pg_policies;
```

### 2. Ключи доступа к БД
- Какой ключ используется на клиенте: `anon` (правильно) или `service_role` (критическая уязвимость)?
- `service_role` key обходит RLS. Убедись, что он используется только в серверном коде (API routes, server actions, backend).
- Проверь: не передаётся ли `service_role` через публичные env-переменные?

### 3. SQL Injection
- Используется ли ORM/query builder (Prisma, Drizzle, Sequelize, SQLAlchemy, ActiveRecord) или raw SQL?
- Если raw SQL: параметризованы ли запросы? Ищи конкатенацию строк в SQL:
  ```
  `SELECT * FROM users WHERE id = '${userId}'`  // уязвимо
  `SELECT * FROM users WHERE id = $1`, [userId]  // безопасно
  ```
- Проверь RPC-функции (Supabase): есть ли функции типа `exec_sql`, которые принимают произвольный SQL от клиента?

### 4. Целостность данных
- **Каскадные удаления**: при удалении родительской записи удаляются ли дочерние? Или остаются orphaned records? Проверь `ON DELETE CASCADE` в миграциях / schema.
- **Soft delete**: для критичных данных (пользователи, транзакции) используется ли soft delete (`deleted_at` timestamp) вместо физического удаления?
- **Race conditions**: при создании пользователей, регистрации устройств, бронировании слотов — есть ли unique constraints и/или оптимистичная блокировка?
- **Bulk DELETE scope**: может ли `DELETE ?all=true` удалить данные всех пользователей, или scope ограничен `WHERE user_id = current_user`?

### 5. Связанные файлы в storage
- При удалении записи из БД (например, документа) удаляются ли связанные файлы из object storage?
- Остаются ли orphaned файлы после удаления метаданных?

### 6. Миграции
- Есть ли миграции, которые дропают таблицы или колонки без бэкапа?
- Есть ли в миграциях хардкоженные данные (seed data с реальными паролями)?

## Как искать в коде

```
# Supabase client initialization
grep -rn "createClient\|supabase\.\|SUPABASE_\|service_role\|anon" --include="*.{ts,tsx,js,jsx,py,env,env.*}"

# Raw SQL
grep -rn "\.query(\|\.execute(\|\.raw(\|\.sql\`\|SELECT.*FROM\|INSERT.*INTO\|UPDATE.*SET\|DELETE.*FROM" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# String concatenation in SQL
grep -rn "\${.*}\|f\".*SELECT\|f\".*INSERT\|\" + .*WHERE\|' + .*WHERE" --include="*.{ts,tsx,js,jsx,py}"

# RPC functions
grep -rn "\.rpc(\|create_function\|EXECUTE\|exec_sql" --include="*.{ts,tsx,js,jsx,sql,py}"

# Cascade/delete
grep -rn "ON DELETE\|onDelete\|cascade\|\.delete(\|\.destroy(" --include="*.{ts,tsx,js,jsx,py,rb,sql,prisma}"
```
