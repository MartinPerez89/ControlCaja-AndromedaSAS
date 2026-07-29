/**
 * exportUtils.js
 * RF-005 – Exportación de Balance a Excel (.xlsx) y PDF (.pdf)
 *
 * Funciones puras que reciben un payload con los datos ya calculados
 * y generan la descarga directamente en el browser.
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Constantes compartidas ────────────────────────────────────────────────
const ESTABLISHMENT = 'Centro de Rehabilitación ANDROMEDA S.A.S';
const REPORT_TITLE  = 'Balance Financiero';

const CATEGORY_LABELS = {
  copago:         'Copago',
  particular:     'Pago Particular',
  obra_social:    'Pago Obra Social',
  otros_ingresos: 'Otros Ingresos',
  honorarios:     'Honorarios',
  insumos:        'Insumos / Materiales',
  servicios:      'Servicios',
  otros_egresos:  'Otros Egresos',
};

const PAYMENT_LABELS = {
  cash:      'Efectivo',
  transfer:  'Transferencia',
};

const SHIFT_LABELS = {
  morning:   'Mañana',
  afternoon: 'Tarde',
};

const toNum = (n) => Number(n) || 0;

const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

/**
 * Genera el texto del indicador de tendencia para exportación
 */
const trendText = (current, previous, hasData) => {
  if (!hasData) return 'Sin datos comparativos disponibles';
  if (previous === 0 && current === 0) return 'Sin variación';
  if (previous === 0) return 'Nuevo período';
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const abs = Math.abs(pct).toFixed(1).replace('.', ',');
  if (pct > 0)  return `+${abs}% vs. mes anterior`;
  if (pct < 0)  return `-${abs}% vs. mes anterior`;
  return '0% vs. mes anterior';
};

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL
// ══════════════════════════════════════════════════════════════════════════════

