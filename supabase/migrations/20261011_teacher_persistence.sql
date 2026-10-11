-- Tạo hồ sơ và tài khoản giáo viên trong cùng giao dịch; không thêm bảng.
-- Chạy sau 20261011_normalize_database.sql và encrypted_passwords.
BEGIN;
CREATE OR REPLACE FUNCTION public.vuihoc_teacher_data(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE actor vuihoc."NGUOI_DUNG"; allteachers boolean;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 SELECT coalesce(bool_or(g.congtruycap='ADMIN' AND g.danhsachquyen && ARRAY['ALL','PH3_ALL','PH3_READ','PH3_WRITE','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên']),false)
 INTO allteachers FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=actor.manhomquyen;
 RETURN jsonb_build_object(
 'teachers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.madinhdanh),'[]'::jsonb) FROM vuihoc."GIAO_VIEN" t WHERE allteachers OR t.manguoidung=actor.madinhdanh),
 'subjects',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM vuihoc."MON_HOC" x),
 'teaching_categories',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM vuihoc."CAP_HOC" x),
 'levels',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM vuihoc."TRINH_DO" x),
 'time_slots',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM vuihoc."KHUNG_GIO" x),
 'class_models',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM vuihoc."MO_HINH_LOP" x));
END $fn$;
CREATE OR REPLACE FUNCTION public.vuihoc_create_teacher(p_token text,p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $fn$
DECLARE actor vuihoc."NGUOI_DUNG"; grp vuihoc."NHOM_QUYEN"; category vuihoc."CAP_HOC";
 id text; num bigint; email text; pass text; name text; grades text[]; models text[]; teacher vuihoc."GIAO_VIEN";
BEGIN
 -- Cùng thứ tự khóa với RPC tài khoản; cấp mã duy nhất khi nhiều người tạo đồng thời.
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG",vuihoc."GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=actor.manhomquyen AND g.congtruycap='ADMIN' AND g.danhsachquyen && ARRAY['ALL','PH3_ALL','PH3_WRITE','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên']) THEN
  RAISE EXCEPTION 'Không có quyền tạo hồ sơ và cấp tài khoản giáo viên.';
 END IF;
 IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_profile) k WHERE k NOT IN ('hoten','thudientu','sodienthoai','mamonhoc','macaphoc','danhsachkhoi','danhsachmohinh','bangcap','ngaybatdau','ngayketthuc')) THEN RAISE EXCEPTION 'Hồ sơ không hợp lệ.'; END IF;
 name:=btrim(p_profile->>'hoten'); email:=lower(btrim(p_profile->>'thudientu'));
 IF coalesce(name,'')='' OR length(name)>200 OR coalesce(email,'')='' OR email NOT LIKE '%@%.%' THEN RAISE EXCEPTION 'Tên hoặc email không hợp lệ.'; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE lower(btrim(thudientu))=email) OR EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN" WHERE lower(btrim(thudientu))=email) THEN RAISE EXCEPTION 'Email đã được sử dụng.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."MON_HOC" WHERE mamonhoc=p_profile->>'mamonhoc' AND danghoatdong) THEN RAISE EXCEPTION 'Môn học không hoạt động hoặc không tồn tại.'; END IF;
 SELECT * INTO category FROM vuihoc."CAP_HOC" WHERE madinhdanh=p_profile->>'macaphoc' AND coalesce(danghoatdong,true);
 IF NOT FOUND THEN RAISE EXCEPTION 'Cấp học không hoạt động hoặc không tồn tại.'; END IF;
 IF jsonb_typeof(p_profile->'danhsachkhoi') IS DISTINCT FROM 'array' OR jsonb_typeof(p_profile->'danhsachmohinh') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Khối/mô hình phải là danh sách.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_profile->'danhsachkhoi') x WHERE jsonb_typeof(x)<>'string') OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_profile->'danhsachmohinh') x WHERE jsonb_typeof(x)<>'string') THEN RAISE EXCEPTION 'Mã khối/mô hình không hợp lệ.'; END IF;
 SELECT array_agg(DISTINCT x) INTO grades FROM jsonb_array_elements_text(p_profile->'danhsachkhoi') x;
 SELECT array_agg(DISTINCT x) INTO models FROM jsonb_array_elements_text(p_profile->'danhsachmohinh') x;
 IF coalesce(cardinality(grades),0)=0 OR EXISTS(SELECT 1 FROM unnest(grades) k WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(category.danhsachluachon) o WHERE o->>'id'=k)) THEN RAISE EXCEPTION 'Khối lớp không thuộc cấp học đã chọn.'; END IF;
 IF coalesce(cardinality(models),0)=0 OR EXISTS(SELECT 1 FROM unnest(models) m WHERE NOT EXISTS(SELECT 1 FROM vuihoc."MO_HINH_LOP" WHERE mamohinh=m AND danghoatdong)) THEN RAISE EXCEPTION 'Mô hình lớp không hợp lệ.'; END IF;
 SELECT * INTO grp FROM vuihoc."NHOM_QUYEN" WHERE congtruycap='TEACHER' ORDER BY coalesce(macdinh,false) DESC,(madinhdanh='ROLE-04') DESC,madinhdanh LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Chưa có nhóm quyền giáo viên. Hãy tạo nhóm quyền thuộc cổng TEACHER.'; END IF;
 SELECT coalesce(max(substring(code FROM 4)::bigint),0)+1 INTO num FROM (SELECT madinhdanh code FROM vuihoc."GIAO_VIEN" UNION ALL SELECT madinhdanh FROM vuihoc."NGUOI_DUNG" UNION ALL SELECT upper(tendangnhap) FROM vuihoc."NGUOI_DUNG") q WHERE code ~ '^GV-[0-9]{1,9}$';
 LOOP
  id:='GV-'||CASE WHEN num<1000 THEN lpad(num::text,3,'0') ELSE num::text END;
  EXIT WHEN NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=id OR lower(tendangnhap)=lower(id)) AND NOT EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=id);
  num:=num+1;
 END LOOP;
 pass:='Gv@'||encode(gen_random_bytes(16),'hex');
 INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,manhomquyen,hoten,tendangnhap,thudientu,sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,matkhau_mahoa)
 VALUES(id,grp.madinhdanh,name,id,email,coalesce(p_profile->>'sodienthoai',''),'Giáo viên Giảng dạy',p_profile->>'mamonhoc','active',upper(left(name,1)),vuihoc.ma_hoa_mat_khau(pass));
 INSERT INTO vuihoc."GIAO_VIEN"(madinhdanh,manguoidung,hoten,tendangnhap,thudientu,sodienthoai,mamonhoc,macaphoc,danhsachkhoi,danhsachmohinh,bangcap,ngaybatdau,ngayketthuc,trangthai,trangthaidanhgia,nhanxetdanhgia,socaranh,socadaxep,dakinlich)
 VALUES(id,id,name,id,email,coalesce(p_profile->>'sodienthoai',''),p_profile->>'mamonhoc',category.madinhdanh,grades,models,coalesce(p_profile->>'bangcap',''),nullif(p_profile->>'ngaybatdau',''),nullif(p_profile->>'ngayketthuc',''),'CHO_LOP','UNSCORED','',0,0,false) RETURNING * INTO teacher;
 RETURN jsonb_build_object('id',id,'username',id,'password',pass,'teacher',to_jsonb(teacher));
END $fn$;
REVOKE ALL ON FUNCTION public.vuihoc_teacher_data(text),public.vuihoc_create_teacher(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_teacher_data(text),public.vuihoc_create_teacher(text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
