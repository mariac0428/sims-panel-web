'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { LiveMap } from '@/components/live-map';

export default function DashboardPage() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [staleCount, setStaleCount] = useState<number | null>(null);
  const [visitsToday, setVisitsToday] = useState<number | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    const supabase = createClient();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { count: active } = await supabase
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('shift_date', todayStr);

    const { count: stale } = await supabase
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('shift_date', todayStr);

    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const { count: visits } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('entry_time', startOfDay);

    setActiveCount(active ?? 0);
    setStaleCount(stale ?? 0);
    setVisitsToday(visits ?? 0);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="text-neutral-500">Estado actual de tus técnicos</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">🟢 Técnicos trabajando ahora</p>
          <p className="mt-1 text-2xl font-bold text-white">{activeCount ?? '...'}</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">⚠️ Turnos sin cerrar (días anteriores)</p>
          <p className="mt-1 text-2xl font-bold text-white">{staleCount ?? '...'}</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">📍 Visitas registradas hoy</p>
          <p className="mt-1 text-2xl font-bold text-white">{visitsToday ?? '...'}</p>
        </div>
      </div>

      <div className="mt-6">
        <LiveMap onShiftClosed={loadSummary} />
      </div>
    </div>
  );
}
