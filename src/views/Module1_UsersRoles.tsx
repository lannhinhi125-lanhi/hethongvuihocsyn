import { SavedPasswordCell } from '../components/SavedPasswordCell';
import { PasswordRevealButton } from '../components/PasswordRevealButton';
import { PaginatedList } from '../components/Pagination';
import { PaginatedTableBody } from '../components/Pagination';
import { usePermissions } from '../hooks/usePermissions';
import { assignedRole, accountPortal } from '../lib/accessControl';
import { permissionModules, portalLabels, rolePortal, expandPermissions, serializePermissions, type AccountPortal } from '../lib/portalPermissions';
import { TEACHER_PROFILE_PERMISSION } from '../lib/teacherAccounts';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserAccount, SystemRoleGroup } from '../types';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Copy,
  Pencil,
  Lock,
  Unlock,
  CheckCircle,
  PlusCircle,
  Sliders,
  X
} from 'lucide-react';

export const Module1_UsersRoles: React.FC = () => {
  const { can, requirePermission } = usePermissions();
  const { users, roleGroups, setRoleGroups, addUser, updateUser, toggleLockUser, showToast } = useApp();

  const [portal, setPortal] = useState<AccountPortal>('ADMIN');
  const [roleFormPortal, setRoleFormPortal] = useState<AccountPortal>('ADMIN');
  const portalUsers = users.filter(user => accountPortal(user, roleGroups) === portal);
  const portalRoles = roleGroups.filter(role => rolePortal(role) === portal);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');


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
  const [newUserSubject, setNewUserSubject] = useState<string>('SUB-MATH');

  // Edit User Form state
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPass, setEditUserPass] = useState('');
  const [editUserPassVisible, setEditUserPassVisible] = useState(false);
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserAccount['role']>('Nhân viên Vận hành Lớp');
  const [editUserSubject, setEditUserSubject] = useState<string>('SUB-MATH');

  const copyToClipboard = (text: string, label: string) => {
    if (label.toLocaleLowerCase('vi').includes('mật khẩu') && !requirePermission('Chỉnh sửa thông tin tài khoản & Mật khẩu')) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép ${label}.`, 'success');
    });
  };

  // Filter users
  const filteredUsers = portalUsers.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.username.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.email.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.phone.includes(searchKeyword);
    const matchRole = !filterRole || assignedRole(u, roleGroups)?.name === filterRole;
    const matchStatus = !filterStatus || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    if (!requirePermission("Cấp tài khoản & Mật khẩu người dùng")) return;
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
      role: (['Quản trị Toàn quyền', 'Quản lý Chuyên môn', 'Nhân viên Vận hành Lớp', 'Giáo viên Giảng dạy'].includes(newUserRole) ? newUserRole : portal === 'TEACHER' ? 'Giáo viên Giảng dạy' : 'Nhân viên Vận hành Lớp'),
      roleGroupId: roleGroups.find(group => group.name === newUserRole)?.id,
      subject: portal === 'TEACHER' ? newUserSubject : undefined,
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
    if (!requirePermission('Chỉnh sửa thông tin tài khoản & Mật khẩu')) return;
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserUsername(user.username);
    setEditUserPass(user.passwordRaw);
    setEditUserPassVisible(false);
    setEditUserEmail(user.email);
    setEditUserPhone(user.phone);
    setEditUserRole((assignedRole(user, roleGroups)?.name || user.role) as UserAccount['role']);
    setEditUserSubject(user.subject || 'SUB-MATH');
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    if (!requirePermission("Chỉnh sửa thông tin tài khoản & Mật khẩu")) return;
    e.preventDefault();
    if (!editingUser) return;

    const roleChanged = assignedRole(editingUser, roleGroups)?.name !== editUserRole;
    if (roleChanged && !requirePermission('Tạo, sửa, xóa & Gán Nhóm quyền')) return;
    updateUser(editingUser.id, {
      name: editUserName.trim(),
      username: editUserUsername.trim(),
      passwordRaw: editUserPass,
      email: editUserEmail.trim(),
      phone: editUserPhone.trim(),
      ...(roleChanged ? {
        role: (['Quản trị Toàn quyền', 'Quản lý Chuyên môn', 'Nhân viên Vận hành Lớp', 'Giáo viên Giảng dạy'].includes(editUserRole) ? editUserRole : portal === 'TEACHER' ? 'Giáo viên Giảng dạy' : 'Nhân viên Vận hành Lớp'),
      roleGroupId: roleGroups.find(group => group.name === editUserRole)?.id,
      } : {}),
      subject: portal === 'TEACHER' ? editUserSubject : undefined
    });

    setEditingUser(null);
  };

  // Role group actions
  const systemFeaturesList = permissionModules[roleFormPortal].map(module => ({ mod: module.name, feats: module.features }));

  const openCreateRole = () => {
    if (!requirePermission("Tạo, sửa, xóa & Gán Nhóm quyền")) return;
    setEditingRole(null);
    setRoleFormPortal(portal);
    setRoleFormName('');
    setRoleFormDesc('');
    setSelectedPermissions([]);
    setIsRoleModalOpen(true);
  };

  const openEditRole = (role: SystemRoleGroup) => {
    setEditingRole(role);
    setRoleFormPortal(rolePortal(role));
    setRoleFormName(role.name);
    setRoleFormDesc(role.desc);
    setSelectedPermissions(expandPermissions(role.permissions || [], rolePortal(role)));
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
    if (!requirePermission("Tạo, sửa, xóa & Gán Nhóm quyền")) return;
    if (editingRole?.isDefault) return;
    if (!roleFormName.trim()) {
      showToast('Vui lòng nhập tên Nhóm quyền!', 'error');
      return;
    }

    if (roleGroups.some(role => role.id !== editingRole?.id && role.name.toLocaleLowerCase('vi') === roleFormName.trim().toLocaleLowerCase('vi'))) {
      showToast('Tên nhóm quyền đã tồn tại.', 'error'); return;
    }
    if (editingRole && users.some(user => assignedRole(user, roleGroups)?.id === editingRole.id) && editingRole.name !== roleFormName.trim()) {
      showToast('Nhóm đang được gán tài khoản. Giữ nguyên tên để bảo toàn liên kết.', 'warning'); return;
    }
    const unchanged = editingRole && JSON.stringify([...expandPermissions(editingRole.permissions, roleFormPortal)].sort()) === JSON.stringify([...selectedPermissions].sort());
    const permissions = unchanged ? editingRole.permissions : serializePermissions(selectedPermissions, roleFormPortal);
    if (editingRole) {
      setRoleGroups(prev =>
        prev.map(r =>
          r.id === editingRole.id
            ? { ...r, name: roleFormName.trim(), desc: roleFormDesc.trim(), portal: roleFormPortal, permissions }
            : r
        )
      );
      showToast(`Đang lưu cấu hình Nhóm quyền "${roleFormName}"!`, 'success');
    } else {
      const newRole: SystemRoleGroup = {
        id: 'ROLE-' + crypto.randomUUID(),
        name: roleFormName.trim(),
        category: roleFormPortal === 'TEACHER' ? 'GIẢNG DẠY' : 'HỆ THỐNG',
        portal: roleFormPortal,
        desc: roleFormDesc.trim() || 'Nhóm quyền mới tạo',
        userCount: 0,
        permissions
      };
      setRoleGroups(prev => [...prev, newRole]);
      showToast(`Đang lưu Nhóm quyền mới "${roleFormName}"!`, 'success');
    }
    setIsRoleModalOpen(false);
  };

  const handleDeleteRole = (id: string, name: string) => {
    if (!requirePermission("Tạo, sửa, xóa & Gán Nhóm quyền")) return;
    if (users.some(user => assignedRole(user, roleGroups)?.id === id)) { showToast('Nhóm quyền đang có tài khoản sử dụng, không thể xóa.', 'warning'); return; }
    if (window.confirm(`Bạn có chắc chắn muốn XÓA nhóm quyền "${name}" khỏi hệ thống?`)) {
      setRoleGroups(prev => prev.filter(r => r.id !== id));
      showToast(`Đã xóa nhóm quyền "${name}"!`, 'info');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {(['ADMIN', 'TEACHER'] as const).map(value => <button type="button" key={value} aria-pressed={portal === value} onClick={() => {
          setPortal(value); setFilterRole(''); setFilterStatus(''); setSearchKeyword('');
        }} className={'rounded-xl border p-3 text-left transition-colors ' + (portal === value ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
          <span className={'block text-sm font-bold ' + (portal === value ? 'text-orange-700' : 'text-slate-700')}>{portalLabels[value]}</span>
          <span className="mt-1 block text-[11px] text-slate-500">{users.filter(user => accountPortal(user, roleGroups) === value).length} tài khoản · {roleGroups.filter(role => rolePortal(role) === value).length} nhóm quyền · {permissionModules[value].length} phân hệ</span>
        </button>)}
      </div>
      {/* Header thanh chuyển đổi Tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Tài khoản &amp; Nhóm quyền — {portalLabels[portal]}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {portal === 'ADMIN' ? 'Quản lý tài khoản nhân sự và tiêu chí quyền trong các phân hệ quản trị.' : 'Quản lý tài khoản giảng dạy và quyền thao tác trên dữ liệu cá nhân, lớp được phân công.'}
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
                {portalRoles.map(group => <option key={group.id} value={group.name}>{group.name}</option>)}
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
              disabled={!can('Cấp tài khoản & Mật khẩu người dùng') || !can('Tạo, sửa, xóa & Gán Nhóm quyền')}
              onClick={() => { setNewUserRole(portal === 'TEACHER' ? 'Giáo viên Giảng dạy' : 'Nhân viên Vận hành Lớp'); setIsCreateUserModalOpen(true); }}
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
                <PaginatedTableBody className="divide-y divide-slate-100 font-normal">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không tìm thấy tài khoản người dùng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {

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
                            <SavedPasswordCell userId={u.id} pendingPassword={u.passwordRaw}
                              canReveal={can('Xem danh sách tài khoản và nhóm quyền') && can('Chỉnh sửa thông tin tài khoản & Mật khẩu')}
                              onError={message => showToast(message, 'error')} />
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{u.email}</div>
                            <div className="text-[11px] text-slate-400">{u.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded border font-medium text-[11px] ${roleBadgeColor}`}>
                              {assignedRole(u, roleGroups)?.name || u.role}
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
                                  disabled={!can('Chỉnh sửa thông tin tài khoản & Mật khẩu')}
                                  onClick={() => openEditUser(u)}
                                  className="text-slate-600 hover:text-[#FF5C00] p-1 rounded hover:bg-slate-100"
                                  title="Chỉnh sửa tài khoản"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={!can('Khóa / Mở khóa tài khoản nhân sự')}
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
                </PaginatedTableBody>
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
              <h2 className="text-sm font-bold text-slate-800">Nhóm quyền — {portalLabels[portal]}</h2>
              <p className="text-xs text-slate-500">Chọn nhóm quyền để cấu hình tiêu chí theo từng phân hệ của cổng này.</p>
            </div>
            <button
              disabled={!can('Tạo, sửa, xóa & Gán Nhóm quyền')}
              onClick={openCreateRole}
              className="px-3.5 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 font-bold" />
              <span>Thêm Nhóm quyền Mới</span>
            </button>
          </div>

          {/* Role Cards Grid */}
          <PaginatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portalRoles.map(role => {
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
                      <span className="text-xs font-bold text-slate-400">{users.filter(user => assignedRole(user, roleGroups)?.id === role.id).length} tài khoản</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 mt-2">{role.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{role.desc}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{role.permissions?.includes('ALL') ? 'Toàn quyền quản trị' : `${expandPermissions(role.permissions || [], rolePortal(role)).length} tiêu chí được chọn`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {role.isDefault ? (
                      <><button type="button" onClick={() => openEditRole(role)} className="font-semibold text-orange-700 hover:underline">Xem quyền</button><span className="text-slate-400 italic text-[11px]">Nhóm mặc định</span></>
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
          </PaginatedList>
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
                      <PasswordRevealButton visible={newUserPassVisible} onVisibleChange={setNewUserPassVisible} className="hover:text-slate-700" />
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
                  {portalRoles.map(group => <option key={group.id} value={group.name}>{group.name}</option>)}
                </select>
              </div>

              {portal === 'TEACHER' && (
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
                      placeholder="Để trống để giữ mật khẩu hiện tại"
                      minLength={8}
                      value={editUserPass}
                      onChange={e => setEditUserPass(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5 text-slate-400">
                      <PasswordRevealButton visible={editUserPassVisible} onVisibleChange={setEditUserPassVisible} className="hover:text-slate-700" />
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
                  disabled={!can('Tạo, sửa, xóa & Gán Nhóm quyền')}
                  value={editUserRole}
                  onChange={e => setEditUserRole(e.target.value as UserAccount['role'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                >
                  {portalRoles.map(group => <option key={group.id} value={group.name}>{group.name}</option>)}
                </select>
              </div>

              {portal === 'TEACHER' && (
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
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 h-[min(92dvh,860px)] min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  {editingRole ? `Chỉnh sửa Nhóm quyền: ${editingRole.name}` : 'Tạo Nhóm quyền Mới & Chọn Tính năng'}
                </h3>
                <p className="text-xs text-slate-400">{portalLabels[roleFormPortal]} · Chọn tiêu chí riêng cho từng phân hệ.</p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-2 [scrollbar-gutter:stable]"><fieldset disabled={Boolean(editingRole?.isDefault) || !can('Tạo, sửa, xóa & Gán Nhóm quyền')} className="min-w-0 space-y-4 text-xs disabled:opacity-70">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên Nhóm quyền <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly={Boolean(editingRole && users.some(user => user.role === editingRole.name))}
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
                  <span>Phân hệ trong {portalLabels[roleFormPortal]} · {selectedPermissions.length} tiêu chí đã chọn</span>
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
                    <details key={gIdx} className="border border-slate-200 rounded-xl bg-white">
                      <summary className="cursor-pointer rounded-xl bg-slate-50 px-3 py-2.5 font-semibold text-slate-800">
                        {modGroup.mod}<span className="ml-2 text-[10px] font-normal text-slate-400">{modGroup.feats.filter(feat => selectedPermissions.includes(feat)).length}/{modGroup.feats.length} tiêu chí</span>
                      </summary>
                      <div className="flex items-center gap-3 border-t border-slate-100 px-3 pt-3 text-[11px]">
                        <button type="button" className="font-semibold text-orange-700" onClick={() => setSelectedPermissions(previous => [...new Set([...previous, ...modGroup.feats])])}>Chọn cả phân hệ</button>
                        <button type="button" className="text-slate-500" onClick={() => setSelectedPermissions(previous => previous.filter(feat => !modGroup.feats.includes(feat)))}>Bỏ chọn phân hệ</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 p-3">
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
                    </details>
                  ))}
                </div>
              </div>
            </fieldset></div>

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
                disabled={Boolean(editingRole?.isDefault) || !can('Tạo, sửa, xóa & Gán Nhóm quyền')}
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
