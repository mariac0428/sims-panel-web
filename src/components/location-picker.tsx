'use client';

import { useState, useCallback, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

type LocationPickerProps = {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
};

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const [viewState, setViewState] = useState({
    latitude,
    longitude,
    zoom: 16,
  });

  useEffect(() => {
    setViewState((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));
  }, [latitude, longitude]);

  const handleMarkerDrag = useCallback(
    (event: { lngLat: { lat: number; lng: number } }) => {
      onChange(event.lngLat.lat, event.lngLat.lng);
    },
    [onChange]
  );

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg border border-input">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <Marker
          latitude={latitude}
          longitude={longitude}
          draggable
          onDragEnd={handleMarkerDrag}
        />
      </Map>
    </div>
  );
}