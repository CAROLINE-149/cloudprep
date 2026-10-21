export const toLocalInput=(iso:string)=>{const d=new Date(iso);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
export const fromLocalInput=(v:string)=>new Date(v).toISOString()
export const endOf=(s:{starts_at:string;duration_min:number})=>new Date(s.starts_at).getTime()+s.duration_min*6e4
export const label=(status:string,overdue:boolean)=>status==='completed'?'✓ Completed':overdue?'⚠ Missed':status==='skipped'?'– Skipped':'⏳ Upcoming'
