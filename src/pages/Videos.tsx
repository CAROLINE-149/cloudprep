import { useEffect, useMemo, useState } from 'react'; import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'; import { useAuth } from '../lib/auth'
interface R{id:string;topic_id:string|null;kind:string;title:string;description:string|null;url:string;embed_url:string|null;source:string;last_verified:string|null;owner_id:string|null}
interface P{watchlist:boolean;watched:boolean}
function parse(u:string):{url:string;embed:string|null;source:string}|string{
  let x:URL;try{x=new URL(u.trim())}catch{return 'Enter a full link starting with https://'}
  if(x.protocol!=='https:')return 'Only https links are allowed.'
  const h=x.hostname.replace(/^www\.|^m\./,'')
  if(h==='youtube.com'||h==='youtu.be'){const id=h==='youtu.be'?x.pathname.slice(1):x.searchParams.get('v')??'';if(!/^[\w-]{11}$/.test(id))return 'Could not find a valid YouTube video ID in that link.'
   return {url:`https://www.youtube.com/watch?v=${id}`,embed:`https://www.youtube-nocookie.com/embed/${id}`,source:'YouTube (added by you)'}}
  if(h==='learn.microsoft.com')return {url:x.toString(),embed:null,source:'Microsoft Learn (added by you)'}
  return 'Only YouTube and learn.microsoft.com links are supported.'}
export default function Videos(){const {session}=useAuth();const uid=session!.user.id
 const [rs,setRs]=useState<R[]>([]);const [topics,setTopics]=useState<{id:string;title:string}[]>([]);const [pr,setPr]=useState<Map<string,P>>(new Map());const [err,setErr]=useState('');const [ready,setReady]=useState(false)
 const [q,setQ]=useState('');const [tf,setTf]=useState('');const [kind,setKind]=useState('');const [wl,setWl]=useState(false)
 const [url,setUrl]=useState('');const [title,setTitle]=useState('');const [topic,setTopic]=useState('')
 const load=async()=>{const [r,t,p]=await Promise.all([supabase.from('resources').select('id,topic_id,kind,title,description,url,embed_url,source,last_verified,owner_id'),supabase.from('topics').select('id,title').order('sort_order'),supabase.from('video_progress').select('resource_id,watchlist,watched')])
  if(r.error||t.error||p.error)return setErr('Could not load the library.');setErr('');setRs((r.data??[]) as R[]);setTopics(t.data??[]);setPr(new Map((p.data??[]).map(x=>[x.resource_id,x])));setReady(true)}
 useEffect(()=>{load()},[])
 const set=async(id:string,patch:Partial<P>)=>{const c={...(pr.get(id)??{watchlist:false,watched:false}),...patch};const r=await supabase.from('video_progress').upsert({user_id:uid,resource_id:id,...c});if(r.error)return setErr('Could not save.');setPr(m=>new Map(m).set(id,c))}
 const add=async()=>{setErr('');const p=parse(url);if(typeof p==='string')return setErr(p);if(!title.trim())return setErr('Give the video a title.')
  const r=await supabase.from('resources').insert({owner_id:uid,kind:'video',title:title.trim().slice(0,150),url:p.url,embed_url:p.embed,source:p.source,topic_id:topic||null,last_verified:new Date().toISOString().slice(0,10)});if(r.error)return setErr('Could not add the video.');setUrl('');setTitle('');load()}
 const del=async(id:string)=>{const r=await supabase.from('resources').delete().eq('id',id);if(r.error)return setErr('Could not delete.');load()}
 const tn=(id:string|null)=>topics.find(t=>t.id===id)?.title??'General'
 const list=useMemo(()=>rs.filter(r=>(!tf||r.topic_id===tf)&&(!kind||r.kind===kind)&&(!wl||pr.get(r.id)?.watchlist)&&(!q||(r.title+' '+(r.description??'')).toLowerCase().includes(q.toLowerCase()))),[rs,tf,kind,wl,q,pr])
 if(!ready&&!err)return <p role="status">Loading…</p>
 return <div className="mx-auto max-w-4xl space-y-4"><div><h1 className="text-2xl font-bold">Video &amp; resource library</h1><p className="text-sm text-slate-500">Official Microsoft Learn modules are listed by topic. I haven’t pre-loaded third-party videos, because each link must be verified. Add videos you trust below (YouTube links embed here).</p></div>
  <div className="flex flex-wrap gap-2"><input className="input !w-auto flex-1" type="search" aria-label="Search" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
   <select className="input !w-auto" aria-label="Topic" value={tf} onChange={e=>setTf(e.target.value)}><option value="">All topics</option>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
   <select className="input !w-auto" aria-label="Type" value={kind} onChange={e=>setKind(e.target.value)}><option value="">All types</option><option value="module">Learn modules</option><option value="video">Videos</option></select>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wl} onChange={e=>setWl(e.target.checked)}/>Watchlist</label></div>
  {err&&<p role="alert" className="text-sm text-red-600">⚠ {err}</p>}
  {list.length?<ul className="space-y-3">{list.map(r=>{const p=pr.get(r.id);return <li key={r.id} className="card space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{r.title}</p><p className="text-xs text-slate-500">{tn(r.topic_id)} · {r.kind==='video'?'Video':'Learn module'} · Source: {r.source}{r.last_verified?` · verified ${r.last_verified}`:''}</p></div>{p?.watched&&<span className="text-xs font-medium">✓ {r.kind==='video'?'Watched':'Completed'}</span>}</div>
   {r.description&&<p className="text-sm">{r.description}</p>}
   {r.embed_url&&<iframe className="aspect-video w-full rounded-xl" src={r.embed_url} title={r.title} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
   <div className="flex flex-wrap gap-2"><a className="btn-primary !py-1.5" href={r.url} target="_blank" rel="noopener noreferrer">{r.embed_url?'Open on YouTube':'Open on Microsoft Learn'}</a>
    <button className="btn-ghost !py-1.5" aria-pressed={!!p?.watchlist} onClick={()=>set(r.id,{watchlist:!p?.watchlist})}>{p?.watchlist?'★ In watchlist':'☆ Watchlist'}</button>
    <button className="btn-ghost !py-1.5" aria-pressed={!!p?.watched} onClick={()=>set(r.id,{watched:!p?.watched})}>{p?.watched?'Undo':r.kind==='video'?'Mark watched':'Mark completed'}</button>
    {r.owner_id&&<button className="btn-ghost !py-1.5" onClick={()=>del(r.id)}>Remove</button>}</div>
   {p?.watched&&<p className="text-sm">Next: <Link className="text-electric underline" to="/app/quiz">take a short quiz on this topic</Link> or <Link className="text-electric underline" to="/app/notes">write a note</Link>.</p>}</li>})}</ul>
  :<p className="card text-sm text-slate-500">{rs.length?'Nothing matches your filters.':'No resources yet. Run 005_resources_games.sql in Supabase.'}</p>}
  <section className="card space-y-2" aria-label="Add a video"><h2 className="font-semibold">Add a video</h2>
   <input className="input" aria-label="Video link" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={e=>setUrl(e.target.value)}/>
   <input className="input" aria-label="Title" placeholder="Title" maxLength={150} value={title} onChange={e=>setTitle(e.target.value)}/>
   <select className="input" aria-label="Topic for new video" value={topic} onChange={e=>setTopic(e.target.value)}><option value="">No topic</option>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
   <button className="btn-primary" onClick={add}>Add video</button><p className="text-xs text-slate-500">Only links are stored. Videos are never downloaded or copied.</p></section></div>}
