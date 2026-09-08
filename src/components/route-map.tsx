'use client';

import { useMemo } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

type RoutePoint = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type RouteMapProps = {
  points: RoutePoint[];
};

export function RouteMap({ points }: RouteMapProps) {
  const lineGeoJson = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: points.map((p) => [p.longitude, p.latitude]),
      },
    }),
    [points]
  );

  const first = points[0];
  const last = points[points.length - 1];

  const centerLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const centerLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-lg border border-border">
      <Map
        initialViewState={{
          latitude: centerLat,
          longitude: centerLng,
          zoom: 14,
        }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <Source id="route" type="geojson" data={lineGeoJson}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              'line-color': '#F2D000',
              'line-width': 4,
            }}
          />
        </Source>

        {first && (
          <Marker latitude={first.latitude} longitude={first.longitude}>
            <div className="rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-black">
              Inicio
            </div>
          </Marker>
        )}

        {last && last !== first && (
          <Marker latitude={last.latitude} longitude={last.longitude}>
            <div className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-foreground">
              Fin
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
