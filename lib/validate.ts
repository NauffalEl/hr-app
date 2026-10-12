// Validator ringan semua input action/API. Tanpa zod (rung ladder: stdlib cukup).
// Semua fungsi melempar ActionError(400, pesan) bila gagal.

import { ActionError } from '@/lib/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_RE = /^[a-z0-9_]{1,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ActionError(400, 'Body harus object');
  }
  return input as Record<string, unknown>;
}

export function reqStr(obj: Record<string, unknown>, key: string, max: number, min = 1): string {
  const v = obj[key];
  if (typeof v !== 'string') throw new ActionError(400, `${key} wajib string`);
  const t = v.trim();
  if (t.length < min) throw new ActionError(400, `${key} terlalu pendek`);
  if (t.length > max) throw new ActionError(400, `${key} terlalu panjang (maks ${max})`);
  return t;
}

export function optStr(obj: Record<string, unknown>, key: string, max: number): string | undefined {
  if (obj[key] === undefined || obj[key] === null || obj[key] === '') return undefined;
  return reqStr(obj, key, max);
}

export function reqEmail(obj: Record<string, unknown>, key = 'email'): string {
  const v = reqStr(obj, key, 255).toLowerCase();
  if (!EMAIL_RE.test(v)) throw new ActionError(400, `${key} tidak valid`);
  return v;
}

export function reqUuid(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new ActionError(400, `${key} bukan uuid valid`);
  return v;
}

export function pathUuid(value: string, name: string): string {
  if (!UUID_RE.test(value)) throw new ActionError(400, `${name} bukan uuid valid`);
  return value;
}

export function reqDate(obj: Record<string, unknown>, key: string): Date {
  const v = obj[key];
  if (typeof v !== 'string' || !DATE_RE.test(v)) throw new ActionError(400, `${key} harus YYYY-MM-DD`);
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new ActionError(400, `${key} tidak valid`);
  return d;
}

export function reqEnum<T extends string>(obj: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = obj[key];
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new ActionError(400, `${key} harus salah satu: ${allowed.join(', ')}`);
  }
  return v as T;
}

export function optEnum<T extends string>(obj: Record<string, unknown>, key: string, allowed: readonly T[]): T | undefined {
  if (obj[key] === undefined || obj[key] === null || obj[key] === '') return undefined;
  return reqEnum(obj, key, allowed);
}

export function reqInt(obj: Record<string, unknown>, key: string, min: number, max: number): number {
  const v = obj[key];
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ActionError(400, `${key} harus integer ${min}-${max}`);
  }
  return n;
}

export function optInt(obj: Record<string, unknown>, key: string, min: number, max: number): number | undefined {
  if (obj[key] === undefined || obj[key] === null || obj[key] === '') return undefined;
  return reqInt(obj, key, min, max);
}

export function reqBool(obj: Record<string, unknown>, key: string): boolean {
  const v = obj[key];
  if (typeof v !== 'boolean') throw new ActionError(400, `${key} harus boolean`);
  return v;
}

export function reqTemplateKey(obj: Record<string, unknown>, key = 'key'): string {
  const v = reqStr(obj, key, 64).toLowerCase();
  if (!KEY_RE.test(v)) throw new ActionError(400, `${key} harus pola ^[a-z0-9_]{1,64}$`);
  return v;
}

export function pagination(obj: Record<string, unknown>, def = 10, max = 100) {
  const page = optInt(obj, 'page', 1, 100_000) ?? 1;
  const pageSize = optInt(obj, 'pageSize', 1, max) ?? def;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
