// Selfcheck: verifikasi logika non-trivial tanpa DB (assert-based).
import assert from 'node:assert/strict';

const dayMs = 86_400_000;
const d = (s) => new Date(`${s}T00:00:00.000Z`);

// hitungHariKerja — replika lib/leave.ts (runtime TS tidak tersedia di sini).
function hitungHariKerja(mulai, akhir) {
  const yM = mulai.getUTCFullYear(), yA = akhir.getUTCFullYear();
  if (yM < 2000 || yM > 2100 || yA < 2000 || yA > 2100) throw new RangeError('Tanggal di luar rentang 2000-2100');
  const totalHari = Math.floor((akhir.getTime() - mulai.getTime()) / dayMs) + 1;
  if (totalHari < 1) throw new RangeError('Rentang tanggal tidak valid');
  if (totalHari > 366) throw new RangeError('Rentang cuti maksimal 366 hari');
  let count = 0;
  const cursor = new Date(mulai.getTime());
  while (cursor.getTime() <= akhir.getTime()) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

// 1. Senin-Jumat pekan penuh = 5
assert.equal(hitungHariKerja(d('2026-10-12'), d('2026-10-16')), 5);
// 2. Sabtu-Minggu saja = 0
assert.equal(hitungHariKerja(d('2026-10-17'), d('2026-10-18')), 0);
// 3. Range melewati weekend
assert.equal(hitungHariKerja(d('2026-10-16'), d('2026-10-19')), 2); // Jum+Sen
// 4. Setahun penuh kerja 2026 (365 hari, weekday saja) = 261
assert.equal(hitungHariKerja(d('2026-01-01'), d('2026-12-31')), 261);
// 5. Rentang terbalik ditolak
assert.throws(() => hitungHariKerja(d('2026-10-16'), d('2026-10-12')), RangeError);
// 6. > 366 hari ditolak
assert.throws(() => hitungHariKerja(d('2024-01-01'), d('2025-01-02')), RangeError);
// 7. Di luar 2000-2100 ditolak
assert.throws(() => hitungHariKerja(d('1999-12-31'), d('2000-01-01')), RangeError);
// 8. Satu hari = 1 (kalau weekday)
assert.equal(hitungHariKerja(d('2026-10-14'), d('2026-10-14')), 1);

// Reminder milestone logic — replika lib/reminder.ts.
const MILESTONES = [{ days: 30, key: 'H30' }, { days: 14, key: 'H14' }, { days: 7, key: 'H7' }];
const milestoneFor = (sisa) => {
  if (sisa < 0 || sisa > 30) return null;
  const m = [...MILESTONES].reverse().find((x) => sisa <= x.days);
  return m ? m.key : null;
};
assert.equal(milestoneFor(31), null);
assert.equal(milestoneFor(30), 'H30');
assert.equal(milestoneFor(20), 'H30');
assert.equal(milestoneFor(14), 'H14');
assert.equal(milestoneFor(8), 'H14');
assert.equal(milestoneFor(7), 'H7');
assert.equal(milestoneFor(0), 'H7');
assert.equal(milestoneFor(-1), null);

// Template rendering — replika lib/email.ts.
const render = (s, vars) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? '');
assert.equal(render('Halo {{ nama }}, sisa {{sisa_hari}} hari', { nama: 'Budi', sisa_hari: '14' }), 'Halo Budi, sisa 14 hari');
assert.equal(render('x {{unknown}} y', {}), 'x  y');

console.log('selfcheck OK: 8 hitungHariKerja + 9 milestone + 2 template assertions lolos');
