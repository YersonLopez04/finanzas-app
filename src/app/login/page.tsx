'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await getSupabase().auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.replace('/dashboard');
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const { data, error: authError } = await getSupabase().auth.signUp({ email, password });
      if (authError) throw authError;
      if (data.session) {
        router.replace('/dashboard');
      } else {
        setInfo('Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de ingresar.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  function handleSubmit() {
    if (mode === 'login') handleLogin();
    else handleSignup();
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm dark:shadow-none p-8 w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100">Finanzas</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {mode === 'login' ? 'Ingresa con tu cuenta' : 'Crea tu cuenta'}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>}
          <Button onClick={handleSubmit} disabled={loading} className="mt-1 w-full">
            {loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Button>

          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
            o
            <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
          </div>

          <Button variant="secondary" onClick={handleGoogle} className="w-full">
            Continuar con Google
          </Button>

          <button
            onClick={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'));
              setError('');
              setInfo('');
            }}
            className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors text-center"
          >
            {mode === 'login' ? '¿No tienes cuenta? Créala aquí' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
