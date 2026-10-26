// SERVER ONLY: import this file from api/ or Vite's server middleware, never from React.
export type GeminiMessage = { role: 'user' | 'model'; text: string };
export type GeminiInput = { messages: GeminiMessage[]; systemPrompt?: string };
export type GeminiEnvironment = Record<string, string | undefined>;

export class GeminiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function validateGeminiInput(value: unknown): GeminiInput {
  if (!value || typeof value !== 'object') throw new GeminiError(400, 'Nội dung yêu cầu không hợp lệ.');
  const {messages, systemPrompt} = value as Partial<GeminiInput>;
  if (!Array.isArray(messages) || !messages.length || messages.length > 40 ||
      messages.some(message => !message || !['user','model'].includes(message.role) ||
        typeof message.text !== 'string' || !message.text.trim()) ||
      messages[0].role !== 'user' || messages.at(-1)?.role !== 'user' ||
      messages.some((message,index) => index > 0 && message.role === messages[index-1].role) ||
      (systemPrompt !== undefined && typeof systemPrompt !== 'string')) {
    throw new GeminiError(400, 'Gửi từ 1–40 tin nhắn xen kẽ giáo viên/AI, bắt đầu và kết thúc bằng câu hỏi.');
  }
  if (messages.reduce((total,message)=>total+message.text.length,systemPrompt?.length || 0) > 120_000) {
    throw new GeminiError(413, 'Nội dung quá dài. Hãy chọn phần tài liệu liên quan hoặc bắt đầu cuộc trò chuyện mới.');
  }
  return {messages:messages.map(({role,text})=>({role,text})),systemPrompt};
}

/** Both local and Vercel use one key name. No hardcoded key or alternate key fallback. */
export async function generateGeminiText(input: GeminiInput, env: GeminiEnvironment = process.env): Promise<string> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim();
  if (!apiKey || !model || !/^gemini-[a-z0-9.-]+$/.test(model)) {
    throw new GeminiError(503, 'Máy chủ chưa cấu hình GEMINI_API_KEY và GEMINI_MODEL hợp lệ.');
  }
  const validated = validateGeminiInput(input);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method:'POST',
    headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
    signal:AbortSignal.timeout(45_000),
    body:JSON.stringify({
      contents:validated.messages.map(message=>({role:message.role,parts:[{text:message.text}]})),
      ...(validated.systemPrompt ? {systemInstruction:{parts:[{text:validated.systemPrompt}]}} : {}),
      generationConfig:{maxOutputTokens:4096},
    }),
  });
  // Never relay upstream error bodies: they can contain configuration or credentials.
  if (!response.ok) {
    const errors:Record<number,string>={
      400:'Google từ chối yêu cầu (400). Kiểm tra API key, model và cấu hình yêu cầu trên máy chủ.',
      401:'Google không chấp nhận thông tin xác thực (401). Kiểm tra GEMINI_API_KEY trên Vercel.',
      403:'Google từ chối quyền truy cập (403). Kiểm tra quyền API key và trạng thái dự án/thanh toán trong Google AI Studio.',
      404:'Không tìm thấy model cho API đang dùng (404). Kiểm tra GEMINI_MODEL và quyền sử dụng model trong Google AI Studio.',
      429:'Gemini đang giới hạn lượt gọi hoặc hạn mức sử dụng (429). Kiểm tra hạn mức trong Google AI Studio.',
      500:'Dịch vụ Gemini đang gặp lỗi (500). Vui lòng thử lại sau.',
      503:'Dịch vụ Gemini tạm thời không khả dụng (503). Vui lòng thử lại sau.',
      504:'Dịch vụ Gemini phản hồi quá lâu (504). Vui lòng thử lại.',
    };
    throw new GeminiError(response.status===429 ? 429 : 502,
      errors[response.status] || `Không gọi được Gemini (HTTP ${response.status}). Kiểm tra cấu hình máy chủ hoặc thử lại sau.`);
  }
  const result = await response.json();
  const candidate = result.candidates?.[0];
  if (result.promptFeedback?.blockReason || (candidate?.finishReason && !['STOP','MAX_TOKENS'].includes(candidate.finishReason))) {
    throw new GeminiError(422, 'Gemini không thể trả lời yêu cầu này. Hãy diễn đạt lại câu hỏi.');
  }
  const text = candidate?.content?.parts?.filter((part:{text?:string;thought?:boolean})=>!part.thought && typeof part.text==='string')
    .map((part:{text:string})=>part.text).join('').trim();
  if (!text) throw new GeminiError(502, 'Gemini chưa trả về nội dung. Vui lòng thử lại.');
  return text;
}
