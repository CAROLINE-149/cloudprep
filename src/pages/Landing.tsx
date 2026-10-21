import { Link } from 'react-router-dom'; import { Brain, CalendarDays, Layers, ListChecks, Gamepad2, LineChart, Cloud } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'; import Footer from '../components/Disclaimer'
const F=[[Brain,'AI Study Buddy & Tutor','Ask anything, or learn step by step with guided questions.'],[CalendarDays,'Adaptive study plan','A realistic schedule built around your exam date and free time.'],[Layers,'Flashcards & spaced repetition','Review what you forget most, right when you need it.'],[ListChecks,'Quizzes & practice tests','Original AZ-900-style questions with full explanations.'],[Gamepad2,'Learning arcade','Mini-games that reinforce real exam objectives.'],[LineChart,'Readiness tracking','See weak topics and an honest, explained readiness indicator.']] as const
export default function Landing(){return <div className="min-h-screen">
 <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><span className="flex items-center gap-2 text-lg font-bold"><Cloud className="text-electric"/>CloudPrep AI</span>
  <nav className="flex items-center gap-2"><ThemeToggle/><Link to="/auth" className="btn-ghost">Sign in</Link></nav></header>
 <main><section className="bg-gradient-to-b from-navy-900 to-navy-700 px-6 py-20 text-center text-white"><div className="mx-auto max-w-3xl">
  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Pass AZ-900 with a study plan that fits your life</h1>
  <p className="mt-5 text-lg text-slate-200">Learn Azure fundamentals with an AI study companion, original practice questions and progress tracking, built for beginners including learners across Africa.</p>
  <div className="mt-8 flex justify-center gap-3"><Link to="/auth?mode=signup" className="btn-primary">Start free</Link><a href="#features" className="btn border border-white/30 hover:bg-white/10">See features</a></div></div></section>
  <section id="features" className="mx-auto grid max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3" aria-label="Features">
   {F.map(([I,t,d])=><div key={t} className="card"><I className="mb-3 text-violet2" aria-hidden/><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d}</p></div>)}</section></main>
 <Footer/></div>}
