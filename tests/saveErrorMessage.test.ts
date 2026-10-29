import assert from 'node:assert/strict';
import {saveErrorMessage} from '../src/lib/saveErrorMessage';

const referenced=saveErrorMessage({code:'23503',message:'update or delete on table "LOAI_TAI_LIEU" violates foreign key constraint "document_type_fk" on table "TAI_LIEU_QUY_TRINH"',details:'Key (madinhdanh)=(TYPE-1) is still referenced from table "TAI_LIEU_QUY_TRINH".'});
assert.match(referenced,/đang được dùng trong tài liệu/);
assert.match(referenced,/xử lý liên kết/);
assert.doesNotMatch(referenced,/foreign key|document_type_fk/);
assert.match(saveErrorMessage({code:'23001',message:'update or delete on table "MON_HOC" violates RESTRICT setting of foreign key constraint "subject_fk" on table "NGUOI_DUNG"'}),/đang được dùng trong tài khoản/);
const missing=saveErrorMessage({code:'23503',message:'insert or update violates foreign key constraint',details:'Key (magiaovien)=(T1) is not present in table "GIAO_VIEN".'});
assert.match(missing,/giáo viên đã bị xóa hoặc không còn tồn tại/);
assert.match(missing,/tải lại/);
assert.match(saveErrorMessage({code:'23505',message:'duplicate key value violates unique constraint',details:'Key (malophoc)=(C1) already exists.'}),/Mã lớp đã được sử dụng/);
assert.match(saveErrorMessage({code:'23503',message:'foreign key failed'}),/dữ liệu khác/);
const rule='Ca T2 đã gắn với lớp CLASS-01; dừng hoạt động lớp trước khi sửa lịch rảnh.';
assert.equal(saveErrorMessage({code:'P0001',message:rule}),rule);
assert.equal(saveErrorMessage(new Error(rule)),rule);
assert.equal(saveErrorMessage({message:'Failed to fetch'}),'Failed to fetch');
assert.match(saveErrorMessage({code:'57014',message:'canceling statement due to statement timeout'}),/mất quá nhiều thời gian/);
assert.doesNotMatch(saveErrorMessage({message:'canceling statement due to statement timeout'}),/canceling statement/);
assert.equal(saveErrorMessage(null),'Chưa lưu được dữ liệu. Vui lòng thử lại.');
console.log('PASS: referenced/missing data and duplicate values have actionable messages; business rules and unknown errors stay intact');

const loadTimeout=saveErrorMessage({code:'57014',message:'statement timeout'},'load');
assert.match(loadTimeout,/Tải dữ liệu/);
assert.doesNotMatch(loadTimeout,/lưu|khóa dữ liệu/);
