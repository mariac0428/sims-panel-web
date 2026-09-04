'use client';

import { useEffect, useState, useCallback } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

type LiveTechnician = {
  technician_id: string;
  full_name: string;
  shift_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
};

const MEDELLIN_CENTER = { latitude: 6.2442, longitude: -75.5812 };

export function LiveMap({ onShiftClosed }: { onShiftClosed?: () => void }) {
  const [technicians, setTechnicians] = useState<LiveTechnician[]>([]);
  const [selected, setSelected] = useState<LiveTechnician | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const [closing, setClosing] = useState(false);
  const [viewState, setViewState] = useState({
    ...MEDELLIN_CENTER,
    zoom: 12,
  });

  const loadTechnicians = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('live_technician_locations')
      .select('technician_id, full_name, shift_id, geom, recorded_at');

    if (!data) return;

    const parsed: LiveTechnician[] = data
      .map((row: any) => {
        const coords = parseGeomToLatLng(row.geom);
        if (!coords) return null;
        return {
          technician_id: row.technician_id,
          full_name: row.full_name,
          shift_id: row.shift_id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          recorded_at: row.recorded_at,
        };
      })
      .filter(Boolean) as LiveTechnician[];

    setTechnicians(parsed);
  }, []);

  useEffect(() => {
    loadTechnicians();

    const supabase = createClient();
    const channel = supabase
      .channel('location_pings_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'location_pings' },
        () => {
          loadTechnicians();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTechnicians]);

  async function handleForceClose(technician: LiveTechnician) {
    setClosing(true);
    const supabase = createClient();
    await supabase
      .from('shifts')
      .update({
        end_time: new Date().toISOString(),
        status: 'closed',
        closed_reason: 'admin_forced',
      })
      .eq('id', technician.shift_id);

    setClosing(false);
    setSelected(null);
    loadTechnicians();
    onShiftClosed?.();
  }

  const visibleTechnicians = visibleIds
    ? technicians.filter((t) => visibleIds.has(t.technician_id))
    : technicians;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <span className="text-sm text-neutral-400">Ver:</span>
        <button
          className={`rounded px-2 py-1 text-sm ${
            visibleIds === null ? 'bg-white text-black' : 'text-neutral-300'
          }`}
          onClick={() => setVisibleIds(null)}
        >
          Todos
        </button>
        {technicians.map((t) => (
          <button
            key={t.technician_id}
            className={`rounded px-2 py-1 text-sm ${
              visibleIds?.has(t.technician_id) ? 'bg-white text-black' : 'text-neutral-300'
            }`}
            onClick={() => {
              setVisibleIds((prev) => {
                const next = new Set(prev ?? []);
                if (next.has(t.technician_id)) {
                  next.delete(t.technician_id);
                } else {
                  next.add(t.technician_id);
                }
                return next;
              });
            }}
          >
            {t.full_name}
          </button>
        ))}
      </div>

      <div className="h-[500px] w-full overflow-hidden rounded-lg border border-neutral-800">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
        >
          {visibleTechnicians.map((t) => (
            <Marker
              key={t.technician_id}
              latitude={t.latitude}
              longitude={t.longitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelected(t);
              }}
            >
              <div className="cursor-pointer rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-black">
                {t.full_name.split(' ')[0]}
              </div>
            </Marker>
          ))}

          {selected && (
            <Popup
              latitude={selected.latitude}
              longitude={selected.longitude}
              onClose={() => setSelected(null)}
              closeOnClick={false}
              anchor="top"
            >
              <div className="space-y-2 p-1 text-black">
                <p className="font-bold">{selected.full_name}</p>
                <p className="text-xs">
                  Última actualización:{' '}
                  {new Date(selected.recorded_at).toLocaleTimeString('es-CO')}
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={closing}
                  onClick={() => handleForceClose(selected)}
                >
                  {closing ? 'Cerrando...' : 'Forzar cierre de jornada'}
                </Button>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {technicians.length === 0 && (
        <p className="text-center text-sm text-neutral-500">
          No hay técnicos con jornada activa en este momento.
        </p>
      )}
    </div>
  );
}

function parseGeomToLatLng(geom: any): { latitude: number; longitude: number } | null {
  if (!geom) return null;
  if (typeof geom === 'object' && geom.coordinates) {
    return { longitude: geom.coordinates[0], latitude: geom.coordinates[1] };
  }
  if (typeof geom === 'string') {
    const match = geom.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      return { longitude: parseFloat(match[1]), latitude: parseFloat(match[2]) };
    }
  }
  return null;
}
