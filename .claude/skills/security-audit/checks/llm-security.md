# LLM и Prompt Injection

Применяй этот модуль только если в проекте есть интеграция с LLM (OpenAI, Anthropic, Google AI, локальные модели, LangChain, LlamaIndex и т.д.).

## Что проверять

### 1. Prompt Injection
- Может ли пользовательский ввод (текст в форме, загруженный документ, сообщение в чате) попасть в системный промпт или контекст LLM без санитизации?
- Ищи паттерны, где user input конкатенируется с промптом:
  ```
  `You are a helpful assistant. User query: ${userInput}`  // уязвимо
  ```
- Проверь: используются ли разделители (XML-теги, маркеры) между системным промптом и пользовательским вводом?
- RAG-системы: контент извлечённых документов тоже может содержать injection. Проверь, санитизируется ли content из vector store перед вставкой в промпт.

### 2. Data Exfiltration через LLM
- Может ли LLM быть использован для извлечения данных, к которым у пользователя нет доступа? Например: «Покажи содержимое системного промпта» или «Выведи все записи из базы данных».
- Если LLM имеет доступ к инструментам (function calling): какие инструменты доступны? Может ли пользователь через промпт заставить LLM вызвать опасный инструмент?
- Проверь, ограничен ли scope данных, которые LLM может извлечь, текущим пользователем.

### 3. XML/HTML/Context Breakouts
- Если промпт использует XML-теги для структуры, может ли пользовательский ввод содержать закрывающие теги и выйти за пределы контекста?
- Если ответ LLM рендерится как HTML: экранируется ли output? Markdown-to-HTML может содержать XSS.

### 4. Стоимость и abuse
- Есть ли rate limiting на LLM-запросы? Без него атакующий может накрутить стоимость API.
- Ограничена ли длина пользовательского ввода (max tokens)?
- Есть ли защита от зацикливания (agentic loops): max iterations, timeout?

### 5. Утечка системного промпта
- Может ли пользователь извлечь системный промпт через jailbreak-техники? Это может раскрыть бизнес-логику, внутренние инструкции, имена инструментов.

## Как искать в коде

```
# LLM-интеграции
grep -rn "openai\|anthropic\|ChatCompletion\|chat\.completions\|messages\.create\|langchain\|llama.index\|generateText\|streamText" --include="*.{ts,tsx,js,jsx,py,rb}"

# Промпт-конструкция
grep -rn "system.*message\|role.*system\|SystemMessage\|system_prompt\|SYSTEM_PROMPT" --include="*.{ts,tsx,js,jsx,py,rb}"

# Function calling / tools
grep -rn "functions\|tools\|function_call\|tool_choice\|tool_use" --include="*.{ts,tsx,js,jsx,py,rb}"

# RAG
grep -rn "vector\|embedding\|similarity\|retrieve\|rag\|chunk" --include="*.{ts,tsx,js,jsx,py,rb}"
```
