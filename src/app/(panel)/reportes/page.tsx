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

type DayStatus = {
  date: string;
  dayLabel: string;
  hoursWorked: number;
  status: 'green' | 'red' | 'gray' | 'none';
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
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const weekEnd = new Date(selectedMonday);
  weekEnd.setDate(weekEnd.getDate() + 6);

  useEffect(() => {
    loadTechnicians();
  }, []);

  useEffect(() => {
    if (selectedTechId) {
      loadReport();
      loadDayStatuses();
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

  async function loadDayStatuses() {
    const supabase = createClient();
    const weekStartStr = formatDate(selectedMonday);
    const weekEndStr = formatDate(weekEnd);

    const { data: settingsData } = await supabase
      .from('company_settings')
      .select('standard_daily_hours')
      .limit(1)
      .single();

    const standardHours = Number(settingsData?.standard_daily_hours ?? 7);

    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('shift_date, start_time, end_time')
      .eq('technician_id', selectedTechId)
      .gte('shift_date', weekStartStr)
      .lte('shift_date', weekEndStr);

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const statuses: DayStatus[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedMonday);
      d.setDate(d.getDate() + i);
      const dStr = formatDate(d);

      const shift = (shiftsData ?? []).find((s) => s.shift_date === dStr);

      if (!shift || !shift.end_time) {
        statuses.push({
          date: dStr,
          dayLabel: dayNames[d.getDay()],
          hoursWorked: 0,
          status: 'none',
        });
        continue;
      }

      const hours =
        (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) /
        (1000 * 60 * 60);

      let status: DayStatus['status'] = 'gray';
      if (hours > standardHours + 0.1) status = 'green';
      else if (hours < standardHours - 0.1) status = 'red';

      statuses.push({ date: dStr, dayLabel: dayNames[d.getDay()], hoursWorked: hours, status });
    }

    setDayStatuses(statuses);
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
      <p className="text-muted-foreground">Horas trabajadas y pago semanal por técnico</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Select value={selectedTechId} onValueChange={(v) => setSelectedTechId(v ?? '')}>
          <SelectTrigger className="w-64 bg-input text-foreground border-input">
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

        <div className="flex items-center gap-2 rounded-md border border-input bg-input px-3 py-2">
          <button onClick={() => changeWeek(-7)} className="text-foreground">
            ←
          </button>
          <span className="text-sm text-foreground">
            {selectedMonday.toLocaleDateString('es-CO')} - {weekEnd.toLocaleDateString('es-CO')}
          </span>
          <button onClick={() => changeWeek(7)} className="text-foreground">
            →
          </button>
        </div>

        <Button onClick={handleGenerateReport} disabled={generating || !selectedTechId}>
          {generating ? 'Calculando...' : 'Generar / Actualizar reporte'}
        </Button>
      </div>

      {dayStatuses.length > 0 && (
        <div className="mt-6 flex gap-3 rounded-lg border border-border bg-card p-4">
          {dayStatuses.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{day.dayLabel}</span>
              <div
                                className={`h-6 w-6 rounded-full border-2 ${
                  day.status === 'green'
                    ? 'border-green-500 bg-green-500'
                    : day.status === 'red'
                      ? 'border-red-500 bg-red-500'
                      : day.status === 'gray'
                        ? 'border-neutral-400 bg-neutral-400'
                        : 'border-input bg-transparent'
                }`}
                title={
                  day.status === 'none'
                    ? 'Sin jornada'
                    : `${day.hoursWorked.toFixed(1)} horas trabajadas`
                }
              />
              <span className="text-xs text-muted-foreground">
                {day.status === 'none' ? '—' : `${day.hoursWorked.toFixed(1)}h`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-muted-foreground">Cargando reporte...</p>
        ) : !report ? (
          <p className="text-muted-foreground">
            No hay reporte generado para esta semana. Presiona "Generar / Actualizar reporte".
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Horas normales</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {Number(report.normal_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-muted-foreground">{formatCOP(Number(report.normal_pay))}</p>
            </div>
            <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4">
              <p className="text-sm text-amber-400">Horas extra</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {Number(report.overtime_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-muted-foreground">{formatCOP(Number(report.overtime_pay))}</p>
            </div>
            <div className="rounded-lg border border-blue-800 bg-blue-950/30 p-4">
              <p className="text-sm text-blue-400">Recargo nocturno</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {Number(report.night_surcharge_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-muted-foreground">{formatCOP(Number(report.night_pay))}</p>
            </div>
            <div className="rounded-lg border border-purple-800 bg-purple-950/30 p-4">
              <p className="text-sm text-purple-400">Domingo/Festivo</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {Number(report.sunday_holiday_hours).toFixed(1)} h
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCOP(Number(report.sunday_holiday_pay))}
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-green-800 bg-green-950/30 p-4 md:col-span-4">
              <p className="text-sm text-green-400">Total a pagar esta semana</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {formatCOP(Number(report.total_pay))}
              </p>
            </div>
            <div className="col-span-2 flex gap-3 md:col-span-4">
              <Button variant="outline" className="text-black" onClick={handleExportExcel}>
                Exportar Excel
              </Button>
              <Button variant="outline" className="text-black" onClick={handleExportPDF}>
                Exportar PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
