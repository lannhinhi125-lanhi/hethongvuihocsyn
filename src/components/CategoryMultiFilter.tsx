import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, Filter, Layers, CheckSquare, Square } from 'lucide-react';

export interface CategoryOption {
  id: string;
  label: string;
  count?: number;
}

export interface CategoryGroup {
  status?: boolean;
  id: string;
  name: string;
  badge?: string;
  options: CategoryOption[];
}

export const DEFAULT_TEACHER_CATEGORIES: CategoryGroup[] = [
  {
    id: 'CAP-TH',
    name: 'Tiểu học',
    badge: 'Khối 1 - 5',
    options: [
      { id: 'Lớp 1', label: 'Lớp 1' },
      { id: 'Lớp 2', label: 'Lớp 2' },
      { id: 'Lớp 3', label: 'Lớp 3' },
      { id: 'Lớp 4', label: 'Lớp 4' },
      { id: 'Lớp 5', label: 'Lớp 5' },
      { id: 'Toán Tiểu học', label: 'Toán Tiểu học' },
      { id: 'Tiếng Anh Tiểu học', label: 'Tiếng Anh Tiểu học' }
    ]
  },
  {
    id: 'CAP-THCS',
    name: 'THCS',
    badge: 'Khối 6 - 9',
    options: [
      { id: 'Lớp 6', label: 'Lớp 6' },
      { id: 'Lớp 7', label: 'Lớp 7' },
      { id: 'Lớp 8', label: 'Lớp 8' },
      { id: 'Lớp 9', label: 'Lớp 9' },
      { id: 'Toán Chuyên THCS', label: 'Toán Chuyên THCS' },
      { id: 'Tiếng Anh THCS', label: 'Tiếng Anh THCS' }
    ]
  },
  {
    id: 'CAP-THPT',
    name: 'THPT',
    badge: 'Khối 10 - 12',
    options: [
      { id: 'Lớp 10', label: 'Lớp 10' },
      { id: 'Lớp 11', label: 'Lớp 11' },
      { id: 'Lớp 12', label: 'Lớp 12' },
      { id: 'Luyện thi ĐH (Toán)', label: 'Luyện thi ĐH (Toán)' },
      { id: 'Luyện thi ĐH (Tiếng Anh)', label: 'Luyện thi ĐH (Tiếng Anh)' }
    ]
  },
  {
    id: 'CAT-IELTS',
    name: 'IELTS & Quốc tế',
    badge: 'Band 5.0 - 8.5',
    options: [
      { id: 'IELTS 5.0 - 5.5', label: 'IELTS Pre-Inter (5.0 - 5.5)' },
      { id: 'IELTS 6.0 - 6.5', label: 'IELTS Inter (6.0 - 6.5)' },
      { id: 'IELTS 6.5 - 7.5', label: 'IELTS Upper (6.5 - 7.5)' },
      { id: 'IELTS 8.0+', label: 'IELTS Master (8.0+)' },
      { id: 'Cambridge KET/PET', label: 'Cambridge KET / PET' },
      { id: 'Cambridge Flyers', label: 'Cambridge Flyers' }
    ]
  },
  {
    id: 'CAT-MATH-SPEC',
    name: 'Toán Tư Duy & Nâng Cao',
    badge: 'Olympic & 1-1',
    options: [
      { id: 'Toán Tư duy Singapore', label: 'Toán Tư duy Singapore' },
      { id: 'Toán Soroban', label: 'Toán Soroban & Tính nhanh' },
      { id: 'Luyện thi Violympic', label: 'Luyện thi Violympic / Kangaroo' },
      { id: 'Toán Nâng cao 1-3', label: 'Toán Nâng cao Nhóm nhỏ (1-3)' },
      { id: 'Toán 1 kèm 1', label: 'Toán Ôn tập Nền tảng 1 kèm 1' }
    ]
  }
];

