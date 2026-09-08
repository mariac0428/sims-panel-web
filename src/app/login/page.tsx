'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg('Correo o contrasena incorrectos.');
      return;
    }

    const { data: technician } = await supabase
      .from('technicians')
      .select('role')
      .eq('auth_user_id', data.user.id)
      .single();

    if (!technician || technician.role !== 'jefe') {
      setLoading(false);
      setErrorMsg('Esta cuenta es de tecnico. Usa la app movil para iniciar sesion.');
      await supabase.auth.signOut();
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">SIMS</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Servicios Integrales Mecanicos S.A.S.
            <br />
            Panel de administracion
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Correo electronico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-white bg-neutral-900 border-neutral-700 focus-visible:border-amber-400 focus-visible:ring-amber-400"
            />
          </div>

          <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Contraseña</Label>
                  <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-white bg-neutral-900 border-neutral-700 focus-visible:border-amber-400 focus-visible:ring-amber-400"
            />
          </div>

          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesion'}
          </Button>

          
           <a href="/recuperar-contrasena"
            className="block text-center text-sm text-neutral-400 hover:text-white"
          >
            Olvidaste tu contrasena?
          </a>
        </form>
      </div>
    </div>
  );
}