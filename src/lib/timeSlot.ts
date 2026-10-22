/** Form preview only. Supabase owns the saved clocks and queried duration. */
export function timeSlotPreview(start:string,end:string) {
 const valid=(value:string)=>/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
 if(!valid(start)||!valid(end))return {timeRange:'',durationMinutes:0};
 const minutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
 const durationMinutes=(minutes(end)-minutes(start)+1440)%1440;
 return {timeRange:`${start} - ${end}`,durationMinutes};
}
