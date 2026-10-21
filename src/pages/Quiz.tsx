import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'; import { useAuth } from '../lib/auth'
interface Opt{id:string;text:string;why_wrong?:string}
interface Q{id:string;topic_id:string;qtype:string;difficulty:string;stem:string;options:Opt[];correct:string[];explanation:string}
interface Topic{id:string;title:string}
const shuffle=<T,>(a:T[])=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
export default function Quiz(){const {session}=useAuth();const uid=session!.user.id
 const [qs,setQs]=useState<Q[]>([]);const [topics,setTopics]=useState<Topic[]>([]);const [seen,setSeen]=useState<Map<string,{ok:number;bad:number}>>(new Map());const [saved,setSaved]=useState<Set<string>>(new Set())
 const [err,setErr]=useState('');const [ready,setReady]=useState(false)
 const [sel,setSel]=useState<Set<string>>(new Set());const [diff,setDiff]=useState('');const [count,setCount]=useState(10);const [mode,setMode]=useState<'learning'|'test'>('learning');const [src,setSrc]=useState('all')
 const [run,setRun]=useState<Q[]|null>(null);const [attempt,setAttempt]=useState('');const [i,setI]=useState(0);const [ans,setAns]=useState<Record<string,string>>({});const [checked,setChecked]=useState<Set<string>>(new Set());const [done,setDone]=useState(false)
 const load=async()=>{const [q,t,a,s]=await Promise.all([supabase.from('questions').select('id,topic_id,qtype,difficulty,stem,options,correct,explanation').limit(1000),supabase.from('topics').select('id,title').order('sort_order'),supabase.from('attempt_answers').select('question_id,is_correct').limit(5000),supabase.from('saved_questions').select('question_id')])
  if(q.error||t.error||a.error||s.error){setErr('Could not load questions.');return};setErr('')
  setQs((q.data??[]) as Q[]);setTopics(t.data??[]);setSaved(new Set((s.data??[]).map(x=>x.question_id)))
  const m=new Map<string,{ok:number;bad:number}>();(a.data??[]).forEach(x=>{const v=m.get(x.question_id)??{ok:0,bad:0};x.is_correct?v.ok++:v.bad++;m.set(x.question_id,v)});setSeen(m);setReady(true)}
 useEffect(()=>{load()},[])
 const pool=useMemo(()=>qs.filter(q=>(!sel.size||sel.has(q.topic_id))&&(!diff||q.difficulty===diff)&&(src==='all'||(src==='new'&&!seen.has(q.id))||(src==='missed'&&(seen.get(q.id)?.bad??0)>0)||(src==='saved'&&saved.has(q.id)))),[qs,sel,diff,src,seen,saved])
 const start=async()=>{if(!pool.length)return setErr('No questions match these filters.');setErr('')
  const r=await supabase.from('attempts').insert({kind:'bank_practice',mode,question_count:Math.min(count,pool.length)}).select('id').single();if(r.error)return setErr('Could not start the quiz. Try again.')
  setAttempt(r.data.id);setRun(shuffle(pool).slice(0,count).map(q=>({...q,options:q.qtype==='true_false'?q.options:shuffle(q.options)})));setI(0);setAns({});setChecked(new Set());setDone(false)}
 const ok=(q:Q)=>ans[q.id]===q.correct[0]
 const persist=(qq:Q[])=>supabase.from('attempt_answers').upsert(qq.map(q=>({attempt_id:attempt,question_id:q.id,user_id:uid,answer:ans[q.id]??null,is_correct:ok(q)})))
 const check=async()=>{const q=run![i];setChecked(c=>new Set(c).add(q.id));const r=await persist([q]);if(r.error)setErr('Could not save that answer.')}
 const finish=async()=>{if(mode==='test'){const r=await persist(run!);if(r.error)return setErr('Could not save your answers. Try submitting again.')}
  const n=run!.filter(ok).length;const r=await supabase.from('attempts').update({submitted_at:new Date().toISOString(),score_pct:Math.round(1000*n/run!.length)/10,question_count:run!.length}).eq('id',attempt);if(r.error)return setErr('Could not save your score. Try again.');setErr('');setDone(true)}
 const toggleSave=async(id:string)=>{const has=saved.has(id);const r=has?await supabase.from('saved_questions').delete().eq('question_id',id):await supabase.from('saved_questions').insert({user_id:uid,question_id:id});if(r.error)return setErr('Could not update saved questions.');setSaved(s=>{const n=new Set(s);has?n.delete(id):n.add(id);return n})}
 const reveal=(q:Q)=>mode==='learning'?checked.has(q.id):done
 const body=(q:Q,show:boolean)=><div className="space-y-2"><p className="text-lg font-medium">{q.stem}</p>
  <div role="radiogroup" aria-label="Answer choices" className="space-y-2">{q.options.map(o=>{const pick=ans[q.id]===o.id,right=q.correct.includes(o.id);const st=show?(right?'border-emerald-500 bg-emerald-500/10':pick?'border-red-500 bg-red-500/10':''):pick?'border-electric bg-electric/10':''
   return <button key={o.id} role="radio" aria-checked={pick} disabled={show} onClick={()=>setAns(a=>({...a,[q.id]:o.id}))} className={`w-full rounded-xl border p-3 text-left text-sm dark:border-white/15 ${st}`}>{show&&right&&'✓ '}{show&&pick&&!right&&'✗ '}{o.text}{show&&!right&&o.why_wrong&&<span className="block text-xs text-slate-500">{o.why_wrong}</span>}</button>})}</div>
  {show&&<p role="status" className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/10"><strong>{ok(q)?'✓ Correct. ':ans[q.id]?'✗ Not quite. ':'No answer. '}</strong>{q.explanation}</p>}</div>
 if(!ready&&!err)return <p role="status">Loading…</p>
 if(run&&done){const by=new Map<string,{c:number;n:number}>();run.forEach(q=>{const v=by.get(q.topic_id)??{c:0,n:0};v.n++;if(ok(q))v.c++;by.set(q.topic_id,v)});const n=run.filter(ok).length
  return <div className="mx-auto max-w-3xl space-y-4"><div className="card"><h1 className="text-2xl font-bold">Score: {Math.round(100*n/run.length)}%</h1><p className="text-sm">{n} of {run.length} correct</p>
   <ul className="mt-2 space-y-1 text-sm">{[...by].map(([id,v])=><li key={id}>{topics.find(t=>t.id===id)?.title}: {v.c}/{v.n}</li>)}</ul><button className="btn-primary mt-3" onClick={()=>{setRun(null);load()}}>Back to setup</button></div>
   {run.map((q,k)=><div key={q.id} className="card"><p className="mb-1 text-xs text-slate-500">Question {k+1} · {topics.find(t=>t.id===q.topic_id)?.title} · {q.difficulty}</p>{body(q,true)}</div>)}</div>}
 if(run){const q=run[i],last=i===run.length-1,shown=reveal(q)
  return <div className="mx-auto max-w-2xl space-y-3"><div className="flex justify-between text-sm text-slate-500"><span>Question {i+1} of {run.length} · {mode==='test'?'Test mode':'Learning mode'}</span><span>{q.difficulty}</span></div>
   <div className="card">{body(q,shown)}</div>{err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}
   <div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={()=>toggleSave(q.id)} aria-pressed={saved.has(q.id)}>{saved.has(q.id)?'★ Saved':'☆ Save'}</button>
    {mode==='test'&&<button className="btn-ghost" disabled={i===0} onClick={()=>setI(i-1)}>Previous</button>}
    {mode==='learning'&&!shown&&<button className="btn-primary" disabled={!ans[q.id]} onClick={check}>Check answer</button>}
    {(mode==='test'||shown)&&!last&&<button className="btn-primary" onClick={()=>setI(i+1)}>Next</button>}
    {(mode==='test'||shown)&&last&&<button className="btn-primary" onClick={()=>{const un=run.filter(x=>!ans[x.id]).length;if(mode==='test'&&un&&!confirm(`${un} question(s) unanswered. Submit anyway?`))return;finish()}}>Finish</button>}
    <button className="btn-ghost ml-auto" onClick={()=>{if(confirm('Leave this quiz? Progress in test mode will be lost.')){setRun(null);load()}}}>Quit</button></div></div>}
 return <div className="mx-auto max-w-3xl space-y-4"><div><h1 className="text-2xl font-bold">AZ-900-style practice questions</h1><p className="text-sm text-slate-500">Original practice questions, not real exam questions.</p></div>
  <section className="card space-y-4" aria-label="Quiz setup">
   <fieldset><legend className="label">Topics (none selected = all)</legend><div className="grid gap-1 sm:grid-cols-2">{topics.map(t=><label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.has(t.id)} onChange={()=>setSel(s=>{const n=new Set(s);n.has(t.id)?n.delete(t.id):n.add(t.id);return n})}/>{t.title}</label>)}</div></fieldset>
   <div className="grid gap-3 sm:grid-cols-4">
    <div><label className="label" htmlFor="df">Difficulty</label><select id="df" className="input" value={diff} onChange={e=>setDiff(e.target.value)}><option value="">Any</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
    <div><label className="label" htmlFor="ct">Questions</label><select id="ct" className="input" value={count} onChange={e=>setCount(+e.target.value)}>{[5,10,15,20].map(n=><option key={n}>{n}</option>)}</select></div>
    <div><label className="label" htmlFor="sr">Which questions</label><select id="sr" className="input" value={src} onChange={e=>setSrc(e.target.value)}><option value="all">All</option><option value="new">Not attempted</option><option value="missed">Previously missed</option><option value="saved">Saved</option></select></div>
    <div><label className="label" htmlFor="md">Mode</label><select id="md" className="input" value={mode} onChange={e=>setMode(e.target.value as 'learning'|'test')}><option value="learning">Learning (instant feedback)</option><option value="test">Test (feedback at end)</option></select></div></div>
   <p className="text-sm" role="status">{pool.length} matching question{pool.length===1?'':'s'}</p>{err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}
   <button className="btn-primary" disabled={!pool.length} onClick={start}>Start quiz</button>
   {!qs.length&&<p className="text-sm text-amber-600">No questions found. Run 004_seed_questions.sql in Supabase.</p>}
   <p className="text-xs text-slate-500">AI-generated quizzes from your notes arrive with the AI setup (step 8).</p></section></div>}
