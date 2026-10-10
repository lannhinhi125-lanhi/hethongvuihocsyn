import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export const extractDocumentText = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let text: string;

  if (extension === 'pdf') {
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const pageText = await page.getTextContent();
      pages.push(pageText.items.map(item => 'str' in item ? item.str : '').filter(Boolean).join(' '));
    }
    text = pages.join('\n').trim();
  } else if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = result.value.trim();
  } else {
    throw new Error('Định dạng chưa hỗ trợ. Vui lòng tải tệp PDF hoặc DOCX.');
  }

  if (!text) {
    throw new Error('Không trích xuất được văn bản. Tệp có thể là bản scan hoặc không chứa nội dung văn bản.');
  }

  return text;
};
