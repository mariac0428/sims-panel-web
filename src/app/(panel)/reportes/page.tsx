'use client';

import { useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { exportReportToExcel, exportReportToPDF } from '@/lib/export-report';

type Technician = {
  id: string;
  full_name: string;
};

type WeeklyReport = {
  id: string;
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

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReportesPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [selectedMonday, setSelectedMonday] = useState<Date>(getMonday(new Date()));
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, []);

  useEffect(() => {
    if (selectedTechId) {
      loadReport();
    }
  }, [selectedTechId, selectedMonday]);

  async function loadTechnicians() {
    const supabase = createClient();
    const { data } = await supabase
      .from('technicians')
      .select('id, full_name')
      .eq('role', 'tecnico')
      .order('full_name');
    setTechnicians(data ?? []);
    if (data && data.length > 0) {
      setSelectedTechId(data[0].id);
    }
  }

  async function loadReport() {
    setLoading(true);
    const supabase = createClient();
    const weekStartStr = formatDate(selectedMonday);

    const { data } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('technician_id', selectedTechId)
      .eq('week_start', weekStartStr)
      .maybeSingle();

    setReport(data);
    setLoading(false);
  }

  async function handleGenerateReport() {
    setGenerating(true);
    const supabase = createClient();
    const weekStartStr = formatDate(selectedMonday);

    await supabase.rpc('generate_weekly_report', {
      p_technician_id: selectedTechId,
      p_week_start: weekStartStr,
    });

    setGenerating(false);
    loadReport();
  }

  function changeWeek(offsetDays: number) {
    const newMonday = new Date(selectedMonday);
    newMonday.setDate(newMonday.getDate() + offsetDays);
    setSelectedMonday(newMonday);
  }

    function handleExportExcel() {
    if (!report) return;
    const techName = technicians.find((t) => t.id === selectedTechId)?.full_name ?? 'tecnico';
    exportReportToExcel(report, techName);
  }

  function handleExportPDF() {
    if (!report) return;
    const techName = technicians.find((t) => t.id === selectedTechId)?.full_name ?? 'tecnico';
    exportReportToPDF(report, techName);
  }

  const weekEnd = new Date(selectedMonday);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Reportes</h1>
      <p className="text-neutral-500">Horas trabajadas y pago semanal por técnico</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Select value={selectedTechId} onValueChange={(v) => setSelectedTechId(v ?? '')}>
          <SelectTrigger className="w-64 bg-neutral-800 text-white border-neutral-700">
            <SelectValue placeholder="Selecciona un técnico">
              {technicians.find((t) => t.id === selectedTechId)?.full_name ??
                'Selecciona un técnico'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2">
          <button onClick={() => changeWeek(-7)} className="text-white">
            ←
          </button>
          <span className="text-sm text-white">
            {selectedMonday.toLocaleDateString('es-CO')} - {weekEnd.toLocaleDateString('es-CO')}
          </span>
          <button onClick={() => changeWeek(7)} className="text-white">
            →
          </button>
        </div>

        <Button onClick={handleGenerateReport} disabled={generating || !selectedTechId}>
          {generating ? 'Calculando...' : 'Generar / Actualizar reporte'}
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-neutral-500">Cargando reporte...</p>
        ) : !report ? (
          <p className="text-neutral-500">
            No hay reporte generado para esta semana. Presiona "Generar / Actualizar reporte".
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-sm text-neutral-400">Horas normales</p>
              <p className="mt-1 text-xl font-bold text-white">
                {Number(report.normal_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-neutral-500">{formatCOP(Number(report.normal_pay))}</p>
            </div>
            <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4">
              <p className="text-sm text-amber-400">Horas extra</p>
              <p className="mt-1 text-xl font-bold text-white">
                {Number(report.overtime_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-neutral-500">{formatCOP(Number(report.overtime_pay))}</p>
            </div>
            <div className="rounded-lg border border-blue-800 bg-blue-950/30 p-4">
              <p className="text-sm text-blue-400">Recargo nocturno</p>
              <p className="mt-1 text-xl font-bold text-white">
                {Number(report.night_surcharge_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-neutral-500">{formatCOP(Number(report.night_pay))}</p>
            </div>
            <div className="rounded-lg border border-purple-800 bg-purple-950/30 p-4">
              <p className="text-sm text-purple-400">Domingo/Festivo</p>
              <p className="mt-1 text-xl font-bold text-white">
                {Number(report.sunday_holiday_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-neutral-500">
                {formatCOP(Number(report.sunday_holiday_pay))}
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-green-800 bg-green-950/30 p-4 md:col-span-4">
              <p className="text-sm text-green-400">Total a pagar esta semana</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {formatCOP(Number(report.total_pay))}
                            <div className="col-span-2 flex gap-3 md:col-span-4">
              <Button variant="outline" className="text-black" onClick={handleExportExcel}>
                Exportar Excel
              </Button>
              <Button variant="outline" className="text-black" onClick={handleExportPDF}>
                Exportar PDF
              </Button>
            </div>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
