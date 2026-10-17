type Row=Record<string,any>;

function indexRows(rows:Row[]) {
 const result=new Map<string,Row>();
 for(const row of rows){
  if(typeof row.madinhdanh!=='string' || !row.madinhdanh.trim())throw new Error('Bản ghi thiếu mã định danh. Hãy tải lại dữ liệu.');
  if(result.has(row.madinhdanh))throw new Error('Trùng mã định danh trong dữ liệu. Không thể cập nhật an toàn.');
  result.set(row.madinhdanh,row);
 }
 return result;
}

/** IDs are immutable. Existing rows send only fields changed by this edit. */
export function recordChanges(dataset:string,beforeRows:Row[],afterRows:Row[],storedRows:Row[]) {
 const before=indexRows(beforeRows),after=indexRows(afterRows),stored=indexRows(storedRows);
 const changes:{dataset:string;before:Row|null;after:Row|null}[]=[];
 for(const id of new Set([...before.keys(),...after.keys()])){
  const b=before.get(id),a=after.get(id),databaseRow=stored.get(id);
  if(JSON.stringify(b)===JSON.stringify(a))continue;
  if(!databaseRow){if(a)changes.push({dataset,before:null,after:a});continue;}
  if(!b)throw new Error('Thiếu phiên bản gốc của bản ghi. Hãy tải lại dữ liệu.');
  if(!a){changes.push({dataset,before:b,after:null});continue;}
  // Payroll is a queried aggregate; its RPC compares/writes related work rows.
  // It needs the period and original aggregate, rather than a scalar-row patch.
  if(dataset==='monthly_payroll'){changes.push({dataset,before:b,after:a});continue;}
  const previous:Row={madinhdanh:id},next:Row={madinhdanh:id};
  for(const field of new Set([...Object.keys(b),...Object.keys(a)])){
   if(field==='madinhdanh' || JSON.stringify(b[field])===JSON.stringify(a[field]))continue;
   previous[field]=Object.hasOwn(databaseRow,field)?databaseRow[field]:b[field]??null;
   next[field]=a[field]??null;
  }
  if(Object.keys(next).length>1)changes.push({dataset,before:previous,after:next});
 }
 return changes;
}
