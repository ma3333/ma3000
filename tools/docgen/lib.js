// Shared helpers for generating Hebrew RTL Word documents with docx-js.
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, HeadingLevel, ShadingType, BorderStyle, LevelFormat, Header, Footer,
  PageNumber, PageBreak, VerticalAlign,
} = d;

const FONT = 'Arial';
const COLORS = {
  primary: '1F4E79', accent: '2E75B6', light: 'DEEAF6', grey: 'F2F2F2', border: 'BFBFBF', text: '262626',
  mvp: 'C6EFCE', p2: 'FFEB9C', p3: 'FCE4D6', future: 'E7E6E6',
};
const PAGE_W = 11906, MARGIN = 1134; // A4, 2cm margins
const CONTENT_W = PAGE_W - 2 * MARGIN;

// Pure numeric/currency strings are laid out LTR so signs and symbols stay in place inside RTL paragraphs.
const isNumeric = (t) => /^[-+₪$%\d.,()KM≈=×/ ]+$/.test(t) && /\d/.test(t);
const run = (text, o = {}) => new TextRun({
  text: isNumeric(text) ? '\u202A' + text + '\u202C' : text, rightToLeft: !isNumeric(text), font: { ascii: FONT, hAnsi: FONT, cs: FONT },
  size: o.size || 22, sizeComplexScript: o.size || 22,
  bold: o.bold, boldComplexScript: o.bold, italics: o.italics, italicsComplexScript: o.italics,
  color: o.color || COLORS.text,
});

// Inline **bold** support.
const runs = (text, o = {}) => String(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part =>
  part.startsWith('**') ? run(part.slice(2, -2), { ...o, bold: true }) : run(part, o));

const P = (text, o = {}) => new Paragraph({
  bidirectional: true, alignment: o.align || AlignmentType.START,
  spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 300 },
  children: runs(text, o), keepNext: o.keepNext,
});

const tocEntries = [];
const H = (level, text) => {
  if (level <= 2) tocEntries.push({ level, text });
  const sizes = { 1: 34, 2: 28, 3: 24 };
  const hl = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 }[level];
  return new Paragraph({
    heading: hl, bidirectional: true, alignment: AlignmentType.START, keepNext: true,
    spacing: { before: level === 1 ? 360 : 240, after: 120 },
    border: level === 1 ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.accent, space: 4 } } : undefined,
    children: [run(text, { size: sizes[level], bold: true, color: level === 3 ? COLORS.accent : COLORS.primary })],
  });
};

// Bullets/numbers are rendered as prefixed runs (not Word numbering) for reliable RTL layout in Word and LibreOffice.
const listPara = (label, text, level = 0) => new Paragraph({
  bidirectional: true, alignment: AlignmentType.START,
  indent: { start: 360 + level * 360, hanging: 260 },
  spacing: { after: 60, line: 288 }, children: [run(label + '\u00A0'), ...runs(text)],
});
const bullet = (text, level = 0) => listPara(level ? '◦' : '•', text, level);
const bullets = (items) => items.map(it => Array.isArray(it) ? it.map(s => bullet(s, 1)) : bullet(it)).flat();
const numbered = (items) => items.map((t, i) => listPara(`${i + 1}.`, t));

const cellBorders = { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border } };

const cell = (text, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders: cellBorders, verticalAlign: VerticalAlign.CENTER,
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  margins: { top: 60, bottom: 60, left: o.pad ?? 100, right: o.pad ?? 100 },
  children: String(text).split('\n').map(line => new Paragraph({
    bidirectional: true, alignment: o.center ? AlignmentType.CENTER : AlignmentType.START,
    spacing: { after: 0, line: 264 }, children: runs(line, { size: o.size || 19, bold: o.bold, color: o.color }),
  })),
});

// widths are relative weights; header row is shaded; fillFn(rowIdx,colIdx,value) => fill colour.
const table = (headers, rows, weights, o = {}) => {
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map(w => Math.floor(CONTENT_W * w / total));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const center = o.centerCols || [];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, visuallyRightToLeft: true,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) =>
        cell(h, widths[i], { fill: COLORS.primary, bold: true, color: 'FFFFFF', center: center.includes(i), size: o.size, pad: o.pad })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((v, i) =>
        cell(v, widths[i], { fill: (o.fillFn && o.fillFn(ri, i, v)) || (ri % 2 ? COLORS.grey : undefined),
          center: center.includes(i), bold: o.boldCols && o.boldCols.includes(i), size: o.size, pad: o.pad })) })),
    ],
  });
};

const callout = (title, lines, fill = COLORS.light) => new Table({
  width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W], visuallyRightToLeft: true,
  rows: [new TableRow({ cantSplit: true, children: [new TableCell({
    width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
    borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.accent } },
    margins: { top: 120, bottom: 120, left: 200, right: 200 },
    children: [P(title, { bold: true, color: COLORS.primary, after: 60 }), ...lines.map(l => P(l, { after: 40, size: 21 }))],
  })] })],
});

const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const titlePage = (title, subtitle, meta) => [
  new Paragraph({ spacing: { before: 2600 }, children: [] }),
  new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [run(title, { size: 56, bold: true, color: COLORS.primary })] }),
  new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 600 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.accent, space: 12 } },
    children: [run(subtitle, { size: 30, color: COLORS.accent })] }),
  ...meta.map(m => new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run(m, { size: 22, color: '595959' })] })),
  pageBreak(),
];

const TOC_MARKER = Symbol('toc');
const toc = () => [TOC_MARKER];
const renderToc = () => [
  new Paragraph({ bidirectional: true, alignment: AlignmentType.START, spacing: { after: 200 },
    children: [run('תוכן עניינים', { size: 34, bold: true, color: COLORS.primary })] }),
  ...tocEntries.map(e => new Paragraph({ bidirectional: true, alignment: AlignmentType.START,
    indent: { start: e.level === 1 ? 0 : 400 }, spacing: { after: e.level === 1 ? 80 : 30 },
    children: [run(e.text, { size: e.level === 1 ? 22 : 19, bold: e.level === 1, color: e.level === 1 ? COLORS.primary : '404040' })] })),
  pageBreak(),
];

const build = async (file, docTitle, children) => {
  const doc = new Document({
    creator: 'ma3000', title: docTitle,
    styles: { default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [1, 2, 3].map(n => ({ id: `Heading${n}`, name: `Heading ${n}`, basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, bold: true }, paragraph: { outlineLevel: n - 1 } })) },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      headers: { default: new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.END,
        children: [run(docTitle, { size: 16, color: '808080' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER,
        children: [run('עמוד ', { size: 16, color: '808080' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '808080', font: FONT }),
          run(' מתוך ', { size: 16, color: '808080' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '808080', font: FONT })] })] }) },
      children: children.flatMap(c => c === TOC_MARKER ? renderToc() : [c]),
    }],
  });
  require('fs').writeFileSync(file, await Packer.toBuffer(doc));
  console.log('wrote', file);
};

module.exports = { P, H, bullets, bullet, numbered, table, callout, spacer, pageBreak, titlePage, toc, build, COLORS, AlignmentType };
