# CloudPrep

An independent, unofficial AZ-900 study aid: study plan and calendar, notes, flashcards (spaced repetition), quizzes and timed practice tests with original questions, progress and readiness, AI Study Buddy and Tutor, visual explainers, resource library and a learning arcade.

> CloudPrep is an independent, unofficial AZ-900 study aid. It is not affiliated with or endorsed by Microsoft. Azure and AZ-900 are referenced for educational identification purposes. Practice questions are original learning materials and are not actual Microsoft exam questions.

## Stack

React + TypeScript (Vite), Tailwind, Lucide, Recharts, React Router. Supabase (Postgres, Auth, Edge Functions) with row-level security on all private tables. AI runs only in the `ai-chat` Edge Function.

## Structure

`src/pages` (one file per feature), `src/components` (shell, chat, footer), `src/lib` (supabase client, auth, planner, SM-2 scheduler, readiness), `supabase/migrations` (SQL), `supabase/functions/ai-chat` (AI gateway).

## Setup

1. `npm install`
2. Create a Supabase project. In the SQL editor run, in order, each once: `001_core_schema.sql`, `002_seed_topics.sql`, `003_seed_flashcards.sql`, `004_seed_questions.sql`, `005_resources_games.sql`.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings > API).
4. In Supabase > Authentication > URL Configuration, set your site URL (and your dev URL) so confirmation and reset links work.
5. `npm run dev`

## AI setup (optional; the rest works without it)

`supabase login`, `supabase link --project-ref YOUR_REF`, `supabase secrets set AI_API_KEY=...` (optional `AI_MODEL`, `AI_DAILY_LIMIT`), then `supabase functions deploy ai-chat`.

## Environment variables

| Name                                      | Where                               | Purpose                                       |
| ----------------------------------------- | ----------------------------------- | --------------------------------------------- |
| VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY | `.env` / hosting secrets            | Public client config                          |
| AI_API_KEY                                | Supabase function secret only       | AI provider key. Never prefix with VITE\_     |
| AI_MODEL, AI_DAILY_LIMIT                  | Supabase function secret (optional) | Model name; per-user daily calls (default 60) |

## Deploy

**Replit:** import the project, add the two `VITE_` values in Secrets, run `npm install`, then set the run command to `npm run dev` (or build with `npm run build` and serve with `npm run preview`). Add the Replit URL to Supabase Auth URL settings.
**Static hosts (Vercel/Netlify/Cloudflare Pages):** build command `npm run build`, output `dist`, add the two env vars, and add a rewrite of all routes to `/index.html`.

## Limitations

- The question bank is small (28 questions) and should be extended. No matching-type questions in quizzes.
- No AI generation of quizzes, flashcards or diagrams from notes; no PDF text extraction (.txt and .md only).
- Notes are plain text. Reminders are stored but do not send notifications. No notification centre.
- Calendar items are not linked to specific notes or quizzes. No account deletion button.
- Readiness weights are this app's own design, not an official method.
- Video library has no pre-loaded third-party videos: official Microsoft Learn modules are listed and learners add their own YouTube links.
- Source files were type-checked, but end-to-end behaviour should be verified with `TESTING.md`.

## Needs external configuration

Supabase project and keys, the five SQL scripts, Auth URL settings, an AI provider key plus Edge Function deployment, and (optionally) your own email provider for production sign-up emails.

## Updating exam content

When Microsoft revises the study guide, edit and re-run `002_seed_topics.sql` (it updates in place) and refresh the weightings and the "last verified" date.
