import { useCallback, useEffect, useMemo, useState } from 'react'; import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'; import { endOf, fromLocalInput, label, toLocalInput } from '../lib/sessions'; import { localDay } from '../lib/dashboard'
interface Item{key:string;kind:'session'|'event';id:string;title:string;start:Date;min:number;status?:string}
type View='month'|'week'|'day'
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x}
const weekStart=(d:Date)=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-x.getDay());return x}
export default function CalendarPage(){
 const [view,setView]=useState<View>('month');const [cur,setCur]=useState(new Date());const [items,setItems]=useState<Item[]>([]);const [err,setErr]=useState('')
 const [edit,setEdit]=useState<Partial<Item>&{repeat?:number}|null>(null)
 const load=useCallback(async()=>{const [s,e]=await Promise.all([supabase.from('study_sessions').select('id,title,starts_at,duration_min,status').limit(1000),supabase.from('calendar_events').select('id,title,starts_at,ends_at,session_id').is('session_id',null).limit(1000)])
  if(s.error||e.error){setErr('Could not load the calendar.');return}; setErr('')
  setItems([...(s.data??[]).map(x=>({key:'s'+x.id,kind:'session' as const,id:x.id,title:x.title,start:new Date(x.starts_at),min:x.duration_min,status:x.status})),
   ...(e.data??[]).map(x=>({key:'e'+x.id,kind:'event' as const,id:x.id,title:x.title,start:new Date(x.starts_at),min:Math.round((+new Date(x.ends_at)-+new Date(x.starts_at))/6e4)}))])},[])
 useEffect(()=>{load()},[load])
 const on=(d:Date)=>items.filter(i=>localDay(i.start)===localDay(d)).sort((a,b)=>+a.start-+b.start)
 const goal=useMemo(()=>{const m=new Map<string,number>();items.forEach(i=>{if(i.kind==='session'&&i.status!=='skipped'){const k=localDay(i.start);m.set(k,(m.get(k)??0)+i.min)}});return m},[items])
 const step=(n:number)=>{const d=new Date(cur);view==='month'?d.setMonth(d.getMonth()+n):d.setDate(d.getDate()+(view==='week'?7*n:n));setCur(d)}
 const stat=(i:Item)=>{if(i.kind==='event')return '📌';const over=i.status==='planned'&&endOf({starts_at:i.start.toISOString(),duration_min:i.min})<Date.now();return label(i.status!,over).split(' ')[0]}
 const chip=(i:Item)=><button key={i.key} onClick={()=>setEdit(i)} className="block w-full truncate rounded-md bg-electric/10 px-1.5 py-0.5 text-left text-xs hover:bg-electric/20" title={`${i.title} · ${i.min} min`}>{stat(i)} {i.start.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} {i.title}</button>
 const cell=(d:Date,max=3)=>{const l=on(d);return <div key={+d} className="min-h-24 rounded-lg border border-slate-200 p-1 dark:border-white/10"><button className={`text-xs font-semibold ${localDay(d)===localDay(new Date())?'text-electric':''}`} onClick={()=>{setCur(d);setView('day')}}>{d.getDate()}</button>{goal.get(localDay(d))?<span className="ml-1 text-[10px] text-slate-500">{goal.get(localDay(d))}m</span>:null}
  <div className="mt-1 space-y-0.5">{l.slice(0,max).map(chip)}{l.length>max&&<p className="text-[10px] text-slate-500">+{l.length-max} more</p>}</div></div>}
 const save=async()=>{const e=edit!;if(!e.title?.trim()||!e.start||!(e.min&&e.min>=5&&e.min<=480))return setErr('Enter a title, start time and 5–480 minutes.');setErr('')
  const n=e.id?1:Math.min(26,Math.max(1,e.repeat??1));let bad=false
  for(let k=0;k<n;k++){const st=addDays(e.start,7*k),base={title:e.title.trim(),starts_at:st.toISOString()}
   const r=e.kind==='event'?(e.id?supabase.from('calendar_events').update({...base,ends_at:new Date(+st+e.min*6e4).toISOString()}).eq('id',e.id):supabase.from('calendar_events').insert({...base,ends_at:new Date(+st+e.min*6e4).toISOString(),recurrence_rule:n>1?'weekly':null}))
    :(e.id?supabase.from('study_sessions').update({...base,duration_min:e.min,status:e.status}).eq('id',e.id):supabase.from('study_sessions').insert({...base,duration_min:e.min,recurrence_rule:n>1?'weekly':null}))
   if((await r).error)bad=true}
  if(bad)return setErr('Some changes could not be saved.');setEdit(null);load()}
 const remove=async()=>{const e=edit!;const r=await supabase.from(e.kind==='event'?'calendar_events':'study_sessions').delete().eq('id',e.id!);if(r.error)return setErr('Could not delete.');setEdit(null);load()}
 const ws=weekStart(cur),title=view==='month'?cur.toLocaleDateString([], {month:'long',year:'numeric'}):view==='week'?`Week of ${ws.toLocaleDateString([], {month:'short',day:'numeric'})}`:cur.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'})
 const first=weekStart(new Date(cur.getFullYear(),cur.getMonth(),1))
 return <div className="mx-auto max-w-5xl space-y-4"><div className="flex flex-wrap items-center gap-2"><h1 className="mr-auto text-2xl font-bold">Calendar</h1>
  <div role="group" aria-label="View" className="flex gap-1">{(['month','week','day'] as View[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>setView(v)} className={`btn !px-3 !py-1.5 capitalize ${view===v?'bg-electric text-white':'btn-ghost'}`}>{v}</button>)}</div>
  <button className="btn-primary" onClick={()=>{const d=new Date(cur);d.setHours(18,0,0,0);setEdit({kind:'session',title:'',start:d,min:30,status:'planned',repeat:1})}}><Plus size={16}/>Add</button></div>
  <div className="flex items-center gap-2"><button className="btn-ghost !p-2" aria-label="Previous" onClick={()=>step(-1)}><ChevronLeft size={18}/></button><button className="btn-ghost !py-1.5" onClick={()=>setCur(new Date())}>Today</button><button className="btn-ghost !p-2" aria-label="Next" onClick={()=>step(1)}><ChevronRight size={18}/></button><h2 className="ml-2 font-semibold">{title}</h2></div>
  {err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}
  <p className="text-xs text-slate-500">✓ completed · ⏳ upcoming · ⚠ missed · 📌 custom event. Numbers show planned minutes per day. Study plan sessions appear here automatically.</p>
  {view==='month'&&<div className="overflow-x-auto"><div className="grid min-w-[640px] grid-cols-7 gap-1">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="text-center text-xs text-slate-500">{d}</div>)}{Array.from({length:42},(_,i)=>cell(addDays(first,i)))}</div></div>}
  {view==='week'&&<div className="overflow-x-auto"><div className="grid min-w-[640px] grid-cols-7 gap-1">{Array.from({length:7},(_,i)=>cell(addDays(ws,i),20))}</div></div>}
  {view==='day'&&<div className="card space-y-2">{on(cur).length?on(cur).map(i=><button key={i.key} onClick={()=>setEdit(i)} className="flex w-full justify-between rounded-lg p-2 text-left hover:bg-slate-100 dark:hover:bg-white/10"><span>{stat(i)} {i.title}</span><span className="text-sm text-slate-500">{i.start.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · {i.min} min</span></button>):<p className="text-sm text-slate-500">Nothing scheduled this day.</p>}</div>}
  {edit&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Edit item"><div className="card w-full max-w-md space-y-3">
   <h2 className="font-semibold">{edit.id?'Edit':'Add'} {edit.kind==='event'?'event':'study session'}</h2>
   {!edit.id&&<div className="flex gap-2">{(['session','event'] as const).map(k=><button key={k} aria-pressed={edit.kind===k} className={`btn !py-1.5 ${edit.kind===k?'bg-electric text-white':'btn-ghost'}`} onClick={()=>setEdit({...edit,kind:k})}>{k==='session'?'Study session':'Custom event / reminder'}</button>)}</div>}
   <div><label className="label" htmlFor="et">Title</label><input id="et" className="input" maxLength={120} value={edit.title??''} onChange={e=>setEdit({...edit,title:e.target.value})}/></div>
   <div><label className="label" htmlFor="es">Starts</label><input id="es" type="datetime-local" className="input" value={edit.start?toLocalInput(edit.start.toISOString()):''} onChange={e=>e.target.value&&setEdit({...edit,start:new Date(fromLocalInput(e.target.value))})}/></div>
   <div><label className="label" htmlFor="em">Duration (minutes)</label><input id="em" type="number" min={5} max={480} className="input" value={edit.min??''} onChange={e=>setEdit({...edit,min:+e.target.value})}/></div>
   {edit.id&&edit.kind==='session'&&<div><label className="label" htmlFor="est">Status</label><select id="est" className="input" value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}><option value="planned">Planned</option><option value="completed">Completed</option><option value="skipped">Skipped</option></select></div>}
   {!edit.id&&<div><label className="label" htmlFor="er">Repeat weekly for (times)</label><input id="er" type="number" min={1} max={26} className="input" value={edit.repeat??1} onChange={e=>setEdit({...edit,repeat:+e.target.value})}/></div>}
   {err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}
   <div className="flex justify-between"><div>{edit.id&&<button className="btn-ghost" onClick={remove}>Delete</button>}</div><div className="flex gap-2"><button className="btn-ghost" onClick={()=>{setEdit(null);setErr('')}}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></div></div></div></div>}</div>}
