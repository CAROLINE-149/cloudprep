import { useState } from 'react'; import { supabase } from '../lib/supabase'
interface N{id:string;label:string;detail:string;depth?:number}
interface V{id:string;title:string;slug:string;layout:'flow'|'stack'|'compare'|'matrix';summary:string;nodes:N[];cols?:string[];rows?:{label:string;cells:string[];detail:string}[]}
const VIS:V[]=[
{id:'hier',title:'Azure management hierarchy',slug:'core-architecture',layout:'stack',summary:'Azure organizes things in four levels. Settings applied higher up, such as policies and access, flow down to everything beneath.',nodes:[
 {id:'m',label:'Management group',detail:'Organizes subscriptions. Policies and access applied here are inherited by all subscriptions below.'},
 {id:'s',label:'Subscription',detail:'A billing and access boundary. It holds resource groups.',depth:1},
 {id:'g',label:'Resource group',detail:'A logical container for related resources that share a lifecycle. Each resource belongs to exactly one group.',depth:2},
 {id:'r',label:'Resource',detail:'An individual service instance, such as a virtual machine, storage account or virtual network.',depth:3}]},
{id:'req',title:'How a request reaches an Azure web app',slug:'compute-networking',layout:'flow',summary:'A visitor types your address and the request travels through DNS, the internet and an Azure region to your app, then the answer comes back.',nodes:[
 {id:'1',label:'User enters the web address',detail:'The browser needs to turn the name into an address it can reach.'},
 {id:'2',label:'DNS lookup',detail:'DNS resolves the name to the app’s public address. Azure DNS can host your domain’s records.'},
 {id:'3',label:'Request crosses the internet to Azure',detail:'The request arrives at the Azure region that hosts the app.'},
 {id:'4',label:'Load balancer (optional)',detail:'If you run several copies of the app, a load balancer spreads requests across them.'},
 {id:'5',label:'App runs (for example App Service or a VM)',detail:'The compute service runs your code and builds the response.'},
 {id:'6',label:'App reads data (for example storage or a database)',detail:'Data the app needs is fetched from Azure storage or a database.'},
 {id:'7',label:'Response returns to the user',detail:'The page is sent back along the same route and shown in the browser.'}]},
{id:'models',title:'Public, private and hybrid cloud',slug:'cloud-computing',layout:'compare',summary:'The three cloud models differ in who owns the infrastructure and where workloads run.',nodes:[
 {id:'pub',label:'Public cloud',detail:'Infrastructure is owned by a provider and shared by many customers. You pay for what you use. Example: a small shop hosting its website on Azure.'},
 {id:'pri',label:'Private cloud',detail:'Infrastructure is used by a single organization, on-site or hosted. It gives more control but you carry more cost and effort. Example: a bank’s own datacenter.'},
 {id:'hyb',label:'Hybrid cloud',detail:'Combines both and lets them work together. Example: sensitive records stay on-site while heavy analytics run in the public cloud.'}]},
{id:'shared',title:'Shared responsibility model (simplified)',slug:'cloud-computing',layout:'matrix',nodes:[],summary:'Who is responsible for what changes with the service type. Data and identities are always the customer’s job; physical datacenters are always the provider’s job in the cloud.',cols:['On-premises','IaaS','PaaS','SaaS'],rows:[
 {label:'Information and data',cells:['Customer','Customer','Customer','Customer'],detail:'You are always responsible for your data.'},
 {label:'Accounts and identities',cells:['Customer','Customer','Customer','Customer'],detail:'You are always responsible for who has access.'},
 {label:'Applications',cells:['Customer','Customer','Shared','Provider'],detail:'Moves from you to the provider as you move from IaaS to SaaS.'},
 {label:'Operating system',cells:['Customer','Customer','Provider','Provider'],detail:'In IaaS you manage the OS; in PaaS and SaaS the provider does.'},
 {label:'Physical hosts, network and datacenter',cells:['Customer','Provider','Provider','Provider'],detail:'In the cloud the provider secures the physical layer.'}]},
{id:'vnet',title:'Virtual networks and subnets',slug:'compute-networking',layout:'stack',summary:'A virtual network is your private network in Azure. You divide it into subnets and place resources inside them.',nodes:[
 {id:'v',label:'Virtual network (VNet)',detail:'Your private, isolated network in Azure with its own address space. Resources in the same VNet can communicate by default.'},
 {id:'a',label:'Subnet A (for example web servers)',detail:'A slice of the VNet’s address space. Network security groups can filter traffic to and from a subnet.',depth:1},
 {id:'a1',label:'Virtual machines in Subnet A',detail:'Resources get addresses from the subnet they are placed in.',depth:2},
 {id:'b',label:'Subnet B (for example databases)',detail:'Separate subnets let you apply different rules to different tiers.',depth:1},
 {id:'p',label:'Connections outward',detail:'VNet peering joins VNets. VPN Gateway or ExpressRoute connects the VNet to an on-premises network.'}]}]
