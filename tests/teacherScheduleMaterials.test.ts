import assert from 'node:assert/strict';
import { materialForSessionDate, teachingWeekForDate } from '../src/lib/teacherScheduleMaterials';

const materials = [
  { month: '10/2026', week: 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026', session: 1, title: 'Tuần trước', slide: '', lms: '' },
  { month: '10/2026', week: 'Tuần 2: Từ ngày 12/10/2026 đến ngày 18/10/2026', session: 1, title: 'Slide Toán', slide: 'https://example.com/slide', lms: '' },
  { month: '10/2026', week: 'Tuần 2: Từ ngày 12/10/2026 đến ngày 18/10/2026', session: 2, title: 'Bài tập', slide: '', lms: 'https://example.com/lms' }
];

assert.deepEqual(teachingWeekForDate(new Date(2026, 9, 14)).from, '2026-10-12');
assert.equal(materialForSessionDate(materials, 1, '2026-10-14')?.title, 'Slide Toán');
assert.equal(materialForSessionDate(materials, 2, '2026-10-16')?.title, 'Bài tập');
assert.equal(materialForSessionDate(materials, 1, '2026-10-19'), undefined);
assert.equal(materialForSessionDate(materials, 2, '2026-10-11'), undefined);
