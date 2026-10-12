'use server';

// PLACEHOLDER (Raka) — Dimas: ganti isi file ini dengan implementasi asli
// (Supabase signInWithPassword + insert session). Kontrak: docs/contracts.md.
// Signature harus dipertahankan: login(input) -> ActionResult, logout() -> ActionResult.

export async function login(input: unknown): Promise<unknown> {
  void input;
  throw new Error('login belum diimplementasi');
}

export async function logout(): Promise<unknown> {
  throw new Error('logout belum diimplementasi');
}
