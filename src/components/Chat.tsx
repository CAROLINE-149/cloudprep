import { KeyboardEvent, useEffect, useRef, useState } from 'react'; import { Send } from 'lucide-react'
export interface Bubble{role:'user'|'assistant';content:string}
export default function Chat({msgs,busy,error,onSend,onRetry,placeholder,disabled}:{msgs:Bubble[];busy:boolean;error:string;onSend:(t:string)=>void;onRetry:()=>void;placeholder:string;disabled?:boolean}){
 const [t,setT]=useState('');const end=useRef<HTMLDivElement>(null)
 useEffect(()=>{end.current?.scrollIntoView({block:'end'})},[msgs.length,busy])
 const send=()=>{const v=t.trim();if(!v||busy||disabled)return;if(v.length>2000)return;setT('');onSend(v)}
 const key=(e:KeyboardEvent)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}
 return <div className="flex h-[70vh] flex-col"><div role="log" aria-live="polite" aria-label="Conversation" className="flex-1 space-y-3 overflow-y-auto p-1">
  {msgs.map((m,i)=><div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role==='user'?'ml-auto bg-electric text-white':'bg-slate-100 dark:bg-white/10'}`}><span className="sr-only">{m.role==='user'?'You: ':'AI: '}</span>{m.content}</div>)}
  {busy&&<p className="text-sm text-slate-500" role="status">Thinking…</p>}
  {error&&<p role="alert" className="text-sm text-red-600">⚠ {error} <button className="underline" onClick={onRetry}>Retry</button></p>}<div ref={end}/></div>
  <div className="mt-2 flex gap-2"><label className="sr-only" htmlFor="chat-in">Message</label><textarea id="chat-in" rows={2} maxLength={2000} className="input" placeholder={placeholder} value={t} disabled={disabled} onChange={e=>setT(e.target.value)} onKeyDown={key}/>
   <button className="btn-primary" onClick={send} disabled={busy||disabled||!t.trim()} aria-label="Send"><Send size={16}/></button></div>
  <p className="mt-1 text-xs text-slate-500">AI-generated. It can make mistakes, so verify important facts on Microsoft Learn.</p></div>}
