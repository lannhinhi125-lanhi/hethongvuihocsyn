import assert from 'node:assert/strict';
import { expandPermissions, serializePermissions, permissionModules, rolePortal } from '../src/lib/portalPermissions';
const role = { id: 'r', name: 'Giáo viên Giảng dạy', category: 'GIẢNG DẠY' as const, desc: '', userCount: 0, permissions: ['TEACHER_PORTAL'] };
assert.equal(rolePortal(role), 'TEACHER');
assert.equal(rolePortal({ ...role, category: 'HỆ THỐNG', portal: 'ADMIN' }), 'ADMIN');
const teachers = expandPermissions(['TEACHER_PORTAL'], 'TEACHER');
assert.equal(teachers.length, permissionModules.TEACHER.flatMap(module => module.features).length);
assert.equal(expandPermissions(['TEACHER_PORTAL'], 'ADMIN').length, 0);
const admin = expandPermissions(['ALL'], 'ADMIN');
const dashboardFeature='Xem Dashboard chỉ số KPI & Biểu đồ tổng quan';
assert.deepEqual(permissionModules.ADMIN.find(m=>m.id==='PH0')?.features,[dashboardFeature]);
assert.ok(!permissionModules.ADMIN.find(m=>m.id==='PH8')?.features.includes(dashboardFeature));
assert.deepEqual(expandPermissions(['PH8_READ'],'ADMIN'),[dashboardFeature],'old dashboard-only roles gain no detailed-report access');
assert.ok(expandPermissions(['PH8_ALL'],'ADMIN').includes(dashboardFeature),'saved report roles retain home access');
const reportsOnly=permissionModules.ADMIN.find(m=>m.id==='PH8')!.features;
assert.ok(!expandPermissions(serializePermissions(reportsOnly,'ADMIN'),'ADMIN').includes(dashboardFeature),'home can be independently disabled');
assert.ok(!serializePermissions([dashboardFeature],'ADMIN').includes('PH0_ALL'),'persist existing database-compatible feature');
assert.equal(admin.length, permissionModules.ADMIN.flatMap(module => module.features).length);
const catalog = permissionModules.ADMIN.find(module => module.id === 'PH2')!;
assert.deepEqual(expandPermissions(['PH2_READ'], 'ADMIN'), ['Xem danh mục dùng chung']);
assert.equal(expandPermissions(['PH2_ALL'], 'ADMIN').length, catalog.features.length);
assert.ok(serializePermissions(catalog.features, 'ADMIN').includes('PH2_ALL'));
assert.ok(!serializePermissions(catalog.features.slice(1), 'ADMIN').includes('PH2_ALL'));
assert.deepEqual(new Set(expandPermissions(serializePermissions(admin, 'ADMIN'), 'ADMIN')), new Set(admin));
assert.equal(expandPermissions(['ALL'], 'TEACHER').some(feature => admin.includes(feature)), false);
console.log('Passed: portal grouping, legacy permission expansion, read-only scope and module serialization.');


assert.deepEqual(expandPermissions(['Khởi tạo lớp, gán gói thời hạn tự tính ngày kết thúc'], 'ADMIN'), ['Tạo, sửa, xóa lớp và cập nhật link phòng học']);
assert.deepEqual(expandPermissions(['Xem tổng hợp lịch rảnh & Khóa sổ đăng ký tuần'], 'ADMIN'), ['Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên']);
assert.deepEqual(expandPermissions(['Xuất danh sách hồ sơ giáo viên ra file Excel'], 'ADMIN'), []);
assert.deepEqual(expandPermissions(['Xác nhận bảng công cá nhân'], 'TEACHER'), []);
assert.deepEqual(expandPermissions(['Khóa sổ Chốt công & Xuất file Excel bàn giao'], 'ADMIN'), ['Khóa, mở kỳ công và xuất CSV / in bảng công']);
for (const modules of Object.values(permissionModules)) {
  const labels = modules.flatMap(module => module.features);
  assert.equal(new Set(labels).size, labels.length, 'Permission criteria must not repeat');
  assert.ok(!labels.some(label => /Khóa sổ đăng ký tuần|trạng thái khóa tuần|hạn lớp theo gói|Xác nhận bảng công cá nhân|Xuất danh sách hồ sơ giáo viên/.test(label)));
}
console.log('Passed: current criteria, removed unavailable actions and compatibility with saved permission labels.');
