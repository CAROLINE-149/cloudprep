import { useState } from 'react'; import { Moon, Sun } from 'lucide-react'; import { applyTheme, getTheme } from '../lib/theme'
export default function ThemeToggle(){const [t,setT]=useState(getTheme())
 const flip=()=>{const n=t==='dark'?'light':'dark';applyTheme(n);setT(n)}
 return <button onClick={flip} className="btn-ghost !p-2" aria-label={`Switch to ${t==='dark'?'light':'dark'} mode`}>{t==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>}
