'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PoiFormDialog } from '@/components/poi-form-dialog';
import { createClient } from '@/lib/supabase/client';

type PointOfInterest = {
  id: string;
  name: string;
  address: string | null;
  type: 'cliente' | 'proveedor';
  radius_meters: number;
  active: boolean;
};

export default function PuntosDeInteresPage() {
  const [points, setPoints] = useState<PointOfInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<PointOfInterest | null>(null);

  useEffect(() => {
    loadPoints();
  }, []);

  async function loadPoints() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('points_of_interest')
      .select('id, name, address, type, radius_meters, active')
      .order('name');

    setPoints(data ?? []);
    setLoading(false);
  }

  function handleAddNew() {
    setEditingPoint(null);
    setDialogOpen(true);
  }

  function handleEdit(point: PointOfInterest) {
    setEditingPoint(point);
    setDialogOpen(true);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Puntos de interés</h1>
          <p className="text-muted-foreground">Restaurantes clientes y tiendas proveedoras</p>
        </div>
        <Button onClick={handleAddNew}>Agregar punto</Button>
      </div>

      <div className="mt-6 rounded-lg border border-border text-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground">Nombre</TableHead>
              <TableHead className="text-foreground">Dirección</TableHead>
              <TableHead className="text-foreground">Tipo</TableHead>
              <TableHead className="text-foreground">Radio</TableHead>
              <TableHead className="text-foreground">Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : points.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay puntos de interés registrados todavía.
                </TableCell>
              </TableRow>
            ) : (
              points.map((point) => (
                <TableRow key={point.id}>
                  <TableCell className="font-medium">{point.name}</TableCell>
                  <TableCell className="text-muted-foreground">{point.address ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={point.type === 'cliente' ? 'default' : 'secondary'}>
                      {point.type === 'cliente' ? 'Cliente' : 'Proveedor'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{point.radius_meters} m</TableCell>
                  <TableCell>
                    <Badge variant={point.active ? 'default' : 'outline'}>
                      {point.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(point)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PoiFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingPoint={editingPoint}
        onSaved={loadPoints}
      />
    </div>
  );
}