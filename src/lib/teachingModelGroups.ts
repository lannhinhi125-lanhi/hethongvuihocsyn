export const teachingModelGroup = (code:string) => /^1[-–]([2-9]|[1-9][0-9]+)$/i.test(code.trim()) || /^1-n$/i.test(code.trim()) ? '1-N' : code;
export const teachingModelGroups = (codes:string[]) => [...new Set(codes.map(teachingModelGroup))];
export const matchesTeachingModelGroup = (codes:string[],group:string) => teachingModelGroups(codes).includes(group);
export const isTeachingModelParent = (code:string) => /^1-n$/i.test(code.trim());
export const canTeachClassModel = (codes:string[]|undefined,model:string) => !isTeachingModelParent(model) && Boolean(codes?.includes(model));

export const matchesTeachingModelFilter = (codes:string[],value:string) =>
  isTeachingModelParent(value) ? matchesTeachingModelGroup(codes,'1-N') : codes.includes(value);
export const teachingModelFilterOptions = (codes:string[]) => teachingModelGroups(codes).flatMap(group=>{
  if(group!=='1-N')return [{value:group,label:group}];
  const children=[...new Set(codes.filter(code=>!isTeachingModelParent(code) && teachingModelGroup(code)==='1-N'))]
    .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  return [{value:'1-N',label:'1-N (tất cả nhóm con)'},...children.map(code=>({value:code,label:'↳ '+code}))];
});
