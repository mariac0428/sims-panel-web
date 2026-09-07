import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type WeeklyReport = {
  week_start: string;
  week_end: string;
  normal_hours: number;
  overtime_hours: number;
  night_surcharge_hours: number;
  sunday_holiday_hours: number;
  normal_pay: number;
  overtime_pay: number;
  night_pay: number;
  sunday_holiday_pay: number;
  total_pay: number;
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function exportReportToExcel(report: WeeklyReport, technicianName: string) {
  const rows = [
    ['Reporte semanal de horas y pago - SIMS'],
    ['Técnico', technicianName],
    ['Semana', `${report.week_start} al ${report.week_end}`],
    [],
    ['Concepto', 'Horas', 'Valor pagado'],
    ['Horas normales', Number(report.normal_hours), Number(report.normal_pay)],
    ['Horas extra', Number(report.overtime_hours), Number(report.overtime_pay)],
    ['Recargo nocturno', Number(report.night_surcharge_hours), Number(report.night_pay)],
    ['Domingo/Festivo', Number(report.sunday_holiday_hours), Number(report.sunday_holiday_pay)],
    [],
    ['Total a pagar', '', Number(report.total_pay)],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 15 }];

  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  const boldStyle = { font: { bold: true } };
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '333333' } },
  };
  const currencyFormat = '"$"#,##0';

  const titleCell = worksheet['A1'];
  if (titleCell) titleCell.s = { font: { bold: true, sz: 14 } };

  ['A2', 'A3'].forEach((cell) => {
    if (worksheet[cell]) worksheet[cell].s = boldStyle;
  });

  ['A5', 'B5', 'C5'].forEach((cell) => {
    if (worksheet[cell]) worksheet[cell].s = headerStyle;
  });

  ['A11'].forEach((cell) => {
    if (worksheet[cell]) worksheet[cell].s = boldStyle;
  });

  ['C6', 'C7', 'C8', 'C9', 'C11'].forEach((cell) => {
    if (worksheet[cell]) worksheet[cell].z = currencyFormat;
  });

  if (worksheet['C11']) {
    worksheet['C11'].s = { font: { bold: true }, numFmt: currencyFormat };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

  XLSX.writeFile(
    workbook,
    `reporte_${technicianName.replace(/\s+/g, '_')}_${report.week_start}.xlsx`,
    { cellStyles: true }
  );
}
export function exportReportToPDF(report: WeeklyReport, technicianName: string) {
  const doc = new jsPDF();

  try {
    doc.addImage('/logo-sims.png', 'PNG', 14, 10, 25, 25);
  } catch {
    // Si el logo no carga, continuamos sin el (no debe bloquear la exportacion)
  }

  doc.setFontSize(16);
  doc.text('Reporte Semanal de Horas y Pago', 45, 20);
  doc.setFontSize(11);
  doc.text('Servicios Integrales Mecánicos S.A.S.', 45, 27);

  doc.setFontSize(10);
  doc.text(`Técnico: ${technicianName}`, 14, 45);
  doc.text(`Semana: ${report.week_start} al ${report.week_end}`, 14, 51);

  autoTable(doc, {
    startY: 58,
    head: [['Concepto', 'Horas', 'Valor pagado']],
    body: [
      [
        'Horas normales',
        Number(report.normal_hours).toFixed(2),
        formatCOP(Number(report.normal_pay)),
      ],
      [
        'Horas extra',
        Number(report.overtime_hours).toFixed(2),
        formatCOP(Number(report.overtime_pay)),
      ],
      [
        'Recargo nocturno',
        Number(report.night_surcharge_hours).toFixed(2),
        formatCOP(Number(report.night_pay)),
      ],
      [
        'Domingo/Festivo',
        Number(report.sunday_holiday_hours).toFixed(2),
        formatCOP(Number(report.sunday_holiday_pay)),
      ],
    ],
    foot: [['Total a pagar', '', formatCOP(Number(report.total_pay))]],
    theme: 'grid',
    headStyles: { fillColor: [242, 208, 0], textColor: [40, 40, 40] },
    footStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  doc.save(`reporte_${technicianName.replace(/\s+/g, '_')}_${report.week_start}.pdf`);
}