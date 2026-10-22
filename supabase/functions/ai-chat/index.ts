// Supabase Edge Function: secure AI gateway for Study Buddy and Tutor.
// Secrets (never in frontend): AI_API_KEY. Optional: AI_MODEL, AI_DAILY_LIMIT.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
const HONESTY = `Be accurate. Clearly separate what you are confident about from what you are unsure of, and say "I'm not certain" when relevant. Never invent official exam requirements, exam question content, prices, limits or URLs. For up-to-date details, point the learner to Microsoft Learn (learn.microsoft.com) and the official AZ-900 study guide. You are an independent, unofficial study aid, not affiliated with Microsoft. Do not claim to be a human.`
const BUDDY = `You are the AI Study Buddy inside CloudPrep AI, helping beginners prepare for the Microsoft Azure Fundamentals (AZ-900) exam. Explain in simple, beginner-friendly language. Define technical terms, compare similar Azure services, and give practical analogies. Use Kenyan and wider African examples where they help (for example an online shop in Nairobi during a holiday sale, M-Pesa-style payment traffic, a school or SACCO). Say why the concept matters for AZ-900. End with one or two short follow-up questions the learner could ask. Keep answers focused and not too long. ${HONESTY}`
const tutor = (t: string, obj: string, diff: string, goal: string, beginner: boolean) => `You are an AI tutor (not a human) inside CloudPrep AI, teaching ONE topic for the AZ-900 exam: "${t}". Official objectives for this topic:\n${obj}\nLevel: ${diff}. Learner goal: ${goal}.${beginner ? ' The learner is a complete beginner: start from first principles, avoid jargon, and define every term.' : ''}
Teaching rules: ask ONE short question per message and then wait for the answer. Start with a quick diagnostic question before teaching. Explain step by step in small chunks, use worked examples and short knowledge checks, and use Socratic questions when helpful. Give supportive feedback and gently correct misunderstandings. If the learner struggles, offer a simpler explanation. Stay on this topic; politely steer back if the learner drifts. Keep each message under about 150 words. ${HONESTY}`
type Msg = { role: 'user' | 'assistant'; content: string }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const key = Deno.env.get('AI_API_KEY')
    if (!key) return json({ error: 'AI features are not configured on the server yet.', code: 'ai_unavailable' }, 503)
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'Please sign in.', code: 'unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const userDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await userDb.auth.getUser()
    if (!user) return json({ error: 'Please sign in again.', code: 'unauthorized' }, 401)
    let b: any; try { b = await req.json() } catch { return json({ error: 'Invalid request.', code: 'bad_request' }, 400) }
    const mode = b.mode
    if (mode !== 'buddy' && mode !== 'tutor') return json({ error: 'Invalid mode.', code: 'bad_request' }, 400)
    if (!Array.isArray(b.messages) || b.messages.length < 1 || b.messages.length > 24) return json({ error: 'Invalid messages.', code: 'bad_request' }, 400)
    const msgs: Msg[] = b.messages.map((m: any) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content ?? '').slice(0, 4000) })).filter((m: Msg) => m.content.trim())
    if (!msgs.length || msgs[0].role !== 'user') return json({ error: 'Conversation must start with a user message.', code: 'bad_request' }, 400)
    if (b.end && mode === 'tutor') msgs.push({ role: 'user', content: 'Please end the session now. Write a short lesson summary (key points learned), what I should work on next, and 2 suggested practice activities.' })
    else if (msgs[msgs.length - 1].role !== 'user') return json({ error: 'Last message must be from the user.', code: 'bad_request' }, 400)
    let system = BUDDY
    if (mode === 'tutor') {
      const { data: t } = await userDb.from('topics').select('title,objective').eq('id', String(b.topic_id)).maybeSingle()
      if (!t) return json({ error: 'Unknown topic.', code: 'bad_request' }, 400)
      const d = ['beginner', 'intermediate', 'advanced'].includes(b.difficulty) ? b.difficulty : 'beginner'
      system = tutor(t.title, t.objective ?? '', d, String(b.goal ?? 'understand the basics').slice(0, 200), !!b.beginner)
    }
    // Rate limit (service role writes; table has no user write policy)
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const limit = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 60), day = new Date().toISOString().slice(0, 10)
    const { data: u } = await admin.from('ai_usage').select('calls').eq('user_id', user.id).eq('day', day).maybeSingle()
    if ((u?.calls ?? 0) >= limit) return json({ error: `Daily AI limit (${limit}) reached. Try again tomorrow.`, code: 'rate_limited' }, 429)
    await admin.from('ai_usage').upsert({ user_id: user.id, day, calls: (u?.calls ?? 0) + 1 })
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000)
    let r: Response
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ctl.signal,
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5-5', max_tokens: 1024, system, messages: msgs }) })
    } catch (e) { return json({ error: (e as Error).name === 'AbortError' ? 'The AI took too long to respond. Please retry.' : 'Could not reach the AI service.', code: 'upstream' }, 504) }
    finally { clearTimeout(timer) }
    if (!r.ok) { console.error('AI upstream', r.status, await r.text()); return json({ error: 'The AI service returned an error. Please retry.', code: 'upstream' }, 502) }
    const data = await r.json()
    const reply = (data.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim()
    if (!reply) return json({ error: 'The AI returned an empty answer. Please retry.', code: 'upstream' }, 502)
    return json({ reply })
  } catch (e) { console.error(e); return json({ error: 'Unexpected server error.', code: 'server' }, 500) }
})
