import { FormEvent, useState } from 'react'; import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase'; import { useAuth } from '../lib/auth'
type Mode='signin'|'signup'|'reset'
export default function Auth(){const [sp]=useSearchParams();const nav=useNavigate();const {session}=useAuth()
 const [mode,setMode]=useState<Mode>(sp.get('mode')==='signup'?'signup':'signin')
 const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [busy,setBusy]=useState(false)
 const [msg,setMsg]=useState<{ok:boolean;text:string}|null>(null)
 if(session) return <Navigate to="/app" replace/>
 const submit=async(e:FormEvent)=>{e.preventDefault();setMsg(null)
  if(!/^\S+@\S+\.\S+$/.test(email)) return setMsg({ok:false,text:'Enter a valid email address.'})
  if(mode!=='reset'&&pw.length<8) return setMsg({ok:false,text:'Password must be at least 8 characters.'})
  setBusy(true)
  try{
   if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email,password:pw});if(error)throw error
    if(data.session) nav('/app'); else setMsg({ok:true,text:'Check your email to confirm your account, then sign in.'})}
   else if(mode==='signin'){const {error}=await supabase.auth.signInWithPassword({email,password:pw});if(error)throw error;nav('/app')}
   else{const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/auth`});if(error)throw error
    setMsg({ok:true,text:'If that email exists, a reset link is on its way.'})}
  }catch(err){setMsg({ok:false,text:(err as Error).message||'Something went wrong. Please try again.'})}finally{setBusy(false)}}
 const title={signin:'Welcome back',signup:'Create your account',reset:'Reset your password'}[mode]
 return <div className="grid min-h-screen place-items-center px-4"><form onSubmit={submit} className="card w-full max-w-sm space-y-4" noValidate>
  <Link to="/" className="text-sm text-electric">← Back</Link><h1 className="text-2xl font-bold">{title}</h1>
  {!isConfigured&&<p role="alert" className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Supabase isn’t configured. Copy <code>.env.example</code> to <code>.env</code> and add your project URL and anon key.</p>}
  <div><label className="label" htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
  {mode!=='reset'&&<div><label className="label" htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={pw} onChange={e=>setPw(e.target.value)} required/></div>}
  {msg&&<p role="status" className={`text-sm ${msg.ok?'text-emerald-600':'text-red-600'}`}>{msg.ok?'✓ ':'⚠ '}{msg.text}</p>}
  <button className="btn-primary w-full" disabled={busy||!isConfigured}>{busy?'Please wait…':mode==='signin'?'Sign in':mode==='signup'?'Sign up':'Send reset link'}</button>
  <div className="flex justify-between text-sm text-electric">
   <button type="button" onClick={()=>setMode(mode==='signup'?'signin':'signup')}>{mode==='signup'?'Have an account? Sign in':'New here? Sign up'}</button>
   {mode==='signin'&&<button type="button" onClick={()=>setMode('reset')}>Forgot password?</button>}</div></form></div>}
