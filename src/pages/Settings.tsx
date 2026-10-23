import { FormEvent, useState } from 'react'; import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'; import { useAuth } from '../lib/auth'; import { DISCLAIMER } from '../components/Disclaimer'
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export default function Settings(){const {session,profile,refreshProfile}=useAuth();const uid=session!.user.id;const [sp]=useSearchParams()
 const [name,setName]=useState(profile?.display_name??'');const [exam,setExam]=useState(profile?.exam_date??'');const [goal,setGoal]=useState(profile?.daily_goal_min??45)
 const [days,setDays]=useState<number[]>(profile?.study_days??[1,2,3,4,5]);const [level,setLevel]=useState(profile?.knowledge_level??'beginner');const [msg,setMsg]=useState<{ok:boolean;t:string}|null>(null)
 const [pw,setPw]=useState('');const [pw2,setPw2]=useState('');const [pm,setPm]=useState<{ok:boolean;t:string}|null>(null);const [busy,setBusy]=useState(false)
 const save=async(e:FormEvent)=>{e.preventDefault();setMsg(null)
  if(days.length===0)return setMsg({ok:false,t:'Pick at least one study day.'});if(goal<10||goal>480)return setMsg({ok:false,t:'Daily goal must be 10–480 minutes.'})
  const r=await supabase.from('profiles').update({display_name:name.trim()||null,exam_date:exam||null,daily_goal_min:goal,study_days:days,knowledge_level:level}).eq('id',uid)
  if(r.error)return setMsg({ok:false,t:'Could not save your settings.'});await refreshProfile();setMsg({ok:true,t:'Saved. If you changed your exam date or study time, regenerate your study plan so it adapts.'})}
 const changePw=async(e:FormEvent)=>{e.preventDefault();setPm(null);if(pw.length<8)return setPm({ok:false,t:'Password must be at least 8 characters.'});if(pw!==pw2)return setPm({ok:false,t:'Passwords do not match.'})
  setBusy(true);const r=await supabase.auth.updateUser({password:pw});setBusy(false);if(r.error)return setPm({ok:false,t:r.error.message});setPw('');setPw2('');setPm({ok:true,t:'Password updated.'})}
 const exp=async()=>{const t=['notes','flashcards','study_sessions','attempts','attempt_answers','game_sessions','conversations','messages','tutor_sessions'];const res=await Promise.all(t.map(x=>supabase.from(x).select('*').limit(5000)))
  if(res.some(r=>r.error))return setMsg({ok:false,t:'Could not export your data.'});const o:Record<string,unknown>={profile};t.forEach((k,i)=>o[k]=res[i].data)
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)],{type:'application/json'}));a.download='cloudprep-data.json';a.click();URL.revokeObjectURL(a.href)}
 return <div className="mx-auto max-w-2xl space-y-5"><h1 className="text-2xl font-bold">Settings</h1>
  {sp.get('recovery')&&<p role="status" className="card text-sm">You signed in from a password-reset link. Choose a new password below.</p>}
  <form onSubmit={save} className="card space-y-4" aria-label="Profile"><h2 className="font-semibold">Profile and study preferences</h2>
   <div><label className="label" htmlFor="sn">Display name</label><input id="sn" className="input" maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></div>
   <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="se">Exam date</label><input id="se" type="date" className="input" value={exam} onChange={e=>setExam(e.target.value)}/></div>
    <div><label className="label" htmlFor="sg">Daily study goal (minutes)</label><input id="sg" type="number" min={10} max={480} className="input" value={goal} onChange={e=>setGoal(+e.target.value)}/></div></div>
   <fieldset><legend className="label">Study days</legend><div className="flex flex-wrap gap-2">{DAYS.map((l,i)=><button type="button" key={l} aria-pressed={days.includes(i)} onClick={()=>setDays(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i].sort())} className={`btn !px-3 !py-1.5 ${days.includes(i)?'bg-electric text-white':'btn-ghost'}`}>{days.includes(i)?'✓ ':''}{l}</button>)}</div></fieldset>
   <div><label className="label" htmlFor="sl">Knowledge level</label><select id="sl" className="input" value={level} onChange={e=>setLevel(e.target.value)}><option value="beginner">Complete beginner</option><option value="some">Some experience</option><option value="comfortable">Fairly comfortable</option></select></div>
   {msg&&<p role="status" className={`text-sm ${msg.ok?'text-emerald-600':'text-red-600'}`}>{msg.ok?'✓ ':'⚠ '}{msg.t}</p>}<button className="btn-primary">Save settings</button></form>
  <form onSubmit={changePw} className="card space-y-3" aria-label="Change password"><h2 className="font-semibold">Change password</h2>
   <div><label className="label" htmlFor="p1">New password</label><input id="p1" type="password" autoComplete="new-password" className="input" value={pw} onChange={e=>setPw(e.target.value)}/></div>
   <div><label className="label" htmlFor="p2">Confirm new password</label><input id="p2" type="password" autoComplete="new-password" className="input" value={pw2} onChange={e=>setPw2(e.target.value)}/></div>
   {pm&&<p role="status" className={`text-sm ${pm.ok?'text-emerald-600':'text-red-600'}`}>{pm.ok?'✓ ':'⚠ '}{pm.t}</p>}<button className="btn-primary" disabled={busy}>{busy?'Updating…':'Update password'}</button></form>
  <section className="card space-y-2"><h2 className="font-semibold">Your data</h2><p className="text-sm text-slate-500">Download a copy of your notes, cards, sessions, quiz history and AI conversations.</p><button className="btn-ghost" onClick={exp}>Download my data (JSON)</button></section>
  <section className="card space-y-2" aria-label="About"><h2 className="font-semibold">About CloudPrep AI</h2><p className="text-sm">{DISCLAIMER}</p><p className="text-sm text-slate-500">Readiness estimates are educational indicators, not official scores. AI answers can be wrong, so verify important facts on Microsoft Learn.</p></section></div>}
