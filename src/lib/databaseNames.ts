/** Ánh xạ bảng/cột Supabase. Key trong JSONB không đổi tên. */
export const DATABASE_SCHEMA = 'vuihoc';
export const DATABASE_NAMES = {
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
      "auth_user_id": "maxacthuc",
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
  "course_packages": {
    "table": "GOI_HOC",
    "columns": {
      "id": "madinhdanh",
      "code": "magoihoc",
      "name": "tengoihoc",
      "months": "sothang",
      "days_converted": "songayquydoi",
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
      "subject_name": "tenmonhoc",
      "level_id": "macaphoc",
      "level_name": "tencaphoc",
      "grades": "danhsachkhoi",
      "models": "danhsachmohinh",
      "phone": "sodienthoai",
      "email": "thudientu",
      "degree": "bangcap",
      "start_date": "ngaybatdau",
      "end_date": "ngayketthuc",
      "status": "trangthai",
      "status_label": "tentrangthai",
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
      "room_link": "lienketphonghoc",
      "teacher_name": "hotengiaovien",
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
      "category": "phanloai",
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
    "table": "CA_HOC",
    "columns": {
      "id": "madinhdanh",
      "session_code": "macahoc",
      "session_date": "ngayhoc",
      "class_code": "malophoc",
      "class_name": "tenlophoc",
      "level_text": "tentrinhdo",
      "model_text": "tenmohinh",
      "subject_code": "mamonhoc",
      "grade": "khoi",
      "time_slot": "cahoc",
      "room": "phonghoc",
      "room_url": "lienketphonghoc",
      "recording_url": "lienketbanghi",
      "primary_teacher": "giaovienchinh",
      "cover_teacher": "giaoviendaythay",
      "attendance": "diemdanh",
      "checkin_time": "giovaolop",
      "status": "trangthai",
      "has_incident": "cosuco",
      "incident_parent": "manhomsuco",
      "incident_child": "masuco",
      "incident_urgency": "muckhancap",
      "incident_status": "trangthaisuco",
      "incident_note": "ghichusuco",
      "handled_by_ops_id": "manguoixuly",
      "handled_by_name": "hotenguoixuly",
      "handled_at": "thoigianxuly",
      "lesson_diary": "nhatkybuoihoc",
      "students": "danhsachhocsinh",
      "is_just_updated": "vuacapnhat",
      "created_at": "ngaytao",
      "updated_at": "ngaycapnhat"
    }
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
  }
} as const;
export const APP_DATABASE_FIELDS = {
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
    "auth_user_id": "maxacthuc",
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
  "course_packages": {
    "id": "madinhdanh",
    "code": "magoihoc",
    "name": "tengoihoc",
    "months": "sothang",
    "daysConverted": "songayquydoi",
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
    "subjectName": "tenmonhoc",
    "levelId": "macaphoc",
    "levelName": "tencaphoc",
    "grades": "danhsachkhoi",
    "models": "danhsachmohinh",
    "phone": "sodienthoai",
    "email": "thudientu",
    "degree": "bangcap",
    "startDate": "ngaybatdau",
    "endDate": "ngayketthuc",
    "status": "trangthai",
    "statusLabel": "tentrangthai",
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
    "roomLink": "lienketphonghoc",
    "teacherName": "hotengiaovien",
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
    "category": "phanloai",
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
  "teaching_sessions": {
    "sessionCode": "macahoc",
    "sessionDate": "ngayhoc",
    "classCode": "malophoc",
    "className": "tenlophoc",
    "levelText": "tentrinhdo",
    "modelText": "tenmohinh",
    "subject": "mamonhoc",
    "grade": "khoi",
    "timeSlot": "cahoc",
    "room": "phonghoc",
    "roomUrl": "lienketphonghoc",
    "recordingUrl": "lienketbanghi",
    "primaryTeacher": "giaovienchinh",
    "coverTeacher": "giaoviendaythay",
    "attendance": "diemdanh",
    "checkinTime": "giovaolop",
    "status": "trangthai",
    "hasIncident": "cosuco",
    "incidentParent": "manhomsuco",
    "incidentChild": "masuco",
    "incidentUrgency": "muckhancap",
    "incidentStatus": "trangthaisuco",
    "incidentNote": "ghichusuco",
    "handledByOpsId": "manguoixuly",
    "handledByName": "hotenguoixuly",
    "handledAt": "thoigianxuly",
    "lessonDiary": "nhatkybuoihoc",
    "students": "danhsachhocsinh",
    "isJustUpdated": "vuacapnhat",
    "id": "madinhdanh",
    "created_at": "ngaytao",
    "updated_at": "ngaycapnhat"
  },
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
  }
} as const;
