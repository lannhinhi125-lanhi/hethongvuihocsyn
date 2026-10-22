export type PauseCategory = {id:string;name:string;code?:string;subIncidents:{id?:string;code:string;name:string;status?:boolean;allowClassPause?:boolean;isScheduledBreak?:boolean;creditCoeff?:number}[]};
export type LessonPause = {pausedByClass?:boolean;pauseReason?:string|null;pauseCategoryId?:string|null;pauseNote?:string|null};
export const pauseReasonKey=(categoryId:string,reasonId:string)=>JSON.stringify([categoryId,reasonId]);
export function classPauseReasons(categories:PauseCategory[],activeOnly=false){
  return categories.flatMap(category=>category.subIncidents.filter(item=>item.allowClassPause&&(!activeOnly||item.status)).map(item=>({...item,id:item.id||item.code,categoryId:category.id,group:category.name,key:pauseReasonKey(category.id,item.id||item.code)})));
}
export function pauseReasonName(reason:string|null|undefined,categories:PauseCategory[],categoryId?:string|null):string{
  if(!reason)return 'Chưa ghi nhận lý do';
  const matches=categories.filter(category=>!categoryId||category.id===categoryId).flatMap(category=>category.subIncidents.filter(item=>(item.id||item.code)===reason));
  return matches.length===1?matches[0].name:reason;
}
export function lessonPauseLabel(lesson:LessonPause,categories:PauseCategory[]):string{
  return lesson.pausedByClass?'Tạm dừng lớp · '+pauseReasonName(lesson.pauseReason,categories,lesson.pauseCategoryId):'';
}
export function pauseReasonChoices(categories:PauseCategory[],records:LessonPause[]=[]){
  const choices=classPauseReasons(categories).map(item=>({value:item.key,label:item.name,group:item.group}));
  for(const row of records){
    if(!row.pauseReason||!row.pauseCategoryId)continue;
    const value=pauseReasonKey(row.pauseCategoryId,row.pauseReason);
    if(!choices.some(choice=>choice.value===value))choices.push({value,label:pauseReasonName(row.pauseReason,categories,row.pauseCategoryId),group:categories.find(category=>category.id===row.pauseCategoryId)?.name||'Lịch sử'});
  }
  return [{value:'__NONE__',label:'Không tạm dừng',group:''},{value:'__MISSING__',label:'Chưa ghi nhận lý do',group:''},...choices];
}
