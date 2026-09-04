'use client';

import { useEffect, useState } from 'react';
import { CalendarIcon } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RouteMap } from '@/components/route-map';
import { createClient } from '@/lib/supabase/client';

type Technician = {
  id: string;
  full_name: string;
};

type RoutePoint = { latitude: number; longitude: number; recorded_at: string };
type Visit = { name: string; entry_time: string; exit_time: string; duration_minutes: number };

export default function HistorialPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, []);

  useEffect(() => {
    if (selectedTechId) {
      loadRoute();
    }
  }, [selectedTechId, selectedDate]);

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

  async function loadRoute() {
    setLoading(true);
    const supabase = createClient();
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    const { data: shift } = await supabase
      .from('shifts')
      .select('id')
      .eq('technician_id', selectedTechId)
      .eq('shift_date', dateStr)
      .maybeSingle();

    if (!shift) {
      setRoutePoints([]);
      setVisits([]);
      setLoading(false);
      return;
    }

    const { data: pings } = await supabase
      .from('location_pings')
      .select('geom, recorded_at')
      .eq('shift_id', shift.id)
      .order('recorded_at');

    const parsedPoints: RoutePoint[] = [];
    for (const p of pings ?? []) {
      const coords = parseGeom(p.geom);
      if (coords) {
        parsedPoints.push({
          latitude: coords.latitude,
          longitude: coords.longitude,
          recorded_at: p.recorded_at,
        });
      }
    }

    setRoutePoints(parsedPoints);

    const { data: visitsData } = await supabase
      .from('visits')
      .select('entry_time, exit_time, duration_minutes, points_of_interest(name)')
      .eq('shift_id', shift.id)
      .order('entry_time');

    const parsedVisits: Visit[] = [];
    for (const v of visitsData ?? []) {
      const poiName = (v as any).points_of_interest?.name ?? 'Punto desconocido';
      parsedVisits.push({
        name: poiName,
        entry_time: v.entry_time,
        exit_time: v.exit_time,
        duration_minutes: v.duration_minutes,
      });
    }

    setVisits(parsedVisits);
    setLoading(false);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Historial</h1>
      <p className="text-neutral-500">Recorrido diario de cada técnico</p>

      <div className="mt-6 flex flex-wrap gap-4">
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

        <Popover>
          <PopoverTrigger className="flex w-64 items-center justify-start rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate.toLocaleDateString('es-CO')}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-neutral-500">Cargando recorrido...</p>
        ) : routePoints.length === 0 ? (
          <p className="text-neutral-500">
            No hay recorrido registrado para este técnico en esta fecha.
          </p>
        ) : (
          <RouteMap points={routePoints} />
        )}
      </div>

      {visits.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white">Puntos visitados</h2>
          <div className="mt-2 space-y-2">
            {visits.map((v, i) => (
              <div
                key={i}
                className="flex justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <span className="text-white">{v.name}</span>
                <span className="text-neutral-400">
                  {new Date(v.entry_time).toLocaleTimeString('es-CO')} -{' '}
                  {new Date(v.exit_time).toLocaleTimeString('es-CO')} ({v.duration_minutes} min)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseGeom(geom: any): { latitude: number; longitude: number } | null {
  if (!geom) return null;

  if (typeof geom === 'object' && geom.coordinates) {
    return { longitude: geom.coordinates[0], latitude: geom.coordinates[1] };
  }

  if (typeof geom === 'string') {
    const wktMatch = geom.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (wktMatch) {
      return { longitude: parseFloat(wktMatch[1]), latitude: parseFloat(wktMatch[2]) };
    }

    if (/^[0-9A-Fa-f]+$/.test(geom) && geom.length >= 42) {
      try {
        const hexCoords = geom.slice(-32);
        const lonHex = hexCoords.slice(0, 16);
        const latHex = hexCoords.slice(16, 32);

        const longitude = hexToDoubleLE(lonHex);
        const latitude = hexToDoubleLE(latHex);

        if (!isNaN(longitude) && !isNaN(latitude)) {
          return { latitude, longitude };
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

function hexToDoubleLE(hex: string): number {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  return view.getFloat64(0, true);
}
