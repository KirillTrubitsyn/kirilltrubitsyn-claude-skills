/**
 * Шаблон документа в стиле Кузнецова
 * 
 * Использование:
 * 1. Скопировать этот файл
 * 2. Заменить содержимое разделов
 * 3. Запустить: node template.js
 */

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageNumber, BorderStyle, WidthType,
  ShadingType, HeadingLevel
} = require('docx');

// ============================================================================
// КОНФИГУРАЦИЯ СТИЛЯ
// ============================================================================

const COLORS = {
  heading: "1a3a6e",
  text: "000000",
  headerText: "666666",
  tableBorder: "8eaadb",
  tableHeader: "c5d9f1",
  tableAlt: "e9f0f9"
};

const SIZES = {
  title: 32,
  heading1: 26,
  heading2: 24,
  body: 24,
  small: 20
};

// Границы таблиц
const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Создаёт параграф основного текста
 */
function bodyParagraph(text, options = {}) {
  const children = [];
  
  if (typeof text === 'string') {
    children.push(new TextRun({ text, size: SIZES.body }));
  } else if (Array.isArray(text)) {
    text.forEach(item => {
      if (typeof item === 'string') {
        children.push(new TextRun({ text: item, size: SIZES.body }));
      } else {
        children.push(new TextRun({ size: SIZES.body, ...item }));
      }
    });
  }
  
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 276 },
    ...options,
    children
  });
}

/**
 * Создаёт ячейку таблицы
 */
function tableCell(content, options = {}) {
  const { width, isHeader, isAlt, isBold, align } = options;
  
  const textRun = new TextRun({
    text: content,
    size: SIZES.body,
    bold: isHeader || isBold
  });
  
  return new TableCell({
    borders: cellBorders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: isHeader 
      ? { fill: COLORS.tableHeader, type: ShadingType.CLEAR }
      : isAlt 
        ? { fill: COLORS.tableAlt, type: ShadingType.CLEAR }
        : undefined,
    children: [
      new Paragraph({
        alignment: isHeader ? AlignmentType.CENTER : (align || AlignmentType.LEFT),
        children: [textRun]
      })
    ]
  });
}

/**
 * Создаёт строку таблицы с данными
 */
function dataRow(label, value, options = {}) {
  const { isHeader, isAlt, isBold, indent } = options;
  const displayLabel = indent ? "   " + label : label;
  
  return new TableRow({
    tableHeader: isHeader,
    children: [
      tableCell(displayLabel, { width: 5500, isHeader, isAlt, isBold }),
      tableCell(value, { width: 3500, isHeader, isAlt, isBold, align: AlignmentType.RIGHT })
    ]
  });
}

/**
 * Создаёт строку таймлайна
 */
function timelineRow(date, event, options = {}) {
  const { isHeader, isAlt, isBold } = options;
  
  return new TableRow({
    tableHeader: isHeader,
    children: [
      tableCell(date, { width: 2000, isHeader, isAlt, isBold }),
      tableCell(event, { width: 7000, isHeader, isAlt, isBold, align: AlignmentType.LEFT })
    ]
  });
}

// ============================================================================
// СОЗДАНИЕ ДОКУМЕНТА
// ============================================================================

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Times New Roman", size: SIZES.body }
      }
    },
    paragraphStyles: [
      {
        id: "Title",
        name: "Title",
        basedOn: "Normal",
        run: { 
          font: "Times New Roman", 
          size: SIZES.title, 
          bold: true, 
          color: COLORS.heading 
        },
        paragraph: { 
          spacing: { before: 0, after: 240 }, 
          alignment: AlignmentType.CENTER 
        }
      },
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { 
          font: "Times New Roman", 
          size: SIZES.heading1, 
          bold: true, 
          color: COLORS.heading 
        },
        paragraph: { 
          spacing: { before: 360, after: 180 }, 
          outlineLevel: 0 
        }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { 
          font: "Times New Roman", 
          size: SIZES.heading2, 
          bold: true, 
          color: COLORS.heading 
        },
        paragraph: { 
          spacing: { before: 240, after: 120 }, 
          outlineLevel: 1 
        }
      },
      {
        id: "Normal",
        name: "Normal",
        run: { font: "Times New Roman", size: SIZES.body },
        paragraph: { 
          spacing: { after: 120, line: 276 }, 
          alignment: AlignmentType.JUSTIFIED 
        }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Название документа",  // <-- ЗАМЕНИТЬ
                italics: true,
                color: COLORS.headerText,
                size: SIZES.small
              })
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "— ", size: SIZES.small }),
              new TextRun({ children: [PageNumber.CURRENT], size: SIZES.small }),
              new TextRun({ text: " —", size: SIZES.small })
            ]
          })
        ]
      })
    },
    children: [
      // ========== ЗАГОЛОВОК ДОКУМЕНТА ==========
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun({
            text: "ЗАГОЛОВОК ДОКУМЕНТА",  // <-- ЗАМЕНИТЬ
            bold: true,
            size: SIZES.title,
            color: COLORS.heading
          })
        ]
      }),

      // ========== РАЗДЕЛ 1 ==========
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: "1. Название первого раздела",  // <-- ЗАМЕНИТЬ
            bold: true,
            size: SIZES.heading1,
            color: COLORS.heading
          })
        ]
      }),

      bodyParagraph("Текст первого абзаца первого раздела."),  // <-- ЗАМЕНИТЬ

      bodyParagraph([
        "Абзац с ",
        { text: "выделенным текстом", bold: true },
        " в середине предложения."
      ]),

      // ========== ТАБЛИЦА С ДАННЫМИ ==========
      new Table({
        columnWidths: [5500, 3500],
        rows: [
          dataRow("Показатель", "Значение", { isHeader: true }),
          dataRow("Первый показатель", "100,0", { isBold: true }),
          dataRow("Подпоказатель 1.1", "60,0", { indent: true, isAlt: true }),
          dataRow("Подпоказатель 1.2", "40,0", { indent: true }),
          dataRow("Второй показатель", "50,0", { isAlt: true }),
          dataRow("Итого", "150,0", { isBold: true })
        ]
      }),

      // ========== РАЗДЕЛ 2 ==========
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: "2. Название второго раздела",
            bold: true,
            size: SIZES.heading1,
            color: COLORS.heading
          })
        ]
      }),

      // ========== ПОДРАЗДЕЛ 2.1 ==========
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "2.1. Название подраздела",
            bold: true,
            size: SIZES.heading2,
            color: COLORS.heading
          })
        ]
      }),

      bodyParagraph("Текст подраздела."),

      // ========== ТАЙМЛАЙН ==========
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: "3. Таймлайн",
            bold: true,
            size: SIZES.heading1,
            color: COLORS.heading
          })
        ]
      }),

      new Table({
        columnWidths: [2000, 7000],
        rows: [
          timelineRow("Дата", "Событие", { isHeader: true }),
          timelineRow("01.01.2026", "Первое событие"),
          timelineRow("15.02.2026", "Второе событие", { isAlt: true }),
          timelineRow("01.03.2026", "Третье событие")
        ]
      }),

      // ========== ЗАКЛЮЧЕНИЕ ==========
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: "Заключение",
            bold: true,
            size: SIZES.heading1,
            color: COLORS.heading
          })
        ]
      }),

      bodyParagraph("Текст заключения с краткими выводами и рекомендациями.")
    ]
  }]
});

// ============================================================================
// СОХРАНЕНИЕ ФАЙЛА
// ============================================================================

const OUTPUT_PATH = "./document.docx";  // <-- ЗАМЕНИТЬ при необходимости

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`Документ создан: ${OUTPUT_PATH}`);
});
