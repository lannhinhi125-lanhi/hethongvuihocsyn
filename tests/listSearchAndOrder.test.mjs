import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const load = file => import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(readFileSync(file, 'utf8'))).toString('base64'));
const { matchesSearch } = await load('src/lib/textSearch.ts');
const { orderRecords, recordSortTime } = await load('src/lib/listOrder.ts');

test('teacher and student searches accept Vietnamese, unaccented names, codes and multiple words', () => {
  assert.ok(matchesSearch('bui duc thanh', 'Bùi Đức Thành', 'GV-123'));
  assert.ok(matchesSearch('ĐỨC', 'Bùi Đức Thành'));
  assert.ok(matchesSearch('ngoc HS-098', 'Trần Ngọc Trung', 'DEMO-HS-098'));
  assert.ok(matchesSearch('  ', 'Trần Ngọc Trung'));
  assert.ok(!matchesSearch('nguyen HS-098', 'Trần Ngọc Trung', 'DEMO-HS-098'));
});

test('creation time determines newest order regardless of names, IDs or lesson dates', () => {
  const records = [
    { id: 'ZZZ', created_at: '2026-11-01T10:00:00Z', date: '2027-12-01' },
    { id: 'AAA', created_at: '2026-11-03T10:00:00Z', date: '2026-01-01' },
    { id: 'BBB', ngaytao: '2026-11-02T10:00:00Z' },
    { id: 'unknown' },
  ];
  assert.deepEqual(orderRecords(records, 'newest', recordSortTime).map(row => row.id), ['AAA', 'BBB', 'ZZZ', 'unknown']);
  assert.equal(records[0].id, 'ZZZ', 'sorting must not mutate the source list');
});

test('equal and missing dates retain stable ordering; explicit oldest remains available', () => {
  const records = [{ id: 'first', created_at: '2026-11-03' }, { id: 'second', created_at: '2026-11-03' }, { id: 'old', created_at: '2026-11-01' }, { id: 'unknown-1' }, { id: 'unknown-2' }];
  assert.deepEqual(orderRecords(records, 'newest', recordSortTime).map(row => row.id), ['first', 'second', 'old', 'unknown-1', 'unknown-2']);
  assert.deepEqual(orderRecords(records, 'oldest', recordSortTime).map(row => row.id), ['old', 'first', 'second', 'unknown-1', 'unknown-2']);
});
