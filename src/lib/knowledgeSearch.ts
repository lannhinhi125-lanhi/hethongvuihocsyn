import type { SOPDocument } from '../types';

const stopWords = new Set(['nhu', 'the', 'nao', 'gi', 'cho', 'toi', 'cua', 'voi', 'khi', 'trong', 'duoc', 'bao', 'nhieu']);

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi');

export const findKnowledgeDocument = (query: string, documents: SOPDocument[]) => {
  const terms = [...new Set((normalize(query).match(/[a-z0-9]{3,}/g) || []).filter(term => !stopWords.has(term)))];
  if (!terms.length) return undefined;

  return documents
    .map(document => {
      const searchableText = normalize(`${document.title} ${document.category} ${document.summary} ${document.content}`);
      return {
        document,
        score: terms.reduce((score, term) => score + (searchableText.includes(term) ? 1 : 0), 0)
      };
    })
    .filter(match => match.score > 0)
    .sort((first, second) => second.score - first.score)[0]?.document;
};
