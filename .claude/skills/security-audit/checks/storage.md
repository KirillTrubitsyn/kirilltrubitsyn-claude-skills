# Файловое хранилище

## Что проверять

### 1. Загрузка файлов
- **MIME spoofing**: проверяется ли реальный тип файла (magic bytes), или только расширение / Content-Type из заголовка? Атакующий может загрузить `.html` или `.svg` с XSS-кодом, замаскировав под изображение.
- **Path traversal**: валидируются ли имена файлов? Блокируются ли `..`, ведущий `/`, null bytes? Может ли атакующий перезаписать произвольный файл через имя загрузки?
- **Размер файла**: есть ли серверный лимит на размер загрузки? Клиентский лимит без серверного — не защита.
- **Опасные типы**: блокируются ли `.exe`, `.sh`, `.php`, `.jsp`, `.html`, `.svg`?

### 2. Storage buckets
- Какие buckets публичные, какие приватные?
- Публичный bucket с пользовательскими данными (документы, аватары с метаданными) — потенциальная утечка.
- Есть ли RLS-политики на storage (Supabase Storage)?

### 3. Signed URLs
- Какой TTL у signed URLs? Более 1 часа для чувствительных файлов — риск.
- Требуется ли аутентификация для генерации signed URL, или любой может запросить?
- Signed URL привязан к конкретному пользователю, или универсален?

### 4. Серверная обработка файлов
- Если сервер обрабатывает загруженные файлы (resize изображений, парсинг PDF, извлечение текста): нет ли уязвимости к ImageTragick, XXE в XML/SVG, zip bomb?
- Обрабатываются ли файлы в изолированной среде (sandbox)?

## Как искать в коде

```
# Загрузка файлов
grep -rn "upload\|multer\|formidable\|busboy\|FileUpload\|IncomingForm\|UploadedFile\|file_upload\|multipart" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Storage buckets
grep -rn "bucket\|storage\.\|getPublicUrl\|createSignedUrl\|upload.*storage\|s3.*put\|S3Client\|putObject" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# MIME/type checking
grep -rn "mimetype\|content.type\|file\.type\|magic\|file-type\|mime" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Path validation
grep -rn "path\.join\|path\.resolve\|filename\|originalname\|\.replace.*\.\." --include="*.{ts,tsx,js,jsx,py,rb,go}"
```
