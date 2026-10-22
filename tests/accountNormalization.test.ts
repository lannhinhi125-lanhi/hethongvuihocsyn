import assert from 'node:assert/strict';
import {fromSupabaseRow,toSupabaseRow} from '../src/lib/supabaseMapper';
import {recordChanges} from '../src/lib/recordChanges';

const queried={madinhdanh:'U',hoten:'Nguyễn Văn An',tendangnhap:'u',thudientu:'u@example.test',sodienthoai:'',manhomquyen:'GROUP-A',trangthai:'active',vaitro:'Nhóm tùy chỉnh',mamonhoc:'SUB-A',chucaiavatar:'VA'};
const original=fromSupabaseRow('users',queried);
const source=toSupabaseRow('users',original);
assert.equal(original.role,'Nhóm tùy chỉnh');
assert.equal(original.subject,'SUB-A');
assert.equal(original.avatarInitials,'VA');
assert.ok(!Object.hasOwn(source,'vaitro')&&!Object.hasOwn(source,'mamonhoc')&&!Object.hasOwn(source,'chucaiavatar'));
const refreshed={...original,role:'Tên nhóm mới',subject:'SUB-B',avatarInitials:'NA'};
assert.deepEqual(recordChanges('users',[source],[toSupabaseRow('users',refreshed)],[queried]),[], 'refreshing queried fields must not produce a write against removed SQL columns');
const moved=toSupabaseRow('users',{...refreshed,roleGroupId:'GROUP-B'});
assert.deepEqual(recordChanges('users',[source],[moved],[queried]),[{dataset:'users',before:{madinhdanh:'U',manhomquyen:'GROUP-A'},after:{madinhdanh:'U',manhomquyen:'GROUP-B'}}]);
const teacherSubject=toSupabaseRow('teachers',{id:'T',subject:'SUB-B'});
assert.equal(teacherSubject.mamonhoc,'SUB-B','teacher profile remains the writable subject source');
console.log('PASS queried account labels/subject/avatar remain visible, never persist, and group assignment writes only the foreign key');
