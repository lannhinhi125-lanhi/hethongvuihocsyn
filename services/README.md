# Gemini local và Vercel

`geminiService.ts` chỉ chạy trên server, gọi Google bằng `process.env.GEMINI_API_KEY`.
Không dán API key vào file TypeScript, link hoặc biến `VITE_*`. API key là chuỗi khóa lấy từ Google AI Studio, không phải link chia sẻ tài liệu.

## Local

Điền `.env.local` tại thư mục gốc (cùng cấp `package.json`):

```dotenv
GEMINI_API_KEY="dan_api_key_cua_ban"
GEMINI_MODEL="gemini-3.5-flash"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="anon_public_key_cua_cung_project"
```

Chọn model hỗ trợ `generateContent` hiện có trong tài khoản của bạn. Hai biến Supabase dùng cùng giá trị với frontend, giúp API xác thực phiên đăng nhập và quyền AI; không dùng service role key. Khởi động lại `npm run dev` sau khi sửa biến. Vite cung cấp `/api/gemini` ở local; `npm run preview` chỉ phục vụ frontend tĩnh.

`.env.local` đã được `.gitignore` loại khỏi Git. Biến môi trường đã đặt trong tiến trình được ưu tiên hơn file `.env.local`; không có fallback sang `API_KEY` hoặc khóa khác. Nếu thấy khóa local không đúng, kiểm tra biến `GEMINI_API_KEY` của terminal rồi khởi động lại.

## Vercel

Trong Project → Settings → Environment Variables, đặt bốn tên biến như trên, chọn đúng Production / Preview / Development, rồi redeploy. Function `api/gemini.ts` chỉ đọc biến môi trường của deployment; không tự nạp file `.env.local`.

Frontend luôn gọi đường dẫn tương đối `/api/gemini`. Không cần hardcode localhost hoặc tên miền Vercel. API chỉ nhận POST JSON, kiểm tra phiên Supabase và quyền AI trước khi gọi Google, không lưu chat hay API key vào database.

## Gọi từ giao diện

```ts
import {askGemini} from './src/lib/geminiClient'; // điều chỉnh đường dẫn theo file gọi

const answer = await askGemini([
  {role:'user', text:'Giải thích quy trình điểm danh.'},
], {systemPrompt:'Trả lời bằng tiếng Việt dựa trên nội dung được cung cấp.'});
```

Chatbot quản trị và giáo viên gọi Gemini thật, gửi các trích đoạn từ tài liệu đang bật làm căn cứ để tổng hợp và giải thích. Mỗi yêu cầu giới hạn nội dung tài liệu ở 28.000 ký tự; lịch sử dùng tối đa 6 lượt hỏi/đáp và 24.000 ký tự trong bộ nhớ, xóa khi làm mới/đóng bot giáo viên hoặc rời màn hình. Không tạo bảng, cột, lịch sử chat hay chỉ mục mới trong database. Bot chưa tự tải nội dung link Drive; tài liệu cần có nội dung đã nhập hoặc trích xuất từ tệp. Luồng nhận xét AI không thay đổi.

Tham khảo: [Gemini generateContent](https://ai.google.dev/api/generate-content), [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js), [Vite env](https://vite.dev/guide/env-and-mode).
