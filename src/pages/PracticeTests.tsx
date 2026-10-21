import { useEffect, useMemo, useState } from 'react'; import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'; import { useAuth } from '../lib/auth'; import { AREA_LABEL } from '../lib/dashboard'; import { AREA_MID } from '../lib/readiness'
interface Opt{id:string;text:string;why_wrong?:string}
interface Q{id:string;topic_id:string;difficulty:string;stem:string;options:Opt[];correct:string[];explanation:string;area:string}
interface Hist{id:string;score_pct:number;submitted_at:string;question_count:number}
const shuffle=<T,>(a:T[])=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
const fmt=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
export default function PracticeTests(){const {session}=useAuth();const uid=session!.user.id
 const [pool,setPool]=useState<Q[]>([]);const [topics,setTopics]=useState<Record<string,string>>({});const [hist,setHist]=useState<Hist[]>([]);const [err,setErr]=useState('');const [ready,setReady]=useState(false)
 const [areas,setAreas]=useState<Set<string>>(new Set(Object.keys(AREA_MID)));const [len,setLen]=useState(20);const [mins,setMins]=useState(30)
 const [run,setRun]=useState<Q[]|null>(null);const [attempt,setAttempt]=useState('');const [i,setI]=useState(0);const [ans,setAns]=useState<Record<string,string>>({});const [flag,setFlag]=useState<Set<string>>(new Set())
 const [left,setLeft]=useState(0);const [paused,setPaused]=useState(false);const [done,setDone]=useState(false);const [saving,setSaving]=useState(false)
 const load=async()=>{const [q,t,h]=await Promise.all([supabase.from('questions').select('id,topic_id,difficulty,stem,options,correct,explanation,topics(skill_area,title)').limit(1000),supabase.from('topics').select('id,title'),supabase.from('attempts').select('id,score_pct,submitted_at,question_count').eq('kind','practice_test').not('submitted_at','is',null).order('submitted_at',{ascending:false}).limit(10)])
  if(q.error||t.error||h.error){setErr('Could not load practice test data.');return};setErr('')
  setPool((q.data??[]).map((x:any)=>({...x,area:x.topics?.skill_area})) as Q[]);setTopics(Object.fromEntries((t.data??[]).map(x=>[x.id,x.title])));setHist((h.data??[]) as Hist[]);setReady(true)}
 useEffect(()=>{load()},[])
 const avail=pool.filter(q=>areas.has(q.area)).length;const n=Math.min(len,avail)
 useEffect(()=>{setMins(Math.max(5,Math.ceil(n*1.5)))},[n])
 const ok=(q:Q)=>ans[q.id]===q.correct[0]
 const start=async()=>{if(n<1)return setErr('No questions available for those skill areas.');if(mins<5||mins>180)return setErr('Time limit must be 5–180 minutes.');setErr('')
  const sel=[...areas],tot=sel.reduce((a,k)=>a+AREA_MID[k],0);let chosen:Q[]=[]
  sel.forEach(k=>chosen.push(...shuffle(pool.filter(q=>q.area===k)).slice(0,Math.round(n*AREA_MID[k]/tot))))
  if(chosen.length<n){const ids=new Set(chosen.map(q=>q.id));chosen.push(...shuffle(pool.filter(q=>areas.has(q.area)&&!ids.has(q.id))).slice(0,n-chosen.length))}
  chosen=shuffle(chosen).slice(0,n)
  const r=await supabase.from('attempts').insert({kind:'practice_test',mode:'test',time_limit_min:mins,question_count:chosen.length}).select('id').single();if(r.error)return setErr('Could not start the test. Try again.')
  setAttempt(r.data.id);setRun(chosen.map(q=>({...q,options:shuffle(q.options)})));setI(0);setAns({});setFlag(new Set());setLeft(mins*60);setPaused(false);setDone(false)}
 const finish=async()=>{if(!run||saving)return;setSaving(true)
  const a=await supabase.from('attempt_answers').upsert(run.map(q=>({attempt_id:attempt,question_id:q.id,user_id:uid,answer:ans[q.id]??null,is_correct:ok(q),flagged:flag.has(q.id)})))
  const c=run.filter(ok).length
  const b=a.error?a:await supabase.from('attempts').update({submitted_at:new Date().toISOString(),score_pct:Math.round(1000*c/run.length)/10}).eq('id',attempt)
  setSaving(false);if(b.error)return setErr('Could not save your results. Press Submit again to retry.');setErr('');setDone(true)}
 useEffect(()=>{if(!run||done||paused)return;if(left<=0){finish();return};const t=setTimeout(()=>setLeft(l=>l-1),1000);return()=>clearTimeout(t)},[run,done,paused,left])
 const submit=()=>{const un=run!.filter(q=>!ans[q.id]).length;if(confirm(`Submit your test?\n${run!.length-un} answered, ${un} unanswered, ${flag.size} flagged.`))finish()}
 const view=(q:Q,show:boolean)=><div className="space-y-2"><p className="text-lg font-medium">{q.stem}</p><div role="radiogroup" aria-label="Answer choices" className="space-y-2">{q.options.map(o=>{const pick=ans[q.id]===o.id,right=q.correct.includes(o.id);const st=show?(right?'border-emerald-500 bg-emerald-500/10':pick?'border-red-500 bg-red-500/10':''):pick?'border-electric bg-electric/10':''
  return <button key={o.id} role="radio" aria-checked={pick} disabled={show} onClick={()=>setAns(a=>({...a,[q.id]:o.id}))} className={`w-full rounded-xl border p-3 text-left text-sm dark:border-white/15 ${st}`}>{show&&right&&'✓ '}{show&&pick&&!right&&'✗ '}{o.text}{show&&!right&&o.why_wrong&&<span className="block text-xs text-slate-500">{o.why_wrong}</span>}</button>})}</div>
  {show&&<p className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/10"><strong>{ok(q)?'✓ Correct. ':ans[q.id]?'✗ Incorrect. ':'Unanswered. '}</strong>{q.explanation}</p>}</div>
 const res=useMemo(()=>{if(!run||!done)return null;const g=(k:(q:Q)=>string)=>{const m=new Map<string,{c:number;n:number}>();run.forEach(q=>{const v=m.get(k(q))??{c:0,n:0};v.n++;if(ok(q))v.c++;m.set(k(q),v)});return [...m]};return {area:g(q=>q.area),topic:g(q=>q.topic_id),diff:g(q=>q.difficulty)}},[run,done,ans])
 if(!ready&&!err)return <p role="status">Loading…</p>
 if(run&&done&&res){const c=run.filter(ok).length;const weak=res.topic.filter(([,v])=>v.c/v.n<0.7)
  return <div className="mx-auto max-w-3xl space-y-4"><div className="card space-y-2"><h1 className="text-2xl font-bold">Result: {Math.round(100*c/run.length)}%</h1><p className="text-sm">{c} of {run.length} correct · {run.filter(q=>!ans[q.id]).length} unanswered</p>
   {[['By skill area',res.area.map(([k,v])=>[AREA_LABEL[k]??k,v])],['By difficulty',res.diff.map(([k,v])=>[k,v])]].map(([t,rows]:any)=><div key={t}><h2 className="mt-2 font-semibold">{t}</h2><ul className="text-sm">{rows.map(([k,v]:any)=><li key={k} className="capitalize">{k}: {v.c}/{v.n} ({Math.round(100*v.c/v.n)}%)</li>)}</ul></div>)}
   <h2 className="mt-2 font-semibold">Recommended next</h2>{weak.length?<ul className="list-disc pl-5 text-sm">{weak.map(([id,v])=><li key={id}>Revise <strong>{topics[id]}</strong> ({Math.round(100*v.c/v.n)}%)</li>)}</ul>:<p className="text-sm">No weak topics in this test. Keep practicing across all areas.</p>}
   <div className="flex flex-wrap gap-2"><Link className="btn-ghost" to="/app/quiz">Practice missed questions</Link><Link className="btn-ghost" to="/app/flashcards">Review flashcards</Link><Link className="btn-ghost" to="/app/progress">See progress</Link><button className="btn-primary" onClick={()=>{setRun(null);load()}}>Back to setup</button></div></div>
   {run.map((q,k)=><div key={q.id} className="card"><p className="mb-1 text-xs text-slate-500">Question {k+1} · {topics[q.topic_id]} · {q.difficulty}</p>{view(q,true)}</div>)}</div>}
 if(run){const q=run[i];return <div className="mx-auto max-w-3xl space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p role="timer" aria-label="Time remaining" className={`text-xl font-bold ${left<60?'text-red-600':''}`}>⏱ {fmt(left)}</p>
   <p className="text-sm" role="status">{Object.keys(ans).length} answered · {run.length-Object.keys(ans).length} unanswered · {flag.size} flagged</p><button className="btn-ghost !py-1.5" onClick={()=>setPaused(p=>!p)}>{paused?'Resume':'Pause'}</button></div>
   {paused?<div className="card text-center">⏸ Test paused. The timer is stopped. Resume when ready.</div>:<><div className="card"><div className="mb-2 flex justify-between text-xs text-slate-500"><span>Question {i+1} of {run.length}</span><span>{q.difficulty}</span></div>{view(q,false)}</div>
   <div className="flex flex-wrap gap-2"><button className="btn-ghost" disabled={i===0} onClick={()=>setI(i-1)}>Previous</button><button className="btn-ghost" disabled={i===run.length-1} onClick={()=>setI(i+1)}>Next</button>
    <button className="btn-ghost" aria-pressed={flag.has(q.id)} onClick={()=>setFlag(f=>{const n=new Set(f);n.has(q.id)?n.delete(q.id):n.add(q.id);return n})}>{flag.has(q.id)?'⚑ Flagged':'⚐ Flag for review'}</button><button className="btn-primary ml-auto" disabled={saving} onClick={submit}>{saving?'Submitting…':'Submit test'}</button></div>
   <nav aria-label="Question navigator" className="flex flex-wrap gap-1">{run.map((x,k)=><button key={x.id} onClick={()=>setI(k)} aria-label={`Question ${k+1}${ans[x.id]?', answered':', unanswered'}${flag.has(x.id)?', flagged':''}`} aria-current={k===i} className={`h-9 w-9 rounded-lg border text-xs dark:border-white/15 ${ans[x.id]?'bg-electric text-white':''} ${k===i?'ring-2 ring-violet2':''}`}>{k+1}{flag.has(x.id)&&'⚑'}</button>)}</nav></>}
   {err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}</div>}
 return <div className="mx-auto max-w-3xl space-y-4"><div><h1 className="text-2xl font-bold">Practice tests</h1><p className="text-sm text-slate-500">A timed practice experience with original questions. It does not reproduce the official exam interface, and lengths and time limits are yours to set.</p></div>
  <section className="card space-y-3" aria-label="Test setup"><fieldset><legend className="label">Skill areas</legend>{Object.keys(AREA_MID).map(k=><label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={areas.has(k)} onChange={()=>setAreas(s=>{const x=new Set(s);x.has(k)?x.delete(k):x.add(k);return x.size?x:s})}/>{AREA_LABEL[k]}</label>)}</fieldset>
   <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="ln">Number of questions</label><select id="ln" className="input" value={len} onChange={e=>setLen(+e.target.value)}>{[10,15,20,30,40].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
    <div><label className="label" htmlFor="tm">Time limit (minutes)</label><input id="tm" type="number" min={5} max={180} className="input" value={mins} onChange={e=>setMins(+e.target.value)}/></div></div>
   <p className="text-sm" role="status">{avail} questions available{avail<len?`. Your test will have ${n}, since the bank is small. More questions are added over time.`:'.'}</p>
   {err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}<button className="btn-primary" disabled={n<1} onClick={start}>Start test</button></section>
  <section aria-label="Previous attempts"><h2 className="mb-2 font-semibold">Previous attempts</h2>{hist.length?<ul className="space-y-1 text-sm">{hist.map(h=><li key={h.id} className="card !p-3 flex justify-between"><span>{new Date(h.submitted_at).toLocaleString()}</span><span>{h.score_pct}% · {h.question_count} questions</span></li>)}</ul>:<p className="text-sm text-slate-500">No practice tests completed yet.</p>}</section></div>}
