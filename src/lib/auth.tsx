import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isConfigured } from './supabase'
export interface Profile { id:string; display_name:string|null; exam_date:string|null; daily_goal_min:number; study_days:number[]; knowledge_level:string; onboarded:boolean }
interface Ctx { session:Session|null; profile:Profile|null; loading:boolean; refreshProfile:()=>Promise<void> }
const AuthCtx = createContext<Ctx>({session:null,profile:null,loading:true,refreshProfile:async()=>{}})
export const useAuth = () => useContext(AuthCtx)
export function AuthProvider({children}:{children:ReactNode}) {
  const [session,setSession]=useState<Session|null>(null)
  const [profile,setProfile]=useState<Profile|null>(null)
  const [loading,setLoading]=useState(isConfigured)
  const load = async (s:Session|null) => {
    if(!s){setProfile(null);return}
    const {data}=await supabase.from('profiles').select('*').eq('id',s.user.id).maybeSingle()
    setProfile(data as Profile|null)
  }
  useEffect(()=>{
    if(!isConfigured) return
    supabase.auth.getSession().then(async({data})=>{setSession(data.session);await load(data.session);setLoading(false)})
    const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);load(s)})
    return ()=>sub.subscription.unsubscribe()
  },[])
  return <AuthCtx.Provider value={{session,profile,loading,refreshProfile:()=>load(session)}}>{children}</AuthCtx.Provider>
}
