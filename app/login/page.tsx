import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Masuk' };

// Halaman publik (tanpa app shell).
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <LoginForm />
      <p className="mt-6 text-center text-xs text-slate-500">
        Aplikasi internal — akses terbatas karyawan.
      </p>
    </main>
  );
}
