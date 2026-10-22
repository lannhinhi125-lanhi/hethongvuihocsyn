export function workEvidenceLinks(value?: string): string[] {
  return (value || '').split(/[\r\n]+/).map(link => link.trim()).filter(Boolean);
}

export function isWorkEvidenceLink(value: string): boolean {
  return /^https?:\/\/[^\s]+$/.test(value);
}

export function normalizeWorkEvidence(value: string): string {
  const links = workEvidenceLinks(value);
  if (links.some(link => !isWorkEvidenceLink(link))) {
    throw new Error('Minh chứng phải là liên kết HTTP/HTTPS, mỗi dòng một liên kết.');
  }
  if (new Set(links).size !== links.length) {
    throw new Error('Không lặp liên kết minh chứng trong cùng giải trình.');
  }
  return links.join('\n');
}
