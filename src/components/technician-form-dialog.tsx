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
import { createClient } from '@/lib/supabase/client';

type Technician = {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'tecnico' | 'jefe';
  active: boolean;
};

type TechnicianFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTechnician: Technician | null;
  onSaved: () => void;
};

export function TechnicianFormDialog({
  open,
  onOpenChange,
  editingTechnician,
  onSaved,
}: TechnicianFormDialogProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'tecnico' | 'jefe'>('tecnico');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (editingTechnician) {
      setFullName(editingTechnician.full_name);
      setPhone(editingTechnician.phone ?? '');
      setRole(editingTechnician.role);
      setEmail('');
    } else {
      setFullName('');
      setPhone('');
      setEmail('');
      setRole('tecnico');
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [editingTechnician, open]);

  async function handleSave() {
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }

    const supabase = createClient();

    if (editingTechnician) {
      setSaving(true);
      const { error } = await supabase
        .from('technicians')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role,
        })
        .eq('id', editingTechnician.id);

      setSaving(false);
      if (error) {
        setErrorMsg('Error al guardar: ' + error.message);
        return;
      }
      onOpenChange(false);
      onSaved();
      return;
    }

    if (!email.trim()) {
      setErrorMsg('El correo es obligatorio para crear un técnico nuevo.');
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      setErrorMsg('Sesión inválida. Vuelve a iniciar sesión.');
      return;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-technician`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role,
        }),
      }
    );

    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setErrorMsg(result.error ?? 'Error al crear el técnico.');
      return;
    }

    setSuccessMsg('Técnico creado. Se le envió una invitación por correo.');
    setTimeout(() => {
      onOpenChange(false);
      onSaved();
    }, 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-neutral-900 text-white">
        <DialogHeader>
          <DialogTitle>
            {editingTechnician ? 'Editar técnico' : 'Agregar técnico'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              className="bg-neutral-800 text-white border-neutral-700"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              className="bg-neutral-800 text-white border-neutral-700"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="3001234567"
            />
          </div>

          {!editingTechnician && (
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                className="bg-neutral-800 text-white border-neutral-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@sims.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'tecnico' | 'jefe')}>
              <SelectTrigger className="bg-neutral-800 text-white border-neutral-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="jefe">Jefe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          {successMsg && <p className="text-sm text-green-500">{successMsg}</p>}
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
