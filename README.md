# 🎬 ReelMind

> Turn your saved Instagram reels from passive content into an active idea pipeline.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-free%20tier-3ECF8E?logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-orange)](https://console.groq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Total cost](https://img.shields.io/badge/cost-%240%2Fmonth-brightgreen)](https://github.com/palashbountra/reelmind)

ReelMind is a personal AI-powered workspace that tracks, organises, and extracts value from your saved Instagram reels. Paste a URL (or bulk-import 200 at once) → AI analyses it → get a summary, ideas, action items, and project tags → never let a good reel go to waste again.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/palashbountra/reelmind&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,GROQ_API_KEY&envDescription=Supabase%20project%20URL%20%2B%20anon%20key%2C%20and%20a%20free%20Groq%20API%20key&envLink=https://github.com/palashbountra/reelmind%23-setup-in-5-minutes)

---

## ✨ Features

- **Dashboard** — Grid/list view of all saved reels, filtered by category, status, favourites, or project
- **Bulk Import** — Paste 10–200 URLs at once, or upload your Instagram JSON data export. Assign category + project tags to the whole batch. Optional AI analysis per reel.
- **Projects** — Tag reels to your active projects. Get project-specific AI synthesis: *"What do these 15 reels tell me about building a competitive intelligence dashboard?"*
- **AI Analysis** — Powered by Groq (free Llama 3.3 70B) — auto-summary, idea generation, action items, smart tagging
- **Ideate View** — Select multiple reels and ask AI to synthesise themes, patterns, and action plans across all of them
- **Tasks** — Task tracker linked to individual reels, turn AI action items into tasks with one click
- **Custom Categories** — Edit built-in categories (label + emoji), add your own, remove custom ones
- **Reel Detail Panel** — Notes, status tracking, ideas, per-reel tasks, project tag editor
- **100% free to run** — Supabase free tier + Groq free API = $0/month

---

## 🚀 Setup in 5 minutes

### 1. Clone and install

```bash
git clone https://github.com/palashbountra/reelmind.git
cd reelmind
npm install
```

### 2. Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) → create a new project (free tier)
2. Go to **SQL Editor → New query** and run each migration in order:
   - `supabase/migrations/001_initial_schema.sql` — base schema
   - `supabase/migrations/002_drop_category_constraint.sql` — allows custom categories
   - `supabase/migrations/003_add_project_tags.sql` — adds project tagging
3. Go to **Project Settings → API** and copy your Project URL and `anon` public key

### 3. Get a free Groq API key

1. Go to [console.groq.com](https://console.groq.com) — sign up free, no credit card needed
2. Create an API key

### 4. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=gsk_your_groq_key
```

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📱 How to add reels

### Single reel
1. Open Instagram → find a reel → tap `···` → **Copy link**
2. Open ReelMind → **Add Reel** → paste URL → **Fetch Details**
3. Set category + project tags → **Analyse with AI** → **Save**

### Bulk import (recommended for 100+ saved reels)

**Option A — Paste URLs:**
1. Open Instagram, go to your saved collection
2. Copy each reel link into a text file (one URL per line)
3. In ReelMind → **Bulk Import** → paste all URLs → set category + project tags → **Import**

**Option B — Instagram data export (easiest for large collections):**
1. Instagram → Settings → **Your Activity** → **Download your information**
2. Select **Saved posts** → **JSON format** → request download
3. Instagram emails you a zip — unzip it
4. In ReelMind → **Bulk Import** → **Instagram Export** tab → upload `saved_posts.json`
5. ReelMind extracts all reel URLs automatically → set project tags → **Import**

---

## 🗂️ File structure

```
reelmind/
├── app/
│   ├── page.tsx                  # Root — composes all views
│   ├── layout.tsx                # HTML root + toast provider
│   ├── globals.css               # Global styles + Tailwind
│   └── api/
│       ├── metadata/route.ts     # Fetches reel OG metadata
│       ├── analyse/route.ts      # AI analysis via Groq
│       └── ideate/route.ts       # Multi-reel AI ideation
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx           # Navigation + Bulk Import trigger
│   ├── reels/
│   │   ├── ReelCard.tsx          # Grid card
│   │   ├── ReelDetailPanel.tsx   # Detail panel (notes, tasks, projects)
│   │   ├── AddReelModal.tsx      # 3-step single-reel add flow
│   │   └── BulkImportModal.tsx   # Bulk import (URL paste + JSON export)
│   ├── views/
│   │   ├── DashboardView.tsx     # Main grid dashboard
│   │   ├── ProjectsView.tsx      # Per-project reel library + AI synthesis
│   │   ├── IdeateView.tsx        # Cross-reel AI ideation
│   │   └── TasksView.tsx         # Tasks & reminders
│   └── ui/
│       ├── Button.tsx
│       └── Badge.tsx
├── lib/
│   ├── types.ts                  # All TypeScript types
│   ├── utils.ts                  # Helpers, category/status configs
│   ├── store.ts                  # Zustand global state
│   ├── categories.ts             # Category system (editable, localStorage)
│   ├── projects.ts               # Project system (editable, localStorage)
│   ├── ai/
│   │   └── groq.ts               # Groq API calls
│   ├── db/
│   │   ├── reels.ts              # Supabase reel CRUD
│   │   └── tasks.ts              # Supabase task CRUD
│   ├── instagram/
│   │   └── oembed.ts             # Reel metadata fetching
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Server Supabase client
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql
        ├── 002_drop_category_constraint.sql
        └── 003_add_project_tags.sql
```

---

## 🗺️ Roadmap

### v0.2 — Coming next
- [ ] **Reminders** — Set a date, get notified to act on a reel
- [ ] **Browser Extension** — Save reels with one click while browsing Instagram
- [ ] **Mobile PWA** — Add to home screen + share sheet support
- [ ] **Rich notes** — Notion-style rich text notes per reel

### v0.3 — Growth
- [ ] **Supabase Auth** — Multi-device sync with login
- [ ] **AI re-analysis** — Re-run AI on any reel after updating the caption
- [ ] **Trend detection** — "You keep saving productivity content — here's your pattern"
- [ ] **Export** — Export your idea library as Notion / Markdown
- [ ] **YouTube / TikTok** — Support other video platforms

---

## 🧠 The story

> *"I was drowning in 200+ saved Instagram reels I never revisited. So I built ReelMind — paste a URL, and Llama 3.3 via Groq instantly extracts a summary, 3 ideas, and specific action items. The Projects view lets me tag reels to my active work (a competitive intelligence dashboard, a stock market project) and then ask 'what do these 15 reels tell me about this problem?' — synthesised in seconds. It's turned my mindless saving habit into a personal knowledge system."*

---

## Tech stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Free |
| Database | Supabase (Postgres) | Free tier |
| AI | Groq API — Llama 3.3 70B | Free |
| Metadata | Instagram OG tags | Free |
| Deployment | Vercel | Free |

**Total cost: $0/month** ✅

---

## License

MIT — do whatever you want with it.

Built by [Palash](https://github.com/palashbountra) · ReelMind v0.1
