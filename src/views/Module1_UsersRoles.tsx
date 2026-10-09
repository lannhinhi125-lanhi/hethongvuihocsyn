import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserAccount, SystemRoleGroup } from '../types';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Lock,
  Unlock,
  CheckCircle,
  PlusCircle,
  Sliders,
  X
} from 'lucide-react';

export const Module1_UsersRoles: React.FC = () => {
  const { users, roleGroups, setRoleGroups, addUser, updateUser, toggleLockUser, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Password visibility tracking per row
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRoleGroup | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Create User Form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPass, setNewUserPass] = useState('Vuihoc@2026');
  const [newUserPassVisible, setNewUserPassVisible] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserAccount['role']>('Nhân viên Vận hành Lớp');
  const [newUserSubject, setNewUserSubject] = useState<'SUB-MATH' | 'SUB-ENG'>('SUB-MATH');

  // Edit User Form state
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPass, setEditUserPass] = useState('');
  const [editUserPassVisible, setEditUserPassVisible] = useState(false);
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserAccount['role']>('Nhân viên Vận hành Lớp');
  const [editUserSubject, setEditUserSubject] = useState<'SUB-MATH' | 'SUB-ENG'>('SUB-MATH');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép ${label}: "${text}"`, 'success');
    });
  };

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.username.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.email.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.phone.includes(searchKeyword);
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) {
      showToast('Vui lòng điền họ tên và tên đăng nhập!', 'error');
      return;
    }

    const avatarInitials = newUserName
      .split(' ')
      .slice(-2)
      .map(p => p[0])
      .join('')
      .toUpperCase();

    addUser({
      name: newUserName.trim(),
      username: newUserUsername.trim(),
      passwordRaw: newUserPass,
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      subject: newUserRole === 'Giáo viên Giảng dạy' ? newUserSubject : undefined,
      status: 'active',
      avatarInitials: avatarInitials || 'VH'
    });

    setIsCreateUserModalOpen(false);
    // Reset form
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPass('Vuihoc@2026');
    setNewUserEmail('');
    setNewUserPhone('');
  };

  const openEditUser = (user: UserAccount) => {
    if (user.role === 'Giáo viên Giảng dạy') {
      showToast('Tài khoản giáo viên được hệ thống phân quyền sẵn, không cho phép chỉnh sửa trực tiếp!', 'error');
      return;
    }
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserUsername(user.username);
    setEditUserPass(user.passwordRaw);
    setEditUserPassVisible(false);
    setEditUserEmail(user.email);
    setEditUserPhone(user.phone);
    setEditUserRole(user.role);
    setEditUserSubject(user.subject || 'SUB-MATH');
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUser(editingUser.id, {
      name: editUserName.trim(),
      username: editUserUsername.trim(),
      passwordRaw: editUserPass,
      email: editUserEmail.trim(),
      phone: editUserPhone.trim(),
      role: editUserRole,
      subject: editUserRole === 'Giáo viên Giảng dạy' ? editUserSubject : undefined
    });

    setEditingUser(null);
  };

  // Role group actions
  const systemFeaturesList = [
    { mod: 'Quản trị Hệ thống & Phân quyền', feats: ['Cấp tài khoản & Mật khẩu người dùng', 'Khóa / Mở khóa tài khoản nhân sự', 'Chỉnh sửa thông tin tài khoản & Mật khẩu', 'Tạo, sửa, xóa & Gán Nhóm quyền'] },
    { mod: 'Danh mục dùng chung', feats: ['Cấu hình Môn học (Toán, Tiếng Anh) & Khối lớp', 'Cấu hình Gói thời hạn (3, 6, 9, 12 tháng) tính ngày', 'Cấu hình Mô hình lớp & Sĩ số trần (1-1, 1-3, 1-5)', 'Cấu hình Khung giờ ca dạy chuẩn (Time Slot)', 'Cấu hình Danh mục Sự cố & Vi phạm ca học'] },
    { mod: 'Quản lý Giáo viên & Đánh giá Dự giờ', feats: ['Tạo hồ sơ giáo viên (Gán 1 môn Toán/Anh)', 'Giáo viên đăng ký lịch rảnh theo tuần', 'Xem tổng hợp lịch rảnh & Khóa sổ đăng ký tuần', 'Thực hiện chấm điểm dự giờ sư phạm (3 tiêu chí)', 'Xuất danh sách hồ sơ giáo viên ra file Excel'] },
    { mod: 'Học sinh & Điều phối Lớp học', feats: ['Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy', 'Khởi tạo lớp, gán gói thời hạn tự tính ngày kết thúc', 'Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)', 'Phân công giáo viên (Khớp nối môn và lịch rảnh)', 'Nạp học liệu: Thêm theo tuần & Excel mẫu'] },
    { mod: 'Giám sát Ca dạy & Dạy thay (Cover)', feats: ['Theo dõi thời khóa biểu toàn hệ thống (Calendar)', 'Giáo viên Check-in / Check-out vào ca dạy', 'Báo cáo sự cố ca dạy (đi muộn, lỗi mạng, nghỉ)', 'Quét giáo viên rảnh cùng môn để dạy thay (Cover)'] },
    { mod: 'Trợ lý Trí tuệ nhân tạo (AI Studio)', feats: ['Cấu hình Prompt văn phong & Tiêu chí nhận xét môn', 'Quản lý kho tài liệu tri thức SOP', 'Sử dụng AI sinh & tinh chỉnh nhận xét học sinh', 'Chatbot AI 24/7 tra cứu quy chế & nghiệp vụ'] },
    { mod: 'Quản lý Chốt công & Đối soát', feats: ['Xem bảng kê công dạy cá nhân theo kỳ', 'Gửi giải trình / khiếu nại sai lệch ca dạy', 'Tổng hợp công dạy toàn bộ giáo viên theo kỳ', 'Xử lý & phê duyệt đơn giải trình công dạy', 'Khóa sổ Chốt công & Xuất file Excel bàn giao'] },
    { mod: 'Trung tâm Báo cáo & Thống kê', feats: ['Xem Dashboard chỉ số KPI & Biểu đồ tổng quan', 'Xem Báo cáo giáo viên, lớp học & hạn lớp theo gói', 'Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn', 'Công cụ tạo báo cáo tùy biến (Dynamic Report)', 'Xuất báo cáo tổng hợp ra tệp Excel và PDF'] }
  ];

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleFormName('');
    setRoleFormDesc('');
    setSelectedPermissions([]);
    setIsRoleModalOpen(true);
  };

  const openEditRole = (role: SystemRoleGroup) => {
    setEditingRole(role);
    setRoleFormName(role.name);
    setRoleFormDesc(role.desc);
    setSelectedPermissions(role.permissions || []);
    setIsRoleModalOpen(true);
  };

  const togglePermission = (feat: string) => {
    setSelectedPermissions(prev =>
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    );
  };

  const setAllPermissions = (select: boolean) => {
    if (select) {
      const all: string[] = [];
      systemFeaturesList.forEach(m => all.push(...m.feats));
      setSelectedPermissions(all);
    } else {
      setSelectedPermissions([]);
    }
  };

  const handleSaveRole = () => {
    if (!roleFormName.trim()) {
      showToast('Vui lòng nhập tên Nhóm quyền!', 'error');
      return;
    }

    if (editingRole) {
      setRoleGroups(prev =>
        prev.map(r =>
          r.id === editingRole.id
            ? { ...r, name: roleFormName.trim(), desc: roleFormDesc.trim(), permissions: selectedPermissions }
            : r
        )
      );
      showToast(`Đã lưu cấu hình Nhóm quyền "${roleFormName}"!`, 'success');
    } else {
      const newRole: SystemRoleGroup = {
        id: `ROLE-${String(roleGroups.length + 1).padStart(2, '0')}`,
        name: roleFormName.trim(),
        category: 'HỆ THỐNG',
        desc: roleFormDesc.trim() || 'Nhóm quyền mới tạo',
        userCount: 0,
        permissions: selectedPermissions
      };
      setRoleGroups(prev => [...prev, newRole]);
      showToast(`Đã thêm Nhóm quyền mới "${roleFormName}"!`, 'success');
    }
    setIsRoleModalOpen(false);
  };

  const handleDeleteRole = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn XÓA nhóm quyền "${name}" khỏi hệ thống?`)) {
      setRoleGroups(prev => prev.filter(r => r.id !== id));
      showToast(`Đã xóa nhóm quyền "${name}"!`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header thanh chuyển đổi Tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Quản lý Tài khoản &amp; Nhóm quyền Hệ thống</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tạo nhóm quyền, chỉnh sửa/xóa quyền và quản lý tài khoản, thông tin đăng nhập tập trung
          </p>
        </div>

        {/* 2 Tab Chuyển đổi */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-white text-[#FF5C00] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh sách Tài khoản</span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'bg-white text-[#FF5C00] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Thiết lập Nhóm quyền</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: DANH SÁCH TÀI KHOẢN ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Bộ lọc & Thao tác */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder="Tìm tên, tên đăng nhập, email..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-[#FF5C00]"
              >
                <option value="">Tất cả Nhóm quyền</option>
                <option value="Quản trị Toàn quyền">Quản trị Toàn quyền</option>
                <option value="Quản lý Chuyên môn">Quản lý Chuyên môn</option>
                <option value="Nhân viên Vận hành Lớp">Nhân viên Vận hành Lớp</option>
                <option value="Giáo viên Giảng dạy">Giáo viên Giảng dạy</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-[#FF5C00]"
              >
                <option value="">Tất cả Trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã tạm khóa</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cấp Tài khoản Mới</span>
            </button>
          </div>

          {/* Bảng danh sách User có Xem/Copy Username & Password */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Nhân sự</th>
                    <th className="py-3.5 px-4">Tên đăng nhập</th>
                    <th className="py-3.5 px-4">Mật khẩu (Xem / Copy)</th>
                    <th className="py-3.5 px-4">Liên hệ</th>
                    <th className="py-3.5 px-4">Nhóm quyền</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không tìm thấy tài khoản người dùng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const isRevealed = !!revealedPasswords[u.id];

                      let roleBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (u.role === 'Quản trị Toàn quyền') roleBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                      if (u.role === 'Quản lý Chuyên môn') roleBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      if (u.role === 'Nhân viên Vận hành Lớp') roleBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                      if (u.role === 'Giáo viên Giảng dạy') roleBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{u.name}</div>
                            <div className="text-[11px] text-slate-400">ID: {u.id}</div>
                            {u.subject && (
                              <div className="text-[10px] text-orange-600 font-semibold">
                                {u.subject === 'SUB-MATH' ? 'Môn: Toán' : 'Môn: Tiếng Anh'}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                              <span>{u.username}</span>
                              <button
                                onClick={() => copyToClipboard(u.username, 'Tên đăng nhập')}
                                className="text-slate-400 hover:text-[#FF5C00]"
                                title="Sao chép tên đăng nhập"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono bg-slate-100 px-2 py-1 rounded w-fit">
                              <span className={isRevealed ? '' : 'tracking-widest'}>
                                {isRevealed ? u.passwordRaw : '••••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="text-slate-400 hover:text-slate-700"
                                title="Ẩn/Hiện mật khẩu"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(u.passwordRaw, 'Mật khẩu')}
                                className="text-slate-400 hover:text-[#FF5C00]"
                                title="Sao chép mật khẩu"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{u.email}</div>
                            <div className="text-[11px] text-slate-400">{u.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded border font-medium text-[11px] ${roleBadgeColor}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đang hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Đã tạm khóa
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {u.id === 'USR-01' ? (
                              <span className="text-slate-400 italic text-[11px]">Tài khoản Gốc</span>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openEditUser(u)}
                                  className="text-slate-600 hover:text-[#FF5C00] p-1 rounded hover:bg-slate-100"
                                  title="Chỉnh sửa tài khoản"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleLockUser(u.id)}
                                  className={`p-1 rounded hover:bg-slate-100 ${
                                    u.status === 'active' ? 'text-slate-400 hover:text-rose-600' : 'text-rose-500 hover:text-emerald-600'
                                  }`}
                                  title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                >
                                  {u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: THIẾT LẬP NHÓM QUYỀN ================= */}
      {activeTab === 'roles' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Danh sách các Nhóm quyền</h2>
              <p className="text-xs text-slate-500">Bấm chỉnh sửa để tick chọn lại chức năng hoặc bấm xóa nhóm quyền</p>
            </div>
            <button
              onClick={openCreateRole}
              className="px-3.5 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 font-bold" />
              <span>Thêm Nhóm quyền Mới</span>
            </button>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleGroups.map(role => {
              let tagColor = 'bg-slate-100 text-slate-700';
              if (role.category === 'HỆ THỐNG') tagColor = 'bg-purple-100 text-purple-700';
              if (role.category === 'CHUYÊN MÔN') tagColor = 'bg-amber-100 text-amber-700';
              if (role.category === 'VẬN HÀNH') tagColor = 'bg-blue-100 text-blue-700';
              if (role.category === 'GIẢNG DẠY') tagColor = 'bg-emerald-100 text-emerald-700';

              return (
                <div
                  key={role.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tagColor}`}>
                        {role.category}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{role.userCount} nhân sự</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 mt-2">{role.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{role.desc}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{role.permissions?.length ? `${role.permissions.length} chức năng phân quyền` : 'Toàn quyền chức năng'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {role.isDefault ? (
                      <span className="text-slate-400 italic text-[11px] ml-auto">Nhóm quyền mặc định</span>
                    ) : (
                      <>
                        <button
                          onClick={() => openEditRole(role)}
                          className="text-[#FF5C00] font-semibold hover:underline"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id, role.name)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODAL CẤP MỚI TÀI KHOẢN ================= */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">Cấp Tài khoản Người dùng Mới</h3>
                <p className="text-xs text-slate-400">Thiết lập thông tin đăng nhập và gán nhóm quyền tương ứng</p>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên nhân sự <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={e => setNewUserUsername(e.target.value)}
                    placeholder="an.nguyen"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={newUserPassVisible ? 'text' : 'password'}
                      required
                      value={newUserPass}
                      onChange={e => setNewUserPass(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5 text-slate-400">
                      <button
                        type="button"
                        onClick={() => setNewUserPassVisible(!newUserPassVisible)}
                        className="hover:text-slate-700"
                        title="Ẩn/Hiện mật khẩu"
                      >
                        {newUserPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newUserPass, 'Mật khẩu')}
                        className="hover:text-[#FF5C00]"
                        title="Sao chép"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="an.nguyen@vuihoc.vn"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="0912.xxx.xxx"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gán Nhóm quyền áp dụng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserAccount['role'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                >
                  <option value="Quản trị Toàn quyền">Quản trị Toàn quyền</option>
                  <option value="Quản lý Chuyên môn">Quản lý Chuyên môn</option>
                  <option value="Nhân viên Vận hành Lớp">Nhân viên Vận hành Lớp</option>
                  <option value="Giáo viên Giảng dạy">Giáo viên Giảng dạy</option>
                </select>
              </div>

              {newUserRole === 'Giáo viên Giảng dạy' && (
                <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-100">
                  <label className="block font-semibold text-[#FF5C00] mb-1">
                    Môn chuyên trách cố định (Dành cho Giáo viên) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-6 mt-1.5">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="new_subject"
                        value="SUB-MATH"
                        checked={newUserSubject === 'SUB-MATH'}
                        onChange={() => setNewUserSubject('SUB-MATH')}
                        className="accent-[#FF5C00]"
                      />
                      <span>Môn Toán</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="new_subject"
                        value="SUB-ENG"
                        checked={newUserSubject === 'SUB-ENG'}
                        onChange={() => setNewUserSubject('SUB-ENG')}
                        className="accent-[#FF5C00]"
                      />
                      <span>Môn Tiếng Anh</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold shadow-xs cursor-pointer"
                >
                  Xác nhận cấp tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CHỈNH SỬA TÀI KHOẢN ================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">Chỉnh sửa Thông tin Tài khoản</h3>
                <p className="text-xs text-slate-400">Xem, sao chép hoặc thay đổi thông tin định danh và quyền hạn</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên nhân sự <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={e => setEditUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên đăng nhập (Username) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={editUserUsername}
                      onChange={e => setEditUserUsername(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editUserUsername, 'Tên đăng nhập')}
                      className="absolute right-2.5 text-slate-400 hover:text-[#FF5C00]"
                      title="Sao chép"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mật khẩu tài khoản <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={editUserPassVisible ? 'text' : 'password'}
                      required
                      value={editUserPass}
                      onChange={e => setEditUserPass(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5 text-slate-400">
                      <button
                        type="button"
                        onClick={() => setEditUserPassVisible(!editUserPassVisible)}
                        className="hover:text-slate-700"
                        title="Ẩn/Hiện mật khẩu"
                      >
                        {editUserPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editUserPass, 'Mật khẩu')}
                        className="hover:text-[#FF5C00]"
                        title="Sao chép"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editUserEmail}
                    onChange={e => setEditUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editUserPhone}
                    onChange={e => setEditUserPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gán Nhóm quyền áp dụng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editUserRole}
                  onChange={e => setEditUserRole(e.target.value as UserAccount['role'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                >
                  <option value="Quản trị Toàn quyền">Quản trị Toàn quyền</option>
                  <option value="Quản lý Chuyên môn">Quản lý Chuyên môn</option>
                  <option value="Nhân viên Vận hành Lớp">Nhân viên Vận hành Lớp</option>
                  <option value="Giáo viên Giảng dạy">Giáo viên Giảng dạy</option>
                </select>
              </div>

              {editUserRole === 'Giáo viên Giảng dạy' && (
                <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-100">
                  <label className="block font-semibold text-[#FF5C00] mb-1">
                    Môn chuyên trách cố định (Dành cho Giáo viên) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-6 mt-1.5">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="edit_subject"
                        value="SUB-MATH"
                        checked={editUserSubject === 'SUB-MATH'}
                        onChange={() => setEditUserSubject('SUB-MATH')}
                        className="accent-[#FF5C00]"
                      />
                      <span>Môn Toán</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="edit_subject"
                        value="SUB-ENG"
                        checked={editUserSubject === 'SUB-ENG'}
                        onChange={() => setEditUserSubject('SUB-ENG')}
                        className="accent-[#FF5C00]"
                      />
                      <span>Môn Tiếng Anh</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold shadow-xs cursor-pointer"
                >
                  Lưu Thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CẤU HÌNH NHÓM QUYỀN 8 PHÂN HỆ ================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  {editingRole ? `Chỉnh sửa Nhóm quyền: ${editingRole.name}` : 'Tạo Nhóm quyền Mới & Chọn Tính năng'}
                </h3>
                <p className="text-xs text-slate-400">Tick chọn trực tiếp các tính năng được phép truy cập trên các nhóm chức năng hệ thống</p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 text-xs pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên Nhóm quyền <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleFormName}
                    onChange={e => setRoleFormName(e.target.value)}
                    placeholder="Ví dụ: Giám sát Trực ca Lớp học"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00] font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mô tả ngắn gọn</label>
                  <input
                    type="text"
                    value={roleFormDesc}
                    onChange={e => setRoleFormDesc(e.target.value)}
                    placeholder="Tóm tắt phạm vi quyền hạn..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between font-bold text-slate-800 mb-2">
                  <span>Danh mục Tính năng Toàn hệ thống:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAllPermissions(true)}
                      className="text-[#FF5C00] hover:underline text-[11px] cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setAllPermissions(false)}
                      className="text-slate-500 hover:underline text-[11px] cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {systemFeaturesList.map((modGroup, gIdx) => (
                    <div key={gIdx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <div className="font-semibold text-slate-800 mb-1.5 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#FF5C00]" />
                        <span>{modGroup.mod}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 pl-5">
                        {modGroup.feats.map((feat, fIdx) => (
                          <label key={fIdx} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(feat)}
                              onChange={() => togglePermission(feat)}
                              className="accent-[#FF5C00]"
                            />
                            <span>{feat}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold shadow-xs cursor-pointer"
              >
                Lưu Nhóm quyền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
