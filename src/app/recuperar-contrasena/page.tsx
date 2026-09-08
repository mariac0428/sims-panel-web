'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/actualizar-contrasena`,
    });

    setLoading(false);

    if (error) {
      setErrorMsg('Ocurrio un error. Intenta de nuevo.');
      return;
    }

    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Recuperar contrasena</h1>
        </div>

        {sent ? (
          <p className="text-center text-sm text-neutral-300">
            Si el correo existe en el sistema, te enviamos un enlace para restablecer tu
            contrasena. Revisa tu bandeja de entrada.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>

            
            <a  href="/login"
              className="block text-center text-sm text-neutral-400 hover:text-white"
            >
              Volver al inicio de sesion
            </a>
          </form>
        )}
      </div>
    </div>
  );
}