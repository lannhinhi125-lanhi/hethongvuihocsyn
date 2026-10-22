import {isWorkEvidenceLink,workEvidenceLinks} from '../lib/workEvidence';

export function WorkEvidenceLinks({value}:{value?:string}) {
  const links=workEvidenceLinks(value);
  if (!links.length) return null;
  return <div className="text-xs text-indigo-600 space-y-1 break-all">
    <span className="font-medium">Minh chứng:</span>
    {links.map((link,index)=>isWorkEvidenceLink(link)
      ? <a key={index} href={link} target="_blank" rel="noopener noreferrer" className="block underline">{link}</a>
      : <span key={index} className="block">{link}</span>)}
  </div>;
}
