import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'; import { useAuth } from '../lib/auth'
import { loadDashboard, weakTopics, Session } from '../lib/dashboard'; import { generatePlan } from '../lib/planner'
import { endOf, fromLocalInput, label, toLocalInput } from '../lib/sessions'
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
interface Plan{id:string;exam_date:string;status:string}
type S=Session&{objective:string|null;activity:string|null}
export default function PlanPage(){const {session,profile,refreshProfile}=useAuth();const uid=session!.user.id
 const [plan,setPlan]=useState<Plan|null>(null);const [rows,setRows]=useState<S[]>([]);const [err,setErr]=useState('');const [warn,setWarn]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [ready,setReady]=useState(false)
 const [exam,setExam]=useState(profile?.exam_date??'');const [daily,setDaily]=useState(profile?.daily_goal_min??45);const [days,setDays]=useState<number[]>(profile?.study_days??[1,2,3,4,5])
 const load=useCallback(async()=>{const [p,s]=await Promise.all([supabase.from('study_plans').select('id,exam_date,status').neq('status','archived').order('created_at',{ascending:false}).limit(1),
  supabase.from('study_sessions').select('id,title,starts_at,duration_min,status,completed_at,actual_min,topic_id,objective,activity').order('starts_at').limit(1000)])
  if(p.error||s.error){setErr('Could not load your plan.');return}
  setErr('');setPlan((p.data?.[0] as Plan)??null);setRows((s.data??[]) as S[]);setReady(true)},[])
 useEffect(()=>{load()},[load])
 const generate=async()=>{setErr('');setWarn([]);const tomorrow=new Date(Date.now()+864e5).toISOString().slice(0,10)
  if(!exam||exam<tomorrow) return setErr('Choose an exam date in the future.')
  if(!days.length) return setErr('Pick at least one study day.'); if(daily<10||daily>480) return setErr('Daily minutes must be 10–480.')
  setBusy(true)
  try{const [t,dash]=await Promise.all([supabase.from('topics').select('id,title,objective').order('sort_order'),loadDashboard(uid)])
   if(t.error||!t.data?.length) throw new Error('No topics found. Run 002_seed_topics.sql first.')
   const weak=new Set(weakTopics(dash).map(w=>w.topic!.id)), conf=new Map(dash.status.map(s=>[s.topic_id,s.confidence??3]))
   const topics=t.data.map(x=>({id:x.id,title:x.title,objectives:(x.objective??'').split('\n').map((l:string)=>l.replace(/^- /,'')).filter(Boolean),conf:weak.has(x.id)?Math.min(2,conf.get(x.id)??3):conf.get(x.id)??3}))
   const now=new Date();const start=new Date();if(now.getHours()>=17) start.setDate(start.getDate()+1)
   const g=generatePlan({start,exam:new Date(exam+'T00:00:00'),dailyMin:daily,days,topics}); setWarn(g.warnings)
   if(!g.sessions.length) throw new Error(g.warnings[0]??'Could not build a plan.')
   const old=await supabase.from('study_plans').select('id').neq('status','archived')
   const ids=(old.data??[]).map(x=>x.id)
   if(ids.length){await supabase.from('study_sessions').delete().eq('status','planned').in('plan_id',ids);await supabase.from('study_plans').update({status:'archived'}).in('id',ids)}
   const np=await supabase.from('study_plans').insert({exam_date:exam,settings:{daily,days}}).select('id').single(); if(np.error) throw np.error
   const ins=await supabase.from('study_sessions').insert(g.sessions.map(s=>({...s,plan_id:np.data.id}))); if(ins.error) throw ins.error
   await supabase.from('profiles').update({exam_date:exam,daily_goal_min:daily,study_days:days}).eq('id',uid); await refreshProfile(); await load()
  }catch(e){setErr((e as Error).message||'Could not generate the plan.')}finally{setBusy(false)}}
 const patch=async(id:string,v:Record<string,unknown>)=>{const r=await supabase.from('study_sessions').update(v).eq('id',id);if(r.error)setErr('Could not save that change.');await load()}
 const del=async(id:string)=>{const r=await supabase.from('study_sessions').delete().eq('id',id);if(r.error)setErr('Could not delete.');await load()}
 const togglePause=async()=>{if(!plan)return;await supabase.from('study_plans').update({status:plan.status==='paused'?'active':'paused'}).eq('id',plan.id);await load()}
 const now=Date.now(),isOver=(s:S)=>s.status==='planned'&&endOf(s)<now
 const overdue=rows.filter(isOver),upcoming=rows.filter(s=>s.status==='planned'&&!isOver(s)),done=rows.filter(s=>s.status==='completed')
 const row=(s:S)=><li key={s.id} className="card !p-3 space-y-2"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{s.title}</p>{s.objective&&<p className="text-xs text-slate-500">Goal: {s.objective}</p>}{s.activity&&<p className="text-xs text-slate-500">Do: {s.activity}</p>}</div><span className="text-xs font-medium">{label(s.status,isOver(s))}</span></div>
  <div className="flex flex-wrap items-center gap-2 text-sm"><label className="sr-only" htmlFor={`t${s.id}`}>Date and time</label><input id={`t${s.id}`} type="datetime-local" className="input !w-auto" defaultValue={toLocalInput(s.starts_at)} onBlur={e=>e.target.value&&fromLocalInput(e.target.value)!==s.starts_at&&patch(s.id,{starts_at:fromLocalInput(e.target.value),status:'planned'})}/>
   <label className="sr-only" htmlFor={`d${s.id}`}>Minutes</label><input id={`d${s.id}`} type="number" min={5} max={480} className="input !w-20" defaultValue={s.duration_min} onBlur={e=>{const n=+e.target.value;n>=5&&n<=480&&n!==s.duration_min&&patch(s.id,{duration_min:n})}}/> min
   {s.status!=='completed'?<button className="btn-primary !py-1.5" onClick={()=>patch(s.id,{status:'completed',completed_at:new Date().toISOString(),actual_min:s.duration_min})}>Mark complete</button>:<button className="btn-ghost !py-1.5" onClick={()=>patch(s.id,{status:'planned',completed_at:null,actual_min:null})}>Undo</button>}
   <button className="btn-ghost !py-1.5" onClick={()=>del(s.id)}>Delete</button></div></li>
 if(!ready&&!err) return <p role="status">Loading…</p>
 return <div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-bold">Study plan</h1>
  <section className="card space-y-4" aria-label="Plan settings"><h2 className="font-semibold">{plan?'Adjust and regenerate':'Create your plan'}</h2>
   <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="ex">Exam date</label><input id="ex" type="date" className="input" value={exam} onChange={e=>setExam(e.target.value)}/></div>
    <div><label className="label" htmlFor="dm">Minutes per study day</label><input id="dm" type="number" min={10} max={480} className="input" value={daily} onChange={e=>setDaily(+e.target.value)}/></div></div>
   <fieldset><legend className="label">Study days</legend><div className="flex flex-wrap gap-2">{DAYS.map((l,i)=><button key={l} type="button" aria-pressed={days.includes(i)} onClick={()=>setDays(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i].sort())} className={`btn !px-3 !py-1.5 ${days.includes(i)?'bg-electric text-white':'btn-ghost'}`}>{days.includes(i)?'✓ ':''}{l}</button>)}</div></fieldset>
   <p className="text-xs text-slate-500">Topics you rate low or miss in quizzes get more time. Completed sessions are kept; unfinished ones are replaced.</p>
   <div className="flex gap-2"><button className="btn-primary" disabled={busy} onClick={generate}>{busy?'Generating…':plan?'Regenerate plan':'Generate plan'}</button>{plan&&<button className="btn-ghost" onClick={togglePause}>{plan.status==='paused'?'Resume plan':'Pause plan'}</button>}</div>
   {err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}{warn.map(w=><p key={w} role="status" className="text-sm text-amber-600">⚠ {w}</p>)}</section>
  {plan?.status==='paused'&&<p role="status" className="card text-sm">⏸ Your plan is paused. Resume it when you’re ready.</p>}
  {overdue.length>0&&<section><h2 className="mb-2 font-semibold text-amber-600">Overdue ({overdue.length})</h2><ul className="space-y-2">{overdue.map(row)}</ul></section>}
  <section><h2 className="mb-2 font-semibold">Upcoming ({upcoming.length})</h2>{upcoming.length?<ul className="space-y-2">{upcoming.map(row)}</ul>:<p className="text-sm text-slate-500">No upcoming sessions yet.</p>}</section>
  {done.length>0&&<details><summary className="cursor-pointer font-semibold">Completed ({done.length})</summary><ul className="mt-2 space-y-2">{done.map(row)}</ul></details>}</div>}