const CLS:Record<string,string>={Customer:'bg-amber-500/20',Provider:'bg-emerald-500/20',Shared:'bg-violet2/20'}
const ICON:Record<string,string>={Customer:'● ',Provider:'■ ',Shared:'◆ '}
export default function Visual(){const [id,setId]=useState(VIS[0].id);const [open,setOpen]=useState<string|null>(null);const [walk,setWalk]=useState(false);const [step,setStep]=useState(0);const [msg,setMsg]=useState('')
 const v=VIS.find(x=>x.id===id)!;const canWalk=v.layout==='flow'||v.layout==='stack';const w=walk&&canWalk
 const text=`${v.summary}\n\n`+(v.rows?v.rows.map(r=>`- ${r.label}: ${v.cols!.map((c,i)=>`${c} = ${r.cells[i]}`).join('; ')}. ${r.detail}`).join('\n'):v.nodes.map((n,i)=>`${i+1}. ${n.label}: ${n.detail}`).join('\n'))
 const save=async()=>{setMsg('');const t=await supabase.from('topics').select('id').eq('slug',v.slug).maybeSingle();const r=await supabase.from('notes').insert({title:`Visual: ${v.title}`,body_md:text,topic_id:t.data?.id??null});setMsg(r.error?'⚠ Could not save to notes.':'✓ Saved to My Notes.')}
 const pick=(x:string)=>{setId(x);setOpen(null);setStep(0);setMsg('')}
 const nodes=w?v.nodes.slice(0,step+1):v.nodes
 return <div className="mx-auto max-w-3xl space-y-4"><div><h1 className="text-2xl font-bold">Visual learning studio</h1><p className="text-sm text-slate-500">Pre-built, reviewed diagrams. Tap any element for details.</p></div>
  <div className="flex flex-wrap gap-2"><select className="input !w-auto flex-1" aria-label="Choose a visual" value={id} onChange={e=>pick(e.target.value)}>{VIS.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select>
   {canWalk&&<div role="group" aria-label="Format" className="flex gap-1">{[['Diagram',false],['Step-by-step',true]].map(([l,b])=><button key={String(l)} aria-pressed={walk===b} onClick={()=>{setWalk(b as boolean);setStep(0);setOpen(null)}} className={`btn !py-1.5 ${walk===b?'bg-electric text-white':'btn-ghost'}`}>{l}</button>)}</div>}</div>
  <section className="card space-y-2" aria-label={v.title}><h2 className="font-semibold">{v.title}</h2><p className="text-sm">{v.summary}</p>
   {v.layout==='matrix'&&<div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{v.title}</caption><thead><tr><th scope="col" className="p-2 text-left">Responsibility</th>{v.cols!.map(c=><th key={c} scope="col" className="p-2">{c}</th>)}</tr></thead>
    <tbody>{v.rows!.map(r=><tr key={r.label} className="border-t border-slate-200 dark:border-white/10"><th scope="row" className="p-2 text-left font-medium"><button className="text-left underline decoration-dotted" onClick={()=>setOpen(open===r.label?null:r.label)} aria-expanded={open===r.label}>{r.label}</button>{open===r.label&&<span className="block text-xs font-normal text-slate-500">{r.detail}</span>}</th>{r.cells.map((c,i)=><td key={i} className={`p-2 text-center ${CLS[c]}`}>{ICON[c]}{c}</td>)}</tr>)}</tbody></table></div>}
   {v.layout==='compare'&&<div className="grid gap-3 sm:grid-cols-3">{v.nodes.map(n=><div key={n.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/15"><h3 className="font-semibold text-electric">{n.label}</h3><p className="mt-1 text-sm">{n.detail}</p></div>)}</div>}
   {(v.layout==='flow'||v.layout==='stack')&&<ol className="space-y-1">{nodes.map((n,i)=>{const cur=w?i===step:open===n.id;return <li key={n.id} style={{marginLeft:(n.depth??0)*20}}>
    <button onClick={()=>w?setStep(i):setOpen(open===n.id?null:n.id)} aria-expanded={w||open===n.id} className={`w-full rounded-xl border p-3 text-left text-sm dark:border-white/15 ${cur?'border-electric bg-electric/10':''}`}><span className="font-medium">{v.layout==='flow'&&`${i+1}. `}{n.label}</span>{(w?i===step:open===n.id)&&<span className="mt-1 block text-slate-600 dark:text-slate-300">{n.detail}</span>}</button>
    {v.layout==='flow'&&i<nodes.length-1&&<p aria-hidden className="text-center text-slate-400">↓</p>}</li>})}</ol>}
   {w&&<div className="flex gap-2"><button className="btn-ghost" disabled={step===0} onClick={()=>setStep(step-1)}>Back</button><button className="btn-primary" disabled={step>=v.nodes.length-1} onClick={()=>setStep(step+1)}>Next</button></div>}
   {v.layout==='matrix'&&<p className="text-xs text-slate-500">● Customer ■ Provider ◆ Shared. Simplified. See Microsoft Learn for the full matrix.</p>}</section>
  <details className="card"><summary className="cursor-pointer font-semibold">Text description (accessible version)</summary><p className="mt-2 whitespace-pre-wrap text-sm">{text}</p></details>
  <div className="flex items-center gap-3"><button className="btn-ghost" onClick={save}>Save to My Notes</button><span role="status" className="text-sm">{msg}</span></div>
  <p className="text-xs text-slate-500">AI-generated custom diagrams are not included yet. They need validated structured output.</p></div>}
