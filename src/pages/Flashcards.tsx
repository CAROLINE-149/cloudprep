import { useCallback, useEffect, useMemo, useState } from 'react'; import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'; import { useAuth } from '../lib/auth'; import { NEW_SCHED, nextSchedule, Rating, Sched } from '../lib/srs'
interface Deck{id:string;title:string;owner_id:string|null}
interface Card{id:string;deck_id:string;owner_id:string|null;front:string;back:string;topic_id:string|null;note_id:string|null}
interface Sch extends Sched{card_id:string;due_at:string}
const shuffle=<T,>(a:T[])=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
export default function Flashcards(){const {session}=useAuth();const uid=session!.user.id;const prefill=(useLocation().state??{}) as {front?:string;back?:string;note_id?:string;topic_id?:string}
 const [decks,setDecks]=useState<Deck[]>([]);const [cards,setCards]=useState<Card[]>([]);const [sch,setSch]=useState<Map<string,Sch>>(new Map());const [err,setErr]=useState('');const [ready,setReady]=useState(false)
 const [deck,setDeck]=useState('');const [filter,setFilter]=useState('due');const [shuf,setShuf]=useState(true)
 const [queue,setQueue]=useState<string[]|null>(null);const [i,setI]=useState(0);const [flip,setFlip]=useState(false);const [tally,setTally]=useState({know:0,almost:0,practice:0})
 const [front,setFront]=useState(prefill.front??'');const [back,setBack]=useState(prefill.back??'');const [target,setTarget]=useState('');const [newDeck,setNewDeck]=useState('');const [msg,setMsg]=useState('')
 const load=useCallback(async()=>{const [d,c,s]=await Promise.all([supabase.from('flashcard_decks').select('id,title,owner_id'),supabase.from('flashcards').select('id,deck_id,owner_id,front,back,topic_id,note_id').limit(2000),supabase.from('card_schedule').select('card_id,ease,interval_days,reps,lapses,due_at').limit(2000)])
  if(d.error||c.error||s.error){setErr('Could not load flashcards.');return};setErr('');setDecks(d.data??[]);setCards((c.data??[]) as Card[]);setSch(new Map((s.data??[]).map(x=>[x.card_id,x as Sch])));setReady(true)},[])
 useEffect(()=>{load()},[load])
 const mine=decks.filter(d=>d.owner_id===uid)
 const stats=useMemo(()=>decks.map(d=>{const cs=cards.filter(c=>c.deck_id===d.id);const rev=cs.filter(c=>sch.has(c.id)).length;const mas=cs.filter(c=>(sch.get(c.id)?.interval_days??0)>=21).length;return {d,total:cs.length,rev,mas}}),[decks,cards,sch])
 const start=()=>{const now=Date.now();let cs=cards.filter(c=>!deck||c.deck_id===deck)
  cs=cs.filter(c=>{const s=sch.get(c.id);return filter==='due'?!s||+new Date(s.due_at)<=now:filter==='difficult'?(s?.lapses??0)>0:!s})
  cs=shuffle(cs).sort((a,b)=>(sch.get(b.id)?.lapses??0)-(sch.get(a.id)?.lapses??0)); if(shuf&&filter!=='due')cs=shuffle(cs)
  if(!cs.length){setMsg(filter==='due'?'Nothing is due right now. Nice work!':filter==='difficult'?'No difficult cards yet.':'No unreviewed cards left.');return}
  setMsg('');setQueue(cs.map(c=>c.id));setI(0);setFlip(false);setTally({know:0,almost:0,practice:0})}
 const rate=async(r:Rating)=>{const id=queue![i];const prev=sch.get(id)??{...NEW_SCHED};const n=nextSchedule(prev,r)
  const [a,b]=await Promise.all([supabase.from('card_schedule').upsert({user_id:uid,card_id:id,...n}),supabase.from('flashcard_reviews').insert({card_id:id,rating:r})])
  if(a.error||b.error)return setErr('Could not save that review. Try again.');setErr('')
  setSch(m=>new Map(m).set(id,{card_id:id,...n}));setTally(t=>({...t,[r]:t[r]+1}));setFlip(false);setI(x=>x+1)}
 const addCard=async()=>{setErr('');if(!front.trim()||!back.trim())return setErr('Both the front and back are required.')
  let d=target||mine[0]?.id;if(!d){const r=await supabase.from('flashcard_decks').insert({owner_id:uid,title:'My cards'}).select('id').single();if(r.error)return setErr('Could not create a deck.');d=r.data.id}
  const r=await supabase.from('flashcards').insert({deck_id:d,owner_id:uid,front:front.trim(),back:back.trim(),note_id:prefill.note_id??null,topic_id:prefill.topic_id??null});if(r.error)return setErr('Could not save the card.')
  setFront('');setBack('');setMsg('Card added.');load()}
 const addDeck=async()=>{if(!newDeck.trim())return;const r=await supabase.from('flashcard_decks').insert({owner_id:uid,title:newDeck.trim()});if(r.error)return setErr('Could not create the deck.');setNewDeck('');load()}
 const del=async(id:string)=>{const r=await supabase.from('flashcards').delete().eq('id',id);if(r.error)return setErr('Could not delete.');load()}
 if(!ready&&!err)return <p role="status">Loading…</p>
 const card=queue&&i<queue.length?cards.find(c=>c.id===queue[i]):null
 return <div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-bold">Flashcards</h1>
  {err&&<p role="alert" className="text-sm text-red-600">⚠ {err} <button className="underline" onClick={load}>Retry</button></p>}
  {queue?<section className="card space-y-4" aria-label="Study session">{card?<><p className="text-sm text-slate-500">Card {i+1} of {queue.length}</p>
    <button onClick={()=>setFlip(f=>!f)} aria-label={flip?'Showing answer. Press to show question':'Showing question. Press to reveal answer'} className="min-h-40 w-full whitespace-pre-wrap rounded-2xl border border-slate-200 p-6 text-lg dark:border-white/15"><span className="block text-xs uppercase text-slate-500">{flip?'Answer':'Question'}</span>{flip?card.back:card.front}</button>
    {flip?<div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={()=>rate('know')}>✓ Know it</button><button className="btn-ghost" onClick={()=>rate('almost')}>~ Almost</button><button className="btn-ghost" onClick={()=>rate('practice')}>↻ Need practice</button></div>:<p className="text-sm text-slate-500">Think of the answer, then flip the card.</p>}</>
   :<div role="status"><h2 className="font-semibold">Session complete</h2><p className="text-sm">✓ Know it: {tally.know} · ~ Almost: {tally.almost} · ↻ Need practice: {tally.practice}</p><button className="btn-primary mt-3" onClick={()=>{setQueue(null);load()}}>Back to decks</button></div>}
   {card&&<button className="text-sm underline" onClick={()=>{setQueue(null);load()}}>End session</button>}</section>
  :<section className="card space-y-3" aria-label="Start studying"><h2 className="font-semibold">Study</h2><div className="flex flex-wrap gap-2">
   <select className="input !w-auto" aria-label="Deck" value={deck} onChange={e=>setDeck(e.target.value)}><option value="">All decks</option>{decks.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>
   <select className="input !w-auto" aria-label="Which cards" value={filter} onChange={e=>setFilter(e.target.value)}><option value="due">Due for review</option><option value="difficult">Difficult cards</option><option value="new">Unreviewed cards</option></select>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={shuf} onChange={e=>setShuf(e.target.checked)}/>Shuffle</label><button className="btn-primary" onClick={start}>Start</button></div>
   {msg&&<p role="status" className="text-sm">{msg}</p>}<p className="text-xs text-slate-500">Missed cards come back sooner. Known cards are spaced further apart.</p></section>}
  <section aria-label="Decks"><h2 className="mb-2 font-semibold">Decks</h2>{stats.length?<ul className="space-y-2">{stats.map(({d,total,rev,mas})=><li key={d.id} className="card !p-3"><div className="flex justify-between text-sm"><span className="font-medium">{d.title}{d.owner_id?'':' (shared)'}</span><span>{total} cards</span></div>
   <div className="mt-2 h-2 rounded bg-slate-200 dark:bg-white/10" role="img" aria-label={`${rev} of ${total} reviewed, ${mas} mastered`}><div className="h-2 rounded bg-electric" style={{width:`${total?100*rev/total:0}%`}}/></div><p className="mt-1 text-xs text-slate-500">{rev} reviewed · {mas} mastered (21+ day interval)</p></li>)}</ul>
   :<p className="card text-sm text-slate-500">No decks yet. Create one below or run 003_seed_flashcards.sql for starter cards.</p>}</section>
  <section className="card space-y-3" aria-label="Add a card"><h2 className="font-semibold">Add a card</h2>
   <div className="flex gap-2"><input className="input" aria-label="New deck name" placeholder="New deck name" maxLength={80} value={newDeck} onChange={e=>setNewDeck(e.target.value)}/><button className="btn-ghost" onClick={addDeck}>Create deck</button></div>
   <select className="input" aria-label="Add to deck" value={target} onChange={e=>setTarget(e.target.value)}><option value="">{mine.length?mine[0].title:'My cards (created automatically)'}</option>{mine.slice(1).map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>
   <label className="label" htmlFor="ff">Front (question)</label><textarea id="ff" className="input" maxLength={500} value={front} onChange={e=>setFront(e.target.value)}/>
   <label className="label" htmlFor="fb">Back (answer)</label><textarea id="fb" className="input" maxLength={1000} value={back} onChange={e=>setBack(e.target.value)}/>
   {prefill.note_id&&<p className="text-xs text-slate-500">Linked to the note you came from.</p>}<button className="btn-primary" onClick={addCard}>Save card</button></section>
  {cards.some(c=>c.owner_id===uid)&&<details><summary className="cursor-pointer font-semibold">Your cards</summary><ul className="mt-2 space-y-1 text-sm">{cards.filter(c=>c.owner_id===uid).map(c=><li key={c.id} className="flex justify-between gap-2"><span className="truncate">{c.front}</span><button className="underline" onClick={()=>del(c.id)}>Delete</button></li>)}</ul></details>}</div>}
