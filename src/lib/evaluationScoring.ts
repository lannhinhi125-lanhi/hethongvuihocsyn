import type { EvaluationRecord } from '../types';

export function evaluationRating(score: number | null | undefined): {code:'A'|'B'|'C'|'D';label:EvaluationRecord['rank']} | null {
  if (score == null || !Number.isFinite(score) || score < 0 || score > 10) return null;
  return score >= 9 ? {code:'A',label:'Xuất sắc'} : score >= 8 ? {code:'B',label:'Tốt'} :
    score >= 7 ? {code:'C',label:'Khá'} : {code:'D',label:'Cần bồi dưỡng'};
}

export function weightedEvaluationScore(tc1:number,tc2:number,tc3:number) {
  if (![tc1,tc2,tc3].every(score=>Number.isFinite(score)&&score>=0&&score<=10)) return null;
  return Number(((tc1+tc2*2+tc3)/4).toFixed(2));
}

export function averageEvaluationScore(records: Array<{overallScore?:number|null}>) {
  const scores=records.map(record=>record.overallScore).filter((score):score is number=>score!=null&&Number.isFinite(score)&&score>=0&&score<=10);
  return scores.length ? Number((scores.reduce((sum,score)=>sum+score,0)/scores.length).toFixed(2)) : null;
}
