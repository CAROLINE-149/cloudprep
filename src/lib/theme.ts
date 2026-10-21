export type Theme='light'|'dark'
export const getTheme=():Theme=>{try{const t=localStorage.getItem('theme');if(t==='light'||t==='dark')return t}catch{}
 return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
export const applyTheme=(t:Theme)=>{document.documentElement.classList.toggle('dark',t==='dark');try{localStorage.setItem('theme',t)}catch{}}
