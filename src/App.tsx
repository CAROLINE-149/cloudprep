import { Navigate, Route, Routes } from 'react-router-dom'; import { ReactNode } from 'react'
import { useAuth } from './lib/auth'; import AppShell, { NAV } from './components/AppShell'
import PlanPage from './pages/Plan'; import CalendarPage from './pages/Calendar'; import Notes from './pages/Notes'; import Flashcards from './pages/Flashcards'; import Quiz from './pages/Quiz'; import Dashboard from './pages/Dashboard'; import Landing from './pages/Landing'; import Auth from './pages/Auth'; import Onboarding from './pages/Onboarding'
function Guard({children,needOnboarded}:{children:ReactNode;needOnboarded?:boolean}){const {session,profile,loading}=useAuth()
 if(loading) return <p className="p-8" role="status">Loading…</p>
 if(!session) return <Navigate to="/auth" replace/>
 if(needOnboarded&&profile&&!profile.onboarded) return <Navigate to="/onboarding" replace/>
 return <>{children}</>}
const Soon=({title}:{title:string})=><div className="card"><h1 className="text-xl font-bold">{title}</h1><p className="mt-2 text-sm text-slate-500">This section is built in a later step.</p></div>
export default function App(){return <Routes>
 <Route path="/" element={<Landing/>}/><Route path="/auth" element={<Auth/>}/>
 <Route path="/onboarding" element={<Guard><Onboarding/></Guard>}/>
 <Route path="/app" element={<Guard needOnboarded><AppShell/></Guard>}>
  <Route index element={<Navigate to="dashboard" replace/>}/>
  <Route path="dashboard" element={<Dashboard/>}/><Route path="plan" element={<PlanPage/>}/><Route path="notes" element={<Notes/>}/><Route path="flashcards" element={<Flashcards/>}/><Route path="quiz" element={<Quiz/>}/><Route path="calendar" element={<CalendarPage/>}/>{NAV.filter(([t])=>!['dashboard','plan','calendar','notes','flashcards','quiz'].includes(t)).map(([to,l])=><Route key={to} path={to} element={<Soon title={l}/>}/>)}</Route>
 <Route path="*" element={<Navigate to="/" replace/>}/></Routes>}