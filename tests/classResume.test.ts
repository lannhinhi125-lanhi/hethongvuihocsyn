import assert from 'node:assert/strict';
import { resumeClassUpdates } from '../src/lib/classPause';
import { classStatusLabel } from '../src/lib/classStatus';
import { recordChanges } from '../src/lib/recordChanges';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabaseMapper';

for (const status of ['Chờ khai giảng', 'Đang học', undefined] as const) {
  const before = { id: 'C1', paused: true, status };
  const after = { ...before, ...resumeClassUpdates(before) };
  assert.equal(classStatusLabel(after), 'Đang học');
  const oldRow = toSupabaseRow('classes', before);
  const newRow = toSupabaseRow('classes', after);
  const changes = recordChanges('classes', [oldRow], [newRow], [oldRow]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].after?.tamdunglich, false);
  assert.equal(newRow.trangthai, 'DANG_HOC');
  if (status !== 'Đang học') assert.equal(changes[0].after?.trangthai, 'DANG_HOC');
  const reloaded = fromSupabaseRow('classes', newRow);
  assert.equal(reloaded.status, 'Đang học');
  assert.equal(reloaded.paused, false);
}
for (const status of ['Dừng lớp', 'Đã kết thúc'] as const) {
  assert.deepEqual(resumeClassUpdates({ paused: true, status }), {}, 'closed classes must stay closed');
}
assert.deepEqual(resumeClassUpdates({ paused: false, status: 'Chờ khai giảng' }), {}, 'unpaused classes are unchanged');
console.log('PASS: resume restores teaching status, persists both fields, survives decoding, and preserves closed/unpaused classes.');
