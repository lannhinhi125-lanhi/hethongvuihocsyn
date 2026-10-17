export const RESPONSE_LENGTHS={
  short:'Ngắn gọn: ưu tiên 2–4 câu, trả lời thẳng ý chính; vẫn giữ đủ điều kiện quan trọng.',
  balanced:'Vừa phải: trả lời ý chính và giải thích ngắn khi cần, thường 1–3 đoạn.',
  detailed:'Chi tiết: giải thích đầy đủ, chia các bước khi phù hợp và thêm ví dụ nếu hữu ích; tránh lặp ý.',
} as const;
export type ResponseLength=keyof typeof RESPONSE_LENGTHS;
const prefix='Độ dài câu trả lời: ';
export const additionalAIInstructions=(prompt:string)=>prompt.split('\n').filter(line=>!line.startsWith(prefix)).join('\n');
export function responseLength(prompt:string):ResponseLength {
  const line=prompt.split('\n').find(line=>line.startsWith(prefix));
  return (Object.keys(RESPONSE_LENGTHS) as ResponseLength[]).find(key=>line===prefix+RESPONSE_LENGTHS[key])||'balanced';
}
export const responseStylePrompt=(length:ResponseLength,additional:string)=>prefix+RESPONSE_LENGTHS[length]+(additional?'\n'+additional:'');
