import {Fragment,type ReactNode} from 'react';

/** Basic emphasis/lists only. Model text is never interpreted as HTML. */
function inline(text:string):ReactNode[] {
  return text.split(/(\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g).map((part,index)=>{
    if(part.startsWith('***')&&part.endsWith('***'))return <strong key={index}><em>{part.slice(3,-3)}</em></strong>;
    if(part.startsWith('**')&&part.endsWith('**'))return <strong key={index}>{part.slice(2,-2)}</strong>;
    if(part.startsWith('*')&&part.endsWith('*')&&part.length>2)return <em key={index}>{part.slice(1,-1)}</em>;
    if(part.startsWith('`')&&part.endsWith('`'))return <code key={index} className="rounded bg-black/5 px-1">{part.slice(1,-1)}</code>;
    return part;
  });
}
export function ChatMessageText({text,format=true}:{text:string;format?:boolean}) {
  if(!format)return <p className="whitespace-pre-wrap break-words">{text}</p>;
  return <div className="space-y-1 whitespace-pre-wrap break-words">{text.split('\n').map((line,index)=>{
    if(/^\s*(\*\s*){3,}$/.test(line)||/^\s*-{3,}\s*$/.test(line))return <hr key={index} className="my-2 border-current opacity-20" />;
    const heading=line.match(/^#{1,6}\s+(.+)$/);
    if(heading)return <p key={index} className="font-semibold">{inline(heading[1])}</p>;
    const item=line.match(/^\s*[-*+]\s+(.+)$/);
    if(item)return <div key={index} className="flex gap-1.5"><span aria-hidden="true">•</span><span>{inline(item[1])}</span></div>;
    return <Fragment key={index}><p>{line?inline(line):'\u00a0'}</p></Fragment>;
  })}</div>;
}