export function exportToExcel(payload) {
  const {
    periodLabel,
    balance,
    prevBalance,
    categoryBreakdown,
    transactions,
    generatedAt,
  } = payload;

  const wb = XLSX.utils.book_new();
  const ARS_FMT = '"$"#,##0.00';

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 1: RESUMEN
  // ─────────────────────────────────────────────────────────────────────────
  const summaryData = [
    [ESTABLISHMENT],
    [REPORT_TITLE],
    [],
    ['Período:', periodLabel],
    ['Generado:', generatedAt.toLocaleString('es-AR')],
    [],
    ['RESUMEN FINANCIERO'],
    ['Indicador', 'Valor', 'Tendencia vs. mes anterior'],
    [
      'Ingresos del Período',
      toNum(balance.income),
      trendText(balance.income, prevBalance.income, prevBalance.hasData),
    ],
    [
      'Egresos del Período',
      toNum(balance.expense),
      trendText(balance.expense, prevBalance.expense, prevBalance.hasData),
    ],
    [
      balance.total >= 0 ? 'Neto del Período (Superávit)' : 'Neto del Período (Déficit)',
      toNum(balance.total),
      trendText(balance.total, prevBalance.total, prevBalance.hasData),
    ],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

  // Formato ARS en celdas de importe (fila 9, 10, 11 → índices 8,9,10 → col B = índice 1)
  ['B9', 'B10', 'B11'].forEach(addr => {
    if (wsSummary[addr]) {
      wsSummary[addr].z = ARS_FMT;
      wsSummary[addr].t = 'n';
    }
  });

  wsSummary['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 40 }];
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 2 } },
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 2: CATEGORÍAS
  // ─────────────────────────────────────────────────────────────────────────
  const catRows = [];

  catRows.push(['INGRESOS POR CATEGORÍA']);
  catRows.push(['Categoría', 'Monto', '% sobre Total Ingresos']);
  if (categoryBreakdown.incomeEntries.length === 0) {
    catRows.push(['Sin ingresos en el período', '', '']);
  } else {
    categoryBreakdown.incomeEntries.forEach(([cat, total]) => {
      const pct = balance.income > 0
        ? ((total / balance.income) * 100).toFixed(1) + '%'
        : '0%';
      catRows.push([CATEGORY_LABELS[cat] || cat, toNum(total), pct]);
    });
    catRows.push(['TOTAL INGRESOS', toNum(balance.income), '100%']);
  }

  catRows.push([]);
  catRows.push(['EGRESOS POR CATEGORÍA']);
  catRows.push(['Categoría', 'Monto', '% sobre Total Egresos']);
  if (categoryBreakdown.expenseEntries.length === 0) {
    catRows.push(['Sin egresos en el período', '', '']);
  } else {
    categoryBreakdown.expenseEntries.forEach(([cat, total]) => {
      const pct = balance.expense > 0
        ? ((total / balance.expense) * 100).toFixed(1) + '%'
        : '0%';
      catRows.push([CATEGORY_LABELS[cat] || cat, toNum(total), pct]);
    });
    catRows.push(['TOTAL EGRESOS', toNum(balance.expense), '100%']);
  }

  const wsCategories = XLSX.utils.aoa_to_sheet(catRows);

  // Formato ARS en la columna B (índice 1) para filas numéricas
  const catRange = XLSX.utils.decode_range(wsCategories['!ref'] || 'A1');
  for (let row = catRange.s.r; row <= catRange.e.r; row++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: 1 });
    if (wsCategories[addr] && wsCategories[addr].t === 'n') {
      wsCategories[addr].z = ARS_FMT;
    }
  }

  wsCategories['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsCategories, 'Categorías');

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 3: MOVIMIENTOS
  // ─────────────────────────────────────────────────────────────────────────
  const txHeader = [
    'Fecha',
    'Hora',
    'Tipo',
    'Categoría',
    'Paciente / Descripción',
    'Obra Social',
    'Turno',
    'Medio de Pago',
    'Importe',
  ];

  const sortedTx = [...transactions].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return (b.time || '00:00').localeCompare(a.time || '00:00');
  });

  const txRows = sortedTx.map(t => [
    t.date.split('-').reverse().join('/'),
    t.time || '',
    t.type === 'income' ? 'Ingreso' : 'Egreso',
    CATEGORY_LABELS[t.category] || t.category || '',
    t.patientName || t.description || '',
    t.healthInsurance || '',
    SHIFT_LABELS[t.shift] || t.shift || '',
    PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod || '',
    toNum(t.amount),
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);

  // Formato ARS en columna I (índice 8), saltando el header (row 0)
  const txRange = XLSX.utils.decode_range(wsTx['!ref'] || 'A1');
  for (let row = 1; row <= txRange.e.r; row++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: 8 });
    if (wsTx[addr] && wsTx[addr].t === 'n') {
      wsTx[addr].z = ARS_FMT;
    }
  }

  wsTx['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 24 },
    { wch: 30 }, { wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 18 },
  ];
  wsTx['!autofilter'] = { ref: wsTx['!ref'] };

  XLSX.utils.book_append_sheet(wb, wsTx, 'Movimientos');

  // ─── Descarga via browser ────────────────────────────────────────────────
  const fileName = `balance_andromeda_${generatedAt.toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF
// ══════════════════════════════════════════════════════════════════════════════

export function exportToPDF(payload) {
  const {
    periodLabel,
    balance,
    prevBalance,
    categoryBreakdown,
    transactions,
    generatedAt,
  } = payload;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W   = doc.internal.pageSize.getWidth();
  const PAGE_H   = doc.internal.pageSize.getHeight();
  const MARGIN   = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Paleta cromática ─────────────────────────────────────────────────────
  const COLOR = {
    income:     [16,  185, 129],
    expense:    [244,  63,  94],
    accent:     [99,  102, 241],
    dark:       [15,   23,  42],
    mediumDark: [30,   41,  59],
    medium:     [51,   65,  85],
    textMuted:  [100, 116, 139],
    white:      [248, 250, 252],
    lightGreen: [240, 253, 244],
    lightRed:   [255, 241, 242],
    lightGray:  [248, 250, 252],
  };

  let cursorY = MARGIN;

  // ── Helper: numeración de páginas (se llama al final) ────────────────────
  const addPageNumbers = () => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLOR.textMuted);
      doc.text(
        `Página ${i} de ${totalPages}`,
        PAGE_W - MARGIN,
        PAGE_H - 8,
        { align: 'right' }
      );
      doc.text(ESTABLISHMENT, MARGIN, PAGE_H - 8);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ENCABEZADO
  // ─────────────────────────────────────────────────────────────────────────
  doc.setFillColor(...COLOR.dark);
  doc.rect(0, 0, PAGE_W, 38, 'F');

  doc.setFillColor(...COLOR.accent);
  doc.rect(0, 0, 4, 38, 'F');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.white);
  doc.text(ESTABLISHMENT, MARGIN + 4, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR.accent);
  doc.text(REPORT_TITLE.toUpperCase(), MARGIN + 4, 21);

  doc.setFontSize(8);
  doc.setTextColor(...COLOR.textMuted);
  doc.text(`Período: ${periodLabel}`, MARGIN + 4, 28);
  doc.text(
    `Generado: ${generatedAt.toLocaleString('es-AR')}`,
    PAGE_W - MARGIN,
    28,
    { align: 'right' }
  );

  cursorY = 46;

  // ─────────────────────────────────────────────────────────────────────────
  // SECCIÓN: RESUMEN FINANCIERO
  // ─────────────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.medium);
  doc.text('RESUMEN FINANCIERO', MARGIN, cursorY);
  cursorY += 2;

  doc.setDrawColor(...COLOR.medium);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Indicador', 'Valor', 'Tendencia vs. mes anterior']],
    body: [
      [
        'Ingresos del Período',
        formatARS(balance.income),
        trendText(balance.income, prevBalance.income, prevBalance.hasData),
      ],
      [
        'Egresos del Período',
        formatARS(balance.expense),
        trendText(balance.expense, prevBalance.expense, prevBalance.hasData),
      ],
      [
        balance.total >= 0 ? 'Neto del Período (Superávit)' : 'Neto del Período (Déficit)',
        formatARS(balance.total),
        trendText(balance.total, prevBalance.total, prevBalance.hasData),
      ],
    ],
    headStyles: {
      fillColor: COLOR.mediumDark,
      textColor: COLOR.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: CONTENT_W - 102 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const colors = [COLOR.income, COLOR.expense,
          balance.total >= 0 ? COLOR.income : COLOR.expense];
        data.cell.styles.textColor = colors[data.row.index] ?? COLOR.medium;
      }
    },
    alternateRowStyles: { fillColor: COLOR.lightGray },
    theme: 'grid',
  });

  cursorY = doc.lastAutoTable.finalY + 10;

  // ─────────────────────────────────────────────────────────────────────────
  // SECCIÓN: DESGLOSE POR CATEGORÍA
  // ─────────────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.medium);
  doc.text('DESGLOSE POR CATEGORÍA', MARGIN, cursorY);
  cursorY += 2;
  doc.setLineWidth(0.3);
  doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
  cursorY += 4;

  const halfW = (CONTENT_W - 6) / 2;

  // Tabla Ingresos (columna izquierda)
  const incomeRows = categoryBreakdown.incomeEntries.length === 0
    ? [['Sin ingresos en el período', '', '']]
    : categoryBreakdown.incomeEntries.map(([cat, total]) => {
        const pct = balance.income > 0
          ? ((total / balance.income) * 100).toFixed(1) + '%'
          : '0%';
        return [CATEGORY_LABELS[cat] || cat, formatARS(total), pct];
      });

  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN + halfW + 6 },
    head: [['Categoría (Ingresos)', 'Monto', '%']],
    body: incomeRows,
    headStyles: { fillColor: COLOR.income, textColor: COLOR.white, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: halfW * 0.52 },
      1: { cellWidth: halfW * 0.3, halign: 'right' },
      2: { cellWidth: halfW * 0.18, halign: 'right' },
    },
    alternateRowStyles: { fillColor: COLOR.lightGreen },
    theme: 'grid',
  });

  const incomeEndY = doc.lastAutoTable.finalY;

  // Tabla Egresos (columna derecha)
  const expenseRows = categoryBreakdown.expenseEntries.length === 0
    ? [['Sin egresos en el período', '', '']]
    : categoryBreakdown.expenseEntries.map(([cat, total]) => {
        const pct = balance.expense > 0
          ? ((total / balance.expense) * 100).toFixed(1) + '%'
          : '0%';
        return [CATEGORY_LABELS[cat] || cat, formatARS(total), pct];
      });

  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN + halfW + 6, right: MARGIN },
    head: [['Categoría (Egresos)', 'Monto', '%']],
    body: expenseRows,
    headStyles: { fillColor: COLOR.expense, textColor: COLOR.white, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: halfW * 0.52 },
      1: { cellWidth: halfW * 0.3, halign: 'right' },
      2: { cellWidth: halfW * 0.18, halign: 'right' },
    },
    alternateRowStyles: { fillColor: COLOR.lightRed },
    theme: 'grid',
  });

  cursorY = Math.max(incomeEndY, doc.lastAutoTable.finalY) + 10;

  // ─────────────────────────────────────────────────────────────────────────
  // SECCIÓN: DETALLE DE MOVIMIENTOS
  // ─────────────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.medium);
  doc.text('DETALLE DE MOVIMIENTOS', MARGIN, cursorY);
  cursorY += 2;
  doc.setLineWidth(0.3);
  doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
  cursorY += 4;

  const sortedTx = [...transactions].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return (b.time || '00:00').localeCompare(a.time || '00:00');
  });

  const txBody = sortedTx.map(t => [
    t.date.split('-').reverse().join('/'),
    t.type === 'income' ? 'Ingreso' : 'Egreso',
    CATEGORY_LABELS[t.category] || t.category || '-',
    t.patientName || t.description || '-',
    PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod || '-',
    formatARS(t.amount),
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Medio de Pago', 'Importe']],
    body: txBody,
    headStyles: {
      fillColor: COLOR.mediumDark,
      textColor: COLOR.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 17 },
      2: { cellWidth: 34 },
      3: { cellWidth: 55 },
      4: { cellWidth: 27 },
      5: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const txIdx = data.row.index;
        if (txIdx >= sortedTx.length) return;
        const isIncome = sortedTx[txIdx].type === 'income';
        if (data.column.index === 1) {
          data.cell.styles.textColor = isIncome ? COLOR.income : COLOR.expense;
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 5) {
          data.cell.styles.textColor = isIncome ? COLOR.income : COLOR.expense;
        }
      }
    },
    alternateRowStyles: { fillColor: COLOR.lightGray },
    showHead: 'everyPage',
    theme: 'grid',
  });

  // ── Numeración de páginas ─────────────────────────────────────────────────
  addPageNumbers();

  // ── Descarga ──────────────────────────────────────────────────────────────
  const fileName = `balance_andromeda_${generatedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
