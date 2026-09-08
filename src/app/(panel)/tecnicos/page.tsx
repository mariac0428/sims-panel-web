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
import { TechnicianFormDialog } from '@/components/technician-form-dialog';
import { createClient } from '@/lib/supabase/client';

type Technician = {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'tecnico' | 'jefe';
  active: boolean;
};

export default function TecnicosPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);

  useEffect(() => {
    loadTechnicians();
  }, []);

  async function loadTechnicians() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('technicians')
      .select('id, full_name, phone, role, active')
      .order('full_name');

    setTechnicians(data ?? []);
    setLoading(false);
  }

  function handleAddNew() {
    setEditingTechnician(null);
    setDialogOpen(true);
  }

  function handleEdit(technician: Technician) {
    setEditingTechnician(technician);
    setDialogOpen(true);
  }

  async function handleToggleActive(technician: Technician) {
    const supabase = createClient();
    await supabase
      .from('technicians')
      .update({ active: !technician.active })
      .eq('id', technician.id);
    loadTechnicians();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Técnicos</h1>
          <p className="text-muted-foreground">Personal con acceso a la app móvil y al panel</p>
        </div>
        <Button onClick={handleAddNew}>Agregar técnico</Button>
      </div>

      <div className="mt-6 rounded-lg border border-border text-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground">Nombre</TableHead>
              <TableHead className="text-foreground">Teléfono</TableHead>
              <TableHead className="text-foreground">Rol</TableHead>
              <TableHead className="text-foreground">Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : technicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay técnicos registrados todavía.
                </TableCell>
              </TableRow>
            ) : (
              technicians.map((technician) => (
                <TableRow key={technician.id}>
                  <TableCell className="font-medium">{technician.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{technician.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={technician.role === 'jefe' ? 'default' : 'secondary'}>
                      {technician.role === 'jefe' ? 'Jefe' : 'Técnico'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={technician.active ? 'default' : 'outline'}>
                      {technician.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(technician)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(technician)}
                    >
                      {technician.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TechnicianFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTechnician={editingTechnician}
        onSaved={loadTechnicians}
      />
    </div>
  );
}
