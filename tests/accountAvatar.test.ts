import assert from 'node:assert/strict';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabaseMapper';

const admin = fromSupabaseRow('users', { madinhdanh: 'ADMIN', hoten: 'Trần Quản Trị' });
assert.equal(admin.avatarInitials, 'QT');
assert.equal(fromSupabaseRow('users', { hoten: '  Trần   Quản  Trị  ' }).avatarInitials, 'QT');
assert.equal(fromSupabaseRow('users', { hoten: 'Đức' }).avatarInitials, 'Đ');
assert.equal(fromSupabaseRow('users', { hoten: '' }).avatarInitials, 'VH');
assert.equal(fromSupabaseRow('users', {}).avatarInitials, 'VH');
assert.equal(fromSupabaseRow('users', { hoten: 'Trần Minh Anh' }).avatarInitials, 'MA');
assert.ok(!Object.hasOwn(toSupabaseRow('users', admin), 'avatarInitials'), 'Initials are derived, never written to the database');
console.log('PASS: account avatar initials survive server hydration and do not enter database writes.');
