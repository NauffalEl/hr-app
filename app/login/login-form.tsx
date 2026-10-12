'use client';

import { useActionState, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Field, inputCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { login } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { FormState } from '@/app/_lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const values = fd(formData);
    const email = String(values.email ?? '');
    const password = String(values.password ?? '');
    const fieldErrors: Record<string, string> = {};
    if (!email) fieldErrors.email = 'Email wajib diisi.';
    else if (!EMAIL_RE.test(email)) fieldErrors.email = 'Format email tidak valid.';
    if (!password) fieldErrors.password = 'Password wajib diisi.';
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

    const res = await login({ email, password });
    return fromAction(res, ['email', 'password']);
  }

  useEffect(() => {
    if (state?.ok) {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [state, router]);

  const fe = state?.fieldErrors;

  return (
    <Card className="w-full max-w-96">
      <CardBody className="p-6">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold text-slate-900">HRIS</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Masuk ke akun Anda</h1>
        </div>

        {state && !state.ok && state.message && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
          >
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-4" noValidate>
          <Field id="email" label="Email" required error={fe?.email}>
            {(ctl) => (
              <input
                {...ctl}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nama@perusahaan.com"
                className={inputCls(fe?.email)}
              />
            )}
          </Field>

          <Field id="password" label="Password" required error={fe?.password}>
            {(ctl) => (
              <div className="relative">
                <input
                  {...ctl}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputCls(fe?.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                </button>
              </div>
            )}
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={pending} loadingLabel="Memeriksa…">
            Masuk
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] text-slate-500">
          Lupa password? Hubungi HR Admin.
        </p>
      </CardBody>
    </Card>
  );
}
