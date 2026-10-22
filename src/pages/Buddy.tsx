import { useEffect, useState } from 'react'; import { useLocation } from 'react-router-dom'; import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'; import { useAuth } from '../lib/auth'; import { askAI, AIError } from '../lib/ai'; import Chat, { Bubble } from '../components/Chat'
interface Conv{id:string;title:string}
const PROMPTS=['Explain Azure regions like I’m a beginner.','What is the difference between IaaS, PaaS, and SaaS?','Explain Azure storage options using a real-life example.','Help me understand shared responsibility.','Give me an example of Azure RBAC.','Explain cloud scalability using a Kenyan online shop during a holiday sale.']
export default function Buddy(){const {session}=useAuth();const uid=session!.user.id;const pre=(useLocation().state as {prompt?:string}|null)?.prompt
 const [convs,setConvs]=useState<Conv[]>([]);const [cur,setCur]=useState<string|null>(null);const [msgs,setMsgs]=useState<Bubble[]>([]);const [busy,setBusy]=useState(false);const [err,setErr]=useState('');const [lastCid,setLastCid]=useState('')
 const loadConvs=async()=>{const r=await supabase.from('conversations').select('id,title').order('updated_at',{ascending:false}).limit(100);if(r.error)return setErr('Could not load conversations.');setConvs(r.data??[])}
 useEffect(()=>{loadConvs()},[])
 useEffect(()=>{if(pre)send(pre)},[])
 const open=async(id:string|null)=>{setCur(id);setErr('');if(!id)return setMsgs([]);const r=await supabase.from('messages').select('role,content').eq('conversation_id',id).order('created_at').limit(200);if(r.error)return setErr('Could not load messages.');setMsgs((r.data??[]) as Bubble[])}
 const ask=async(cid:string,list:Bubble[])=>{setBusy(true);setErr('');setLastCid(cid)
  try{const reply=await askAI({mode:'buddy',messages:list.slice(-12)});const r=await supabase.from('messages').insert({conversation_id:cid,role:'assistant',content:reply});if(r.error)setErr('Answer received but not saved.')
   setMsgs(m=>[...m,{role:'assistant',content:reply}]);supabase.from('conversations').update({updated_at:new Date().toISOString()}).eq('id',cid).then(()=>loadConvs())}
  catch(e){setErr(e instanceof AIError?e.message:'Something went wrong.')}finally{setBusy(false)}}
 const send=async(text:string)=>{let cid=cur;if(!cid){const r=await supabase.from('conversations').insert({title:text.slice(0,50)}).select('id').single();if(r.error)return setErr('Could not start a conversation.');cid=r.data.id;setCur(cid);loadConvs()}
  const r=await supabase.from('messages').insert({conversation_id:cid,role:'user',content:text});if(r.error)return setErr('Could not save your message.')
  const next=[...msgs,{role:'user' as const,content:text}];setMsgs(next);ask(cid as string,next)}
 const rename=async(c:Conv)=>{const t=prompt('Rename conversation',c.title)?.trim();if(!t)return;const r=await supabase.from('conversations').update({title:t.slice(0,80)}).eq('id',c.id);if(r.error)return setErr('Could not rename.');loadConvs()}
 const del=async(c:Conv)=>{if(!confirm('Delete this conversation?'))return;await supabase.from('conversations').delete().eq('id',c.id);if(cur===c.id)open(null);loadConvs()}
 return <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-[16rem_1fr]"><aside className="space-y-2" aria-label="Conversations"><button className="btn-primary w-full" onClick={()=>open(null)}><Plus size={16}/>New conversation</button>
  <ul className="space-y-1">{convs.map(c=><li key={c.id} className={`rounded-xl p-2 text-sm ${c.id===cur?'bg-electric/15':''}`}><button className="block w-full truncate text-left" onClick={()=>open(c.id)}>{c.title}</button><div className="mt-1 flex gap-3 text-xs text-slate-500"><button className="underline" onClick={()=>rename(c)}>Rename</button><button className="underline" onClick={()=>del(c)}>Delete</button></div></li>)}</ul></aside>
  <section><h1 className="mb-2 text-2xl font-bold">AI Study Buddy</h1>
   {!msgs.length&&!busy&&<div className="mb-3 flex flex-wrap gap-2" aria-label="Suggested prompts">{PROMPTS.map(p=><button key={p} className="btn-ghost !py-1.5 text-left" onClick={()=>send(p)}>{p}</button>)}</div>}
   <Chat msgs={msgs} busy={busy} error={err} onSend={send} onRetry={()=>lastCid&&ask(lastCid,msgs)} placeholder="Ask anything about cloud computing or Azure…"/></section></div>}
