'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationPicker } from '@/components/location-picker';
import { geocodeAddress } from '@/lib/geocoding';
import { createClient } from '@/lib/supabase/client';

const MEDELLIN_DEFAULT = { latitude: 6.2442, longitude: -75.5812 };

type PointOfInterest = {
  id: string;
  name: string;
  address: string | null;
  type: 'cliente' | 'proveedor';
  radius_meters: number;
  active: boolean;
};

type PoiFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPoint: PointOfInterest | null;
  onSaved: () => void;
};

export function PoiFormDialog({
  open,
  onOpenChange,
  editingPoint,
  onSaved,
}: PoiFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'cliente' | 'proveedor'>('cliente');
  const [radius, setRadius] = useState('40');
  const [addressQuery, setAddressQuery] = useState('');
  const [coords, setCoords] = useState(MEDELLIN_DEFAULT);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingPoint) {
      setName(editingPoint.name);
      setType(editingPoint.type);
      setRadius(String(editingPoint.radius_meters));
      setAddressQuery(editingPoint.address ?? '');
    } else {
      setName('');
      setType('cliente');
      setRadius('40');
      setAddressQuery('');
      setCoords(MEDELLIN_DEFAULT);
    }
    setErrorMsg('');
  }, [editingPoint, open]);

  async function handleSearchAddress() {
    if (!addressQuery.trim()) return;
    setSearching(true);
    const result = await geocodeAddress(addressQuery);
    setSearching(false);

    if (!result) {
      setErrorMsg('No se encontró esa dirección. Intenta ser más específico.');
      return;
    }
    setErrorMsg('');
    setCoords(result);
  }

  async function handleSave() {
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }
    const radiusNum = parseInt(radius, 10);
    if (isNaN(radiusNum) || radiusNum <= 0) {
      setErrorMsg('El radio debe ser un número mayor a 0.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const geomWkt = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;

    if (editingPoint) {
      const { error } = await supabase
        .from('points_of_interest')
        .update({
          name: name.trim(),
          address: addressQuery.trim() || null,
          type,
          radius_meters: radiusNum,
          geom: geomWkt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPoint.id);

      setSaving(false);
      if (error) {
        setErrorMsg('Error al guardar: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('points_of_interest').insert({
        name: name.trim(),
        address: addressQuery.trim() || null,
        type,
        radius_meters: radiusNum,
        geom: geomWkt,
        active: true,
      });

      setSaving(false);
      if (error) {
        setErrorMsg('Error al guardar: ' + error.message);
        return;
      }
    }

    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-neutral-900 text-white">
        <DialogHeader>
          <DialogTitle>
            {editingPoint ? 'Editar punto de interés' : 'Agregar punto de interés'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              className="bg-neutral-800 text-white border-neutral-700"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Restaurante El Buen Sabor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'cliente' | 'proveedor')}>
                <SelectTrigger className="bg-neutral-800 text-white border-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="proveedor">Proveedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">Radio (metros)</Label>
              <Input
                id="radius"
                type="number"
                className="bg-neutral-800 text-white border-neutral-700"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                className="bg-neutral-800 text-white border-neutral-700"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder="Calle 10 #43-12, Medellín"
              />
              <Button type="button" variant="secondary" onClick={handleSearchAddress} disabled={searching}>
                {searching ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            <p className="text-xs text-neutral-500">
              Busca la dirección para centrar el mapa, luego arrastra el pin al punto exacto.
            </p>
          </div>

          <LocationPicker
            latitude={coords.latitude}
            longitude={coords.longitude}
            onChange={(lat, lng) => setCoords({ latitude: lat, longitude: lng })}
          />

          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}