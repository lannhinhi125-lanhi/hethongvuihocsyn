/** Ánh xạ bảng/cột Supabase. Key trong JSONB không đổi tên. */
export const DATABASE_SCHEMA = 'vuihoc';
export const DATABASE_NAMES = {
  document_categories:{table:'LOAI_TAI_LIEU',columns:{id:'madinhdanh',name:'tenloai',description:'mota',is_active:'danghoatdong'}},
  "role_groups": {
    "table": "NHOM_QUYEN",
    "columns": {
      "portal": "congtruycap",
      "id": "madinhdanh",
      "name": "tennhomquyen",
      "category": "phanloai",
      "description": "mota",
      "user_count": "soluongnguoidung",
      "permissions": "danhsachquyen",
      "is_default": "macdinh",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "users": {
    "table": "NGUOI_DUNG",
    "columns": {
      "role_group_id": "manhomquyen",
      "id": "madinhdanh",
      "name": "hoten",
      "username": "tendangnhap",
      "email": "thudientu",
      "phone": "sodienthoai",
      "role": "vaitro",
      "subject_code": "mamonhoc",
      "status": "trangthai",
      "avatar_initials": "chucaiavatar",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "subjects": {
    "table": "MON_HOC",
    "columns": {
      "id": "madinhdanh",
      "code": "mamonhoc",
      "abbr": "tenviettat",
      "name": "tenmonhoc",
      "description": "mota",
      "is_active": "danghoatdong",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "levels": {
    "table": "TRINH_DO",
    "columns": {
      "id": "madinhdanh",
      "code": "matrinhdo",
      "abbr": "tenviettat",
      "name": "tentrinhdo",
      "target_student": "doituonghocsinh",
      "objective": "muctieu",
      "is_active": "danghoatdong",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "time_slots": {
    "table": "KHUNG_GIO",
    "columns": {
      "id": "madinhdanh",
      "code": "makhunggio",
      "name": "tenkhunggio",
      "time_range": "khoanggio",
      "duration_minutes": "sophut",
      "is_active": "danghoatdong",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "class_models": {
    "table": "MO_HINH_LOP",
    "columns": {
      "id": "madinhdanh",
      "code": "mamohinh",
      "name": "tenmohinh",
      "max_students": "sisotoida",
      "is_active": "danghoatdong",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "teaching_categories": {
    "table": "CAP_HOC",
    "columns": {
      "is_active": "danghoatdong",
      "id": "madinhdanh",
      "name": "tencaphoc",
      "badge": "nhanhienthi",
      "options": "danhsachluachon",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "incident_categories": {
    "table": "DANH_MUC_SU_CO",
    "columns": {
      "id": "madinhdanh",
      "code": "manhomsuco",
      "name": "tennhomsuco",
      "description": "mota",
      "sub_incidents": "danhsachsuco",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "teachers": {
    "table": "GIAO_VIEN",
    "columns": {
      "id": "madinhdanh",
      "name": "hoten",
      "username": "tendangnhap",
      "subject_code": "mamonhoc",
      "level_id": "macaphoc",
      "grades": "danhsachkhoi",
      "models": "danhsachmohinh",
      "phone": "sodienthoai",
      "email": "thudientu",
      "degree": "bangcap",
      "start_date": "ngaybatdau",
      "end_date": "ngayketthuc",
      "status": "trangthai",
      "eval_status": "trangthaidanhgia",
      "eval_score": "diemdanhgia",
      "eval_comment": "nhanxetdanhgia",
      "eval_criteria_scores": "diemtieuchi",
      "free_slots": "socaranh",
      "busy_slots": "socadaxep",
      "is_full": "dakinlich",
      "evaluation_reports": "baocaodanhgia",
      "successful_sessions": "cahochoanthanh",
      "schedule": "lichranh",
      "user_id": "manguoidung",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "students": {
    "table": "HOC_SINH",
    "columns": {
      "id": "madinhdanh",
      "name": "hoten",
      "grade": "khoi",
      "subject_code": "mamonhoc",
      "model_code": "mamohinh",
      "level_code": "matrinhdo",
      "father_name": "hotencha",
      "father_phone": "sodienthoaicha",
      "mother_name": "hotenme",
      "mother_phone": "sodienthoaime",
      "schedule_slots": "lichdangky",
      "status": "trangthai",
      "current_class_code": "malophientai",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "classes": {
    "table": "LOP_HOC",
    "columns": {
      "category_id": "macaphoc",
      "status": "trangthai",
      "id": "madinhdanh",
      "code": "malophoc",
      "name": "tenlophoc",
      "grade": "khoi",
      "subject_code": "mamonhoc",
      "level_code": "matrinhdo",
      "model_code": "mamohinh",
      "max_students": "sisotoida",
      "student_ids": "danhsachmahocsinh",
      "schedule": "lichhoc",
      "start_date": "ngaybatdau",
      "room_link": "lienketphonghoc",
      "teacher_id": "magiaovien",
      "materials": "hoclieu",
      "active_sessions": "chitietcahoc",
      "cover_assignments": "phancongdaythay",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "criteria_categories": {
    "table": "NHOM_TIEU_CHI",
    "columns": {
      "id": "madinhdanh",
      "subject_code": "mamonhoc",
      "name": "tennhomtieuchi",
      "criteria": "danhsachtieuchi",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "sop_documents": {
    "table": "TAI_LIEU_QUY_TRINH",
    "columns": {
      "id": "madinhdanh",
      "title": "tieude",
      "category": "tenloaitailieu",
      "category_id": "maloaitailieu",
      "summary": "tomtat",
      "updated_at": "ngaycapnhat",
      "content": "noidung",
      "source_file_name": "tentepgoc",
      "source_file_type": "loaitepgoc",
      "is_enabled": "dangsudung",
      "created_at": "ngaytao"
    }
  },
  "rag_bot_config": {
    "table": "CAU_HINH_TRO_LY",
    "columns": {
      "id": "madinhdanh",
      "welcome_greeting": "loichaomung",
      "quick_prompts": "cauhoinhanh",
      "persona_tone": "vanphong",
      "strict_grounding_only": "chiduatrentailieu",
      "fallback_response": "cautraloiduphong",
      "system_prompt": "chidanhethong",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  // teachers/disputes are computed API fields after payroll normalization.
  // They are not physical columns in BANG_CONG_THANG.
  "monthly_payroll": {
    "table": "BANG_CONG_THANG",
    "columns": {
      "id": "madinhdanh",
      "is_locked": "dakhoa",
      "admin_sent_notice": "daguithongbao",
      "teachers": "danhsachgiaovien",
      "disputes": "danhsachgiaitrinh",
      "month_period": "kycong",
      "locked_at": "thoigiankhoa",
      "unlock_reason": "lydomokhoa",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "teaching_sessions": {
    "table": "BUOI_HOC",
    "columns": {}
  },
  "report_templates": {
    "table": "MAU_BAO_CAO",
    "columns": {
      "config": "cauhinh",
      "id": "madinhdanh",
      "name": "tenmaubaocao",
      "user_id": "manguoidung",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "custom_catalogs": {
    "table": "DANH_MUC_BO_SUNG",
    "columns": {
      "entries": "danhsachmuc",
      "id": "madinhdanh",
      "code": "madanhmuc",
      "name": "tendanhmuc",
      "description": "mota",
      "parent_id": "madanhmuccha",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "tone_directives": {
    "table": "VAN_PHONG_NHAN_XET",
    "columns": {
      "id": "madinhdanh",
      "name": "tenvanphong",
      "directive": "chidan",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "app_settings": {
    "table": "CAU_HINH_HE_THONG",
    "columns": {
      "id": "madinhdanh",
      "active_tone_key": "mavanphongdangchon",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "ai_review_usage": {
    "table": "LUOT_NHAN_XET_AI",
    "columns": {
      "teacher_id": "magiaovien",
      "student_id": "mahocsinh",
      "usage_count": "soluotsudung",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "user_preferences": {
    "table": "TUY_CHON_NGUOI_DUNG",
    "columns": {
      "user_id": "manguoidung",
      "active_module": "phanhedangchon",
      "workspace_mode": "chedogiaodien",
      "teacher_portal_tab": "tabgiaoviendangchon",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "weekly_availability": {
    "table": "LICH_RANH_TUAN",
    "columns": {
      "id": "madinhdanh",
      "teacherId": "magiaovien",
      "weekStart": "ngaydautuan",
      "weekEnd": "ngaycuoituan",
      "schoolYear": "namhoc",
      "updatedBy": "manguoicapnhat",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "availability_slots": {
    "table": "CHI_TIET_LICH_RANH",
    "columns": {
      "weekId": "malichtuan",
      "date": "ngay",
      "timeSlotId": "makhunggio",
      "status": "trangthai",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "dated_lessons": {
    "table": "BUOI_HOC",
    "columns": {
      "id": "madinhdanh",
      "classId": "malop",
      "date": "ngayhoc",
      "timeSlotId": "makhunggio",
      "startsAt": "batdau",
      "endsAt": "ketthuc",
      "primaryTeacherId": "magiaovienchinh",
      "coverTeacherId": "magiaoviendaythay",
      "title": "tieude",
      "roomUrl": "lienketphonghoc",
      "materials": "hoclieu",
      "status": "trangthai",
      "checkinAt": "vaolopluc",
      "checkoutAt": "ketthucluc",
      "checkinUserId": "manguoivaolop",
      "checkoutUserId": "manguoiketthuc",
      "teacherAttendance": "chuyencan",
      "diary": "nhatky",
      "recordingUrl": "lienketbanghi",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "lesson_attendance": {
    "table": "DIEM_DANH_BUOI_HOC",
    "columns": {
      "lessonId": "mabuoi",
      "studentId": "mahocsinh",
      "status": "trangthai",
      "note": "ghichu",
      "updatedBy": "manguoicapnhat",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "lesson_feedback": {
    "table": "NHAN_XET_BUOI_HOC",
    "columns": {
      "lessonId": "mabuoi",
      "studentId": "mahocsinh",
      "content": "noidung",
      "selectedCriteria": "tieuchidachon",
      "toneId": "mavanphong",
      "aiGenerationCount": "soluottaoai",
      "updatedBy": "manguoicapnhat",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "lesson_incidents": {
    "table": "SU_CO_BUOI_HOC",
    "columns": {
      "id": "madinhdanh",
      "lessonId": "mabuoi",
      "categoryId": "manhomsuco",
      "incidentCode": "masuco",
      "incidentName": "tensuco",
      "appliedCreditCoeff": "hesocongapdung",
      "urgency": "muckhancap",
      "content": "noidung",
      "status": "trangthai",
      "reportedBy": "manguoibao",
      "handledBy": "manguoixuly",
      "reportedAt": "baoluc",
      "handledAt": "xulyluc",
      "resolutionNote": "ghichuxuly",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "lesson_credits": {
    "table": "CONG_DAY_BUOI_HOC",
    "columns": {
      "id": "madinhdanh",
      "lessonId": "mabuoi",
      "teacherId": "magiaovien",
      "monthPeriod": "kycong",
      "role": "vaitro",
      "coefficient": "hesocong",
      "note": "ghichu",
      "isSent": "dagui",
      "sentAt": "guiluc",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "credit_disputes": {
    "table": "GIAI_TRINH_CONG_DAY",
    "columns": {
      "id": "madinhdanh",
      "creditId": "macong",
      "content": "noidung",
      "incidentType": "loaisuco",
      "attachments": "minhchung",
      "status": "trangthai",
      "submittedAt": "guiluc",
      "submittedBy": "manguoigui",
      "reviewedBy": "manguoiduyet",
      "reviewedAt": "duyetluc",
      "reviewNote": "ghichuduyet",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  },
  "teacher_evaluations": {
    "table": "BIEN_BAN_DU_GIO",
    "columns": {
      "id": "madinhdanh",
      "teacherId": "magiaovien",
      "reportCode": "mabienban",
      "lessonId": "mabuoi",
      "classCode": "malophoc",
      "recipientUserId": "manguoinhan",
      "evaluatorUserId": "manguoidanhgia",
      "evaluationDate": "ngaydanhgia",
      "sessionDate": "ngaycahoc",
      "sessionCode": "macahoc",
      "sentAt": "guiluc",
      "sessionNum": "sobuoi",
      "sessionName": "tenbuoihoc",
      "timeSlot": "khunggio",
      "model": "mohinh",
      "overallScore": "diemtong",
      "rank": "xeploai",
      "criteriaScores": "diemtieuchi",
      "generalComment": "nhanxetchung",
      "strengths": "uudiem",
      "improvements": "cancaithien",
      "recommendations": "khuyennghi",
      "status": "trangthai",
      "roomLink": "lienketphonghoc",
      "recordLink": "lienketbanghi",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
  }
} as const;
export const APP_DATABASE_FIELDS = {
  document_categories:{id:'madinhdanh',name:'tenloai',description:'mota',isActive:'danghoatdong'},
  "role_groups": {
    "portal": "congtruycap",
    "id": "madinhdanh",
    "name": "tennhomquyen",
    "category": "phanloai",
    "desc": "mota",
    "userCount": "soluongnguoidung",
    "permissions": "danhsachquyen",
    "isDefault": "macdinh",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "users": {
    "roleGroupId": "manhomquyen",
    "id": "madinhdanh",
    "name": "hoten",
    "username": "tendangnhap",
    "email": "thudientu",
    "phone": "sodienthoai",
    "role": "vaitro",
    "subject": "mamonhoc",
    "status": "trangthai",
    "avatarInitials": "chucaiavatar",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "subjects": {
    "id": "madinhdanh",
    "code": "mamonhoc",
    "abbr": "tenviettat",
    "name": "tenmonhoc",
    "desc": "mota",
    "status": "danghoatdong",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "levels": {
    "id": "madinhdanh",
    "code": "matrinhdo",
    "abbr": "tenviettat",
    "name": "tentrinhdo",
    "target": "doituonghocsinh",
    "objective": "muctieu",
    "status": "danghoatdong",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "time_slots": {
    "id": "madinhdanh",
    "code": "makhunggio",
    "name": "tenkhunggio",
    "timeRange": "khoanggio",
    "durationMinutes": "sophut",
    "status": "danghoatdong",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "class_models": {
    "id": "madinhdanh",
    "code": "mamohinh",
    "name": "tenmohinh",
    "maxStudents": "sisotoida",
    "status": "danghoatdong",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "teaching_categories": {
    "status": "danghoatdong",
    "id": "madinhdanh",
    "name": "tencaphoc",
    "badge": "nhanhienthi",
    "options": "danhsachluachon",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "incident_categories": {
    "id": "madinhdanh",
    "code": "manhomsuco",
    "name": "tennhomsuco",
    "desc": "mota",
    "subIncidents": "danhsachsuco",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "teachers": {
    "id": "madinhdanh",
    "name": "hoten",
    "username": "tendangnhap",
    "subject": "mamonhoc",
    "levelId": "macaphoc",
    "grades": "danhsachkhoi",
    "models": "danhsachmohinh",
    "phone": "sodienthoai",
    "email": "thudientu",
    "degree": "bangcap",
    "startDate": "ngaybatdau",
    "endDate": "ngayketthuc",
    "status": "trangthai",
    "evalStatus": "trangthaidanhgia",
    "evalScore": "diemdanhgia",
    "evalComment": "nhanxetdanhgia",
    "evalCriteriaScores": "diemtieuchi",
    "freeSlots": "socaranh",
    "busySlots": "socadaxep",
    "isFull": "dakinlich",
    "evaluationReports": "baocaodanhgia",
    "successfulSessions": "cahochoanthanh",
    "schedule": "lichranh",
    "user_id": "manguoidung",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "students": {
    "classHistory": "lichsulophoc",
    "id": "madinhdanh",
    "name": "hoten",
    "grade": "khoi",
    "subject": "mamonhoc",
    "model": "mamohinh",
    "level": "matrinhdo",
    "fatherName": "hotencha",
    "fatherPhone": "sodienthoaicha",
    "motherName": "hotenme",
    "motherPhone": "sodienthoaime",
    "scheduleSlots": "lichdangky",
    "status": "trangthai",
    "currentClassCode": "malophientai",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "classes": {
    "categoryId": "macaphoc",
    "status": "trangthai",
    "id": "madinhdanh",
    "code": "malophoc",
    "name": "tenlophoc",
    "grade": "khoi",
    "subject": "mamonhoc",
    "level": "matrinhdo",
    "model": "mamohinh",
    "maxStudents": "sisotoida",
    "studentIds": "danhsachmahocsinh",
    "schedule": "lichhoc",
    "startDate": "ngaybatdau",
    "roomLink": "lienketphonghoc",
    "teacherId": "magiaovien",
    "materials": "hoclieu",
    "activeSessions": "chitietcahoc",
    "coverAssignments": "phancongdaythay",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "criteria_categories": {
    "id": "madinhdanh",
    "subject": "mamonhoc",
    "name": "tennhomtieuchi",
    "criteria": "danhsachtieuchi",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "sop_documents": {
    "id": "madinhdanh",
    "title": "tieude",
    "category": "tenloaitailieu",
    "categoryId": "maloaitailieu",
    "summary": "tomtat",
    "updatedAt": "ngaycapnhat",
    "content": "noidung",
    "sourceFileName": "tentepgoc",
    "sourceFileType": "loaitepgoc",
    "isEnabled": "dangsudung",
    "created_at": "ngaytao"
  },
  "rag_bot_config": {
    "welcomeGreeting": "loichaomung",
    "quickPrompts": "cauhoinhanh",
    "personaTone": "vanphong",
    "strictGroundingOnly": "chiduatrentailieu",
    "fallbackResponse": "cautraloiduphong",
    "systemPrompt": "chidanhethong",
    "id": "madinhdanh",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  // The RPC keeps these virtual list keys for compatibility with the UI codec.
  "monthly_payroll": {
    "isLocked": "dakhoa",
    "adminSentNotice": "daguithongbao",
    "teachers": "danhsachgiaovien",
    "disputes": "danhsachgiaitrinh",
    "id": "madinhdanh",
    "month_period": "kycong",
    "locked_at": "thoigiankhoa",
    "unlock_reason": "lydomokhoa",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "teaching_sessions": {},
  "report_templates": {
    "id": "madinhdanh",
    "name": "tenmaubaocao",
    "config": "cauhinh",
    "user_id": "manguoidung",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "custom_catalogs": {
    "id": "madinhdanh",
    "code": "madanhmuc",
    "name": "tendanhmuc",
    "desc": "mota",
    "parentId": "madanhmuccha",
    "entries": "danhsachmuc",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "tone_directives": {
    "id": "madinhdanh",
    "name": "tenvanphong",
    "directive": "chidan",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "app_settings": {
    "id": "madinhdanh",
    "active_tone_key": "mavanphongdangchon",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "ai_review_usage": {
    "teacher_id": "magiaovien",
    "student_id": "mahocsinh",
    "usage_count": "soluotsudung",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "user_preferences": {
    "user_id": "manguoidung",
    "active_module": "phanhedangchon",
    "workspace_mode": "chedogiaodien",
    "teacher_portal_tab": "tabgiaoviendangchon",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "weekly_availability": {
    "id": "madinhdanh",
    "teacherId": "magiaovien",
    "weekStart": "ngaydautuan",
    "weekEnd": "ngaycuoituan",
    "schoolYear": "namhoc",
    "updatedBy": "manguoicapnhat",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "availability_slots": {
    "weekId": "malichtuan",
    "date": "ngay",
    "timeSlotId": "makhunggio",
    "status": "trangthai",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "dated_lessons": {
    "id": "madinhdanh",
    "classId": "malop",
    "date": "ngayhoc",
    "timeSlotId": "makhunggio",
    "startsAt": "batdau",
    "endsAt": "ketthuc",
    "primaryTeacherId": "magiaovienchinh",
    "coverTeacherId": "magiaoviendaythay",
    "title": "tieude",
    "roomUrl": "lienketphonghoc",
    "materials": "hoclieu",
    "status": "trangthai",
    "feedbackProgress": "tiendonhanxet",
    "inspectionData": "thongtindugio",
    "checkinAt": "vaolopluc",
    "checkoutAt": "ketthucluc",
    "checkinUserId": "manguoivaolop",
    "checkoutUserId": "manguoiketthuc",
    "teacherAttendance": "chuyencan",
    "diary": "nhatky",
    "recordingUrl": "lienketbanghi",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "lesson_attendance": {
    "lessonId": "mabuoi",
    "studentId": "mahocsinh",
    "status": "trangthai",
    "note": "ghichu",
    "updatedBy": "manguoicapnhat",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "lesson_feedback": {
    "lessonId": "mabuoi",
    "studentId": "mahocsinh",
    "content": "noidung",
    "selectedCriteria": "tieuchidachon",
    "toneId": "mavanphong",
    "aiGenerationCount": "soluottaoai",
    "updatedBy": "manguoicapnhat",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "lesson_incidents": {
    "id": "madinhdanh",
    "lessonId": "mabuoi",
    "categoryId": "manhomsuco",
    "incidentCode": "masuco",
    "incidentName": "tensuco",
    "appliedCreditCoeff": "hesocongapdung",
    "urgency": "muckhancap",
    "content": "noidung",
    "status": "trangthai",
    "reportedBy": "manguoibao",
    "handledBy": "manguoixuly",
    "reportedAt": "baoluc",
    "handledAt": "xulyluc",
    "resolutionNote": "ghichuxuly",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "lesson_credits": {
    "id": "madinhdanh",
    "lessonId": "mabuoi",
    "teacherId": "magiaovien",
    "monthPeriod": "kycong",
    "role": "vaitro",
    "coefficient": "hesocong",
    "note": "ghichu",
    "isSent": "dagui",
    "sentAt": "guiluc",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "credit_disputes": {
    "id": "madinhdanh",
    "creditId": "macong",
    "content": "noidung",
    "incidentType": "loaisuco",
    "attachments": "minhchung",
    "status": "trangthai",
    "submittedAt": "guiluc",
    "submittedBy": "manguoigui",
    "reviewedBy": "manguoiduyet",
    "reviewedAt": "duyetluc",
    "reviewNote": "ghichuduyet",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
  "teacher_evaluations": {
    "id": "madinhdanh",
    "teacherId": "magiaovien",
    "reportCode": "mabienban",
    "lessonId": "mabuoi",
    "classCode": "malophoc",
    "recipientUserId": "manguoinhan",
    "evaluatorUserId": "manguoidanhgia",
    "evaluationDate": "ngaydanhgia",
    "sessionDate": "ngaycahoc",
    "sessionCode": "macahoc",
    "sentAt": "guiluc",
    "sessionNum": "sobuoi",
    "sessionName": "tenbuoihoc",
    "timeSlot": "khunggio",
    "model": "mohinh",
    "overallScore": "diemtong",
    "rank": "xeploai",
    "criteriaScores": "diemtieuchi",
    "generalComment": "nhanxetchung",
    "strengths": "uudiem",
    "improvements": "cancaithien",
    "recommendations": "khuyennghi",
    "status": "trangthai",
    "roomLink": "lienketphonghoc",
    "recordLink": "lienketbanghi",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  }
} as const;