interface CategoryMultiFilterProps {
  categories?: CategoryGroup[];
  selectedCategory: string; // 'ALL' or category id
  onSelectCategory: (catId: string) => void;
  selectedSubOptions: string[]; // array of option ids
  onToggleSubOption: (optId: string) => void;
  onSelectAllSubOptions: (optIds: string[]) => void;
  onClearSubOptions: () => void;
  mode?: 'inline' | 'drawer';
}

export const CategoryMultiFilter: React.FC<CategoryMultiFilterProps> = ({
  categories = DEFAULT_TEACHER_CATEGORIES,
  selectedCategory,
  onSelectCategory,
  selectedSubOptions,
  onToggleSubOption,
  onSelectAllSubOptions,
  onClearSubOptions,
  mode = 'inline'
}) => {
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [searchSubText, setSearchSubText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCategoryGroup = categories.find(c => c.id === selectedCategory);

  const filteredOptions = currentCategoryGroup
    ? currentCategoryGroup.options.filter(o =>
        o.label.toLowerCase().includes(searchSubText.toLowerCase())
      )
    : [];

  const handleSelectCategoryClick = (catId: string) => {
    onSelectCategory(catId);
    if (catId === 'ALL') {
      setIsOpenDropdown(false);
    } else {
      setIsOpenDropdown(true);
      setSearchSubText('');
    }
  };

  const handleCheckAllCurrent = () => {
    if (!currentCategoryGroup) return;
    const allIds = currentCategoryGroup.options.map(o => o.id);
    onSelectAllSubOptions(allIds);
  };

  // Selected count for current category
  const selectedInCurrentCategory = currentCategoryGroup
    ? currentCategoryGroup.options.filter(o => selectedSubOptions.includes(o.id)).length
    : 0;

  if (mode === 'drawer') {
    return (
      <div className="space-y-3 text-xs" ref={dropdownRef}>
        <label className="block font-bold text-slate-700">Danh mục
          <select aria-label="Danh mục" value={selectedCategory} onChange={e => handleSelectCategoryClick(e.target.value)} className="mt-1 w-full p-2 rounded-xl border border-slate-200 bg-slate-50">
            <option value="ALL">Tất cả danh mục</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        {currentCategoryGroup && <div>
          <button type="button" aria-expanded={isOpenDropdown} onClick={() => setIsOpenDropdown(!isOpenDropdown)} className="w-full p-2 border border-slate-200 rounded-xl flex items-center justify-between font-semibold">
            Danh mục con ({selectedInCurrentCategory} đã chọn)<ChevronDown className="w-4 h-4" />
          </button>
          {isOpenDropdown && <div className="mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
            <input aria-label="Tìm danh mục con" value={searchSubText} onChange={e => setSearchSubText(e.target.value)} placeholder="Tìm danh mục con..." className="w-full p-2 border rounded-lg border-slate-200" />
            <div className="flex justify-between"><button type="button" onClick={handleCheckAllCurrent} className="text-orange-600">Chọn tất cả</button><button type="button" onClick={onClearSubOptions}>Bỏ chọn</button></div>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {filteredOptions.map(option => <label key={option.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-orange-50 cursor-pointer">
                <input type="checkbox" checked={selectedSubOptions.includes(option.id)} onChange={() => onToggleSubOption(option.id)} className="accent-orange-600" />{option.label}
              </label>)}
              {filteredOptions.length === 0 && <p className="p-2 text-slate-500">Không tìm thấy danh mục con.</p>}
            </div>
          </div>}
        </div>}
      </div>
    );
  }

  // INLINE TOOLBAR MODE (Thanh công cụ bộ lọc chính)
  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#FF5C00]" />
          <span>Danh mục:</span>
        </span>

        {/* Nút Chọn Tất cả */}
        <button
          type="button"
          onClick={() => handleSelectCategoryClick('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
            selectedCategory === 'ALL' && selectedSubOptions.length === 0
              ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-2xs font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          Tất cả
        </button>

        {/* Các nút Danh mục (Tiểu học, THCS, THPT, IELTS, v.v.) kèm dropdown multi-check */}
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const selectedCount = cat.options.filter(o => selectedSubOptions.includes(o.id)).length;
          const isDropdownOpenForThis = isOpenDropdown && isSelected;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (selectedCategory === cat.id) {
                  setIsOpenDropdown(!isOpenDropdown);
                } else {
                  handleSelectCategoryClick(cat.id);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isSelected || selectedCount > 0
                  ? 'bg-orange-50 text-[#FF5C00] border-orange-300 font-bold ring-1 ring-orange-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{cat.name}</span>
              {selectedCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FF5C00] text-white text-[10px] font-bold">
                  {selectedCount}
                </span>
              ) : (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isDropdownOpenForThis ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* Nút xóa nhanh tất cả nếu có tùy chọn đang được chọn */}
        {selectedSubOptions.length > 0 && (
          <button
            type="button"
            onClick={onClearSubOptions}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
            title="Xóa tất cả bộ lọc danh mục"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa lọc ({selectedSubOptions.length})</span>
          </button>
        )}
      </div>

      {/* DROPDOWN POPOVER MULTI-SELECT KHI ẤN VÀO DANH MỤC */}
      {isOpenDropdown && currentCategoryGroup && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF5C00]" />
                <h4 className="font-bold text-xs text-slate-800">
                  {currentCategoryGroup.name}
                </h4>
                {currentCategoryGroup.badge && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                    {currentCategoryGroup.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tích chọn 1 hoặc nhiều trường / khối bên dưới để lọc:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenDropdown(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ô tìm kiếm trong danh mục */}
          {currentCategoryGroup.options.length > 5 && (
            <div className="mt-2.5 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSubText}
                onChange={e => setSearchSubText(e.target.value)}
                placeholder={`Tìm trong ${currentCategoryGroup.name}...`}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#FF5C00]"
              />
            </div>
          )}

          {/* Nút thao tác nhanh Chọn tất cả / Bỏ chọn */}
          <div className="flex items-center justify-between pt-2.5 pb-1.5 text-xs">
            <span className="text-[11px] text-slate-500">
              Đã chọn: <strong className="text-[#FF5C00]">{selectedInCurrentCategory}</strong> / {currentCategoryGroup.options.length}
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleCheckAllCurrent}
                className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  const currentIds = currentCategoryGroup.options.map(o => o.id);
                  currentIds.forEach(id => {
                    if (selectedSubOptions.includes(id)) onToggleSubOption(id);
                  });
                }}
                className="text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Danh sách checkboxes */}
          <div className="max-h-56 overflow-y-auto space-y-1 p-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs italic">
                Không tìm thấy tùy chọn phù hợp.
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isChecked = selectedSubOptions.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                      isChecked
                        ? 'bg-orange-50/80 border-orange-300 text-slate-900 font-semibold'
                        : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSubOption(opt.id)}
                        className="accent-[#FF5C00] w-4 h-4 rounded cursor-pointer"
                      />
                      <span>{opt.label}</span>
                    </div>
                    {isChecked && <Check className="w-3.5 h-3.5 text-[#FF5C00]" />}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer Dropdown */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 italic">
              * Tự động lọc danh sách giáo viên
            </span>
            <button
              type="button"
              onClick={() => setIsOpenDropdown(false)}
              className="px-3 py-1.5 bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold rounded-lg shadow-xs cursor-pointer text-xs"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}

      {/* HIỂN THỊ CÁC BADGE / TAGS ĐÃ ĐƯỢC CHỌN */}
      {selectedSubOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] text-slate-400 font-medium">Đang lọc theo:</span>
          {selectedSubOptions.map(optId => (
            <span
              key={optId}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-100/80 text-[#FF5C00] border border-orange-200 font-bold text-[11px]"
            >
              <span>{optId}</span>
              <button
                type="button"
                onClick={() => onToggleSubOption(optId)}
                className="hover:text-rose-600 p-0.5 cursor-pointer"
                title={`Xóa lọc ${optId}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearSubOptions}
            className="text-[11px] text-slate-500 hover:text-rose-600 underline font-medium ml-1 cursor-pointer"
          >
            Xóa hết
          </button>
        </div>
      )}
    </div>
  );
};
