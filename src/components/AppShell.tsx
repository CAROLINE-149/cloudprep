import { useState } from 'react'; import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard,ClipboardList,CalendarDays,NotebookPen,MessageCircle,GraduationCap,Shapes,Video,Layers,ListChecks,FileCheck2,Gamepad2,LineChart,Settings,Menu,X,LogOut,Cloud } from 'lucide-react'
import { supabase } from '../lib/supabase'; import ThemeToggle from './ThemeToggle'; import Footer from './Disclaimer'
export const NAV=[['dashboard','Dashboard',LayoutDashboard],['plan','Study Plan',ClipboardList],['calendar','Calendar',CalendarDays],['notes','My Notes',NotebookPen],['buddy','AI Study Buddy',MessageCircle],['tutor','AI Tutor',GraduationCap],['visual','Visual Learning',Shapes],['videos','Video Library',Video],['flashcards','Flashcards',Layers],['quiz','Quiz Generator',ListChecks],['practice','Practice Tests',FileCheck2],['arcade','Arcade',Gamepad2],['progress','Progress & Readiness',LineChart],['settings','Settings',Settings]] as const
const BOTTOM=['dashboard','plan','flashcards','practice','progress']
export default function AppShell(){const [open,setOpen]=useState(false);const nav=useNavigate()
 const link=(to:string,label:string,I:any,onClick?:()=>void)=><NavLink key={to} to={to} onClick={onClick} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${isActive?'bg-electric text-white':'hover:bg-white/10'}`}><I size={18} aria-hidden/>{label}</NavLink>
 const menu=<nav aria-label="Main" className="space-y-1">{NAV.map(([to,l,I])=>link(to,l,I,()=>setOpen(false)))}</nav>
 return <div className="flex min-h-screen">
  <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 p-4 text-slate-100 lg:flex"><span className="mb-6 flex items-center gap-2 text-lg font-bold"><Cloud className="text-electric"/>CloudPrep AI</span>{menu}</aside>
  {open&&<div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={()=>setOpen(false)}/><aside className="relative h-full w-64 overflow-y-auto bg-navy-900 p-4 text-slate-100"><button className="mb-3" aria-label="Close menu" onClick={()=>setOpen(false)}><X/></button>{menu}</aside></div>}
  <div className="flex min-w-0 flex-1 flex-col"><header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
   <button className="lg:hidden" aria-label="Open menu" onClick={()=>setOpen(true)}><Menu/></button>
   <input aria-label="Search" type="search" placeholder="Search notes, topics, questions…" className="input max-w-md" disabled title="Global search arrives with the notes feature"/>
   <div className="ml-auto flex items-center gap-2"><ThemeToggle/><button className="btn-ghost" onClick={async()=>{await supabase.auth.signOut();nav('/')}}><LogOut size={16}/><span className="hidden sm:inline">Sign out</span></button></div></header>
   <main className="flex-1 p-4 pb-24 sm:p-6 lg:pb-6"><Outlet/></main><Footer/></div>
  <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 flex justify-around border-t border-white/10 bg-navy-900 py-2 text-slate-100 lg:hidden">{NAV.filter(([t])=>BOTTOM.includes(t)).map(([to,l,I])=><NavLink key={to} to={to} className={({isActive})=>`flex flex-col items-center gap-0.5 text-[11px] ${isActive?'text-electric':''}`}><I size={20} aria-hidden/>{l.split(' ')[0]}</NavLink>)}</nav></div>}
