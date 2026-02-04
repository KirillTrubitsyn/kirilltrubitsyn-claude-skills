# Стандарты форматирования документов

Единые правила оформления для скиллов `analytical-brief`, `kuznetsov` и `legal-docs-ru`.

## Цветовая схема

| Элемент | Цвет | HEX | RGB |
|---------|------|-----|-----|
| Заголовки всех уровней | Тёмно-синий | `#233264` | 35, 50, 100 |
| Основной текст | Чёрный | `#000000` | 0, 0, 0 |
| Шапка таблицы (фон) | Тёмно-синий | `#233264` | 35, 50, 100 |
| Шапка таблицы (текст) | Белый | `#FFFFFF` | 255, 255, 255 |
| Границы таблиц | Стандартные | — | — |

## Шрифты и размеры

| Элемент | Шрифт | Размер | Начертание |
|---------|-------|--------|------------|
| Заголовок документа | Times New Roman | 16pt | Bold, цвет #233264 |
| Заголовок раздела (H1) | Times New Roman | 14pt | Bold, цвет #233264 |
| Заголовок подраздела (H2) | Times New Roman | 12pt | Bold, цвет #233264 |
| Заголовок блока (H3) | Times New Roman | 13pt | Bold, цвет #233264 |
| Основной текст | Times New Roman | 12pt | Regular |
| Текст в таблицах | Times New Roman | 11pt | Regular (заголовок Bold) |

## Параметры страницы

- **Формат**: A4 (21.0 × 29.7 см)
- **Поля**: левое 3 см, правое 2 см, верхнее 2 см, нижнее 2 см
- **Межстрочный интервал**: 1.15
- **Отступ после абзаца**: 8pt
- **Выравнивание текста**: по ширине (justify)
- **Выравнивание заголовков**: по левому краю (кроме заголовка документа)
- **Заголовок документа**: по центру

## Таблицы

### Структура
- Шапка таблицы: фон `#233264`, текст белый, полужирный
- Строки данных: белый фон
- Границы: стандартная сетка (Table Grid)
- Выравнивание текста: по левому краю
- Выравнивание чисел: допускается по правому краю

### Код Python (python-docx)

```python
from docx.shared import RGBColor
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

TABLE_HEADER_BG = "233264"
TABLE_HEADER_TEXT = RGBColor(255, 255, 255)

def set_cell_shading(cell, color):
    """Устанавливает цвет фона ячейки"""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

# Применение к шапке таблицы
for cell in table.rows[0].cells:
    set_cell_shading(cell, TABLE_HEADER_BG)
    for paragraph in cell.paragraphs:
        for run in paragraph.runs:
            run.bold = True
            run.font.color.rgb = TABLE_HEADER_TEXT
```

## Списки

### Маркированные списки (bullet points)
- Использовать стиль `List Bullet`
- Маркер: чёрная точка
- Отступ: стандартный для списка

```python
def add_bullet(doc, text):
    """Добавляет пункт маркированного списка"""
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p
```

### Нумерованные подпункты с отступом
- Формат: 1) 2) 3)
- Увеличенный отступ слева (1.5 см) для визуального выделения

```python
from docx.shared import Cm

def add_numbered_item(doc, text, indent_cm=1.5):
    """Добавляет нумерованный пункт с отступом"""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(indent_cm)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p
```

## Выделение текста

### Полужирный (bold)
Использовать для:
- Ключевых выводов и тезисов
- Важных цифр и сумм
- Критических фактов и предупреждений
- Названий исков, дел, документов (при первом упоминании)

НЕ использовать для:
- Обычного текста и описаний
- Дат и номеров (кроме ключевых)
- Названий организаций в обычном контексте

### Техника выделения в тексте

```python
def add_para_with_bold(doc, text, bold_parts=None):
    """
    Добавляет параграф с выделением жирным.
    Маркер ||| разделяет части текста.
    bold_parts — список индексов частей для выделения.
    
    Пример: add_para_with_bold(doc, "Текст |||важная часть||| продолжение", [1])
    """
    p = doc.add_paragraph()
    if bold_parts is None:
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
    else:
        parts = text.split('|||')
        for i, part in enumerate(parts):
            run = p.add_run(part)
            run.font.name = 'Times New Roman'
            if i in bold_parts:
                run.bold = True
    return p
```

## Полный шаблон документа

```python
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# Константы
HEADER_COLOR = RGBColor(35, 50, 100)  # #233264
TABLE_HEADER_BG = "233264"

doc = Document()

# Настройка страницы
for section in doc.sections:
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(3)
    section.right_margin = Cm(2)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)

# Настройка базового стиля
style_normal = doc.styles['Normal']
style_normal.font.name = 'Times New Roman'
style_normal._element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
style_normal.font.size = Pt(12)
style_normal.paragraph_format.line_spacing = 1.15
style_normal.paragraph_format.space_after = Pt(8)
style_normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

# Функции форматирования
def add_title(text, size=16):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(size)
    run.font.name = 'Times New Roman'
    run.font.color.rgb = HEADER_COLOR
    return p

def add_section_heading(text, size=14):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(size)
    run.font.name = 'Times New Roman'
    run.font.color.rgb = HEADER_COLOR
    return p

def set_cell_shading(cell, color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def add_table(data):
    table = doc.add_table(rows=len(data), cols=len(data[0]))
    table.style = 'Table Grid'
    for i, row in enumerate(data):
        for j, cell_text in enumerate(row):
            cell = table.cell(i, j)
            cell.text = str(cell_text)
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(11)
                    if i == 0:  # Шапка
                        run.bold = True
                        run.font.color.rgb = RGBColor(255, 255, 255)
            if i == 0:
                set_cell_shading(cell, TABLE_HEADER_BG)
    return table

def add_bullet(text):
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p

def add_numbered_item(text, indent_cm=1.5):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(indent_cm)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p
```

## Контрольный список

- [ ] Заголовки: цвет #233264, соответствующий размер
- [ ] Таблицы: тёмно-синяя шапка с белым текстом
- [ ] Списки: bullet points или нумерация с отступом
- [ ] Ключевые выводы выделены bold
- [ ] Шрифт Times New Roman везде
- [ ] Поля и интервалы соответствуют стандартам
