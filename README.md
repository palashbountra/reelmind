# 🎬 ReelMind

> Turn your saved Instagram reels from passive content into an active idea pipeline.

ReelMind is a personal AI-powered workspace that tracks, organises, and extracts value from your saved reels. Paste a reel URL → AI analyses it → get a summary, ideas, action items, and tags → never let a good reel go to waste again.

---

## ✨ Features

- **Dashboard** — Grid/list view of all saved reels, filtered by category, status, favourites, or project
- **Bulk Import** — Paste 10–200 URLs at once, or upload your Instagram JSON data export. Assign category + project tags to the whole batch. Optional AI analysis per reel.
- **Projects** — Tag reels to your active projects (EFL Dashboard, Interlink, Stock Market, etc.). Get project-specific AI synthesis: "What do these 15 reels tell me about building a competitive intelligence dashboard?"
- **AI Analysis** — Powered by Groq (free Llama 3 API) — auto-summary, idea generation, action items, smart tagging
- **Ideate View** — Select multiple reels and ask AI to synthesise themes, patterns, and action plans across all of them
- **Tasks & Reminders** — Task tracker linked to reels, with due dates and "Import from AI" to turn action items into tasks
- **Custom Categories** — Edit built-in categories (label + emoji), add your own, remove custom ones
- **Reel Detail Panel** — Notes, status tracking, ideas, per-reel tasks, project tag editor
- **100% free to run** — Supabase free tier + Groq free API = $0/month

---

## 🚀 Setup in 5 minutes

### 1. Install dependencies

```bash
cd "REELS APP"
npm install
```

### 2. Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) → Create a new project (free tier)
2. Go to **SQL Editor** → **New query**
3. Run each migration in order:
   - `supabase/migrations/001_initial_schema.sql` — base schema
   - `supabase/migrations/002_drop_category_constraint.sql` — allows custom categories
   - `supabase/migrations/003_add_project_tags.sql` — adds project tagging
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key

### 3. Get a free Groq API key

1. Go to [console.groq.com](https://console.groq.com) — sign up free, no credit card
2. Create an API key
3. Copy it

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
1. Open Instagram, go to your saved reels collection
2. Open each reel, copy the link, paste into a text file (one URL per line)
3. In ReelMind → **Bulk Import** → paste all URLs → set category + project tags → **Import**

**Option B — Instagram data export (easiest for 100+ reels):**
1. Instagram → Settings → **Your Activity** → **Download your information**
2. Select **Saved posts** → **JSON format** → request download
3. Instagram emails you a zip — unzip it
4. In ReelMind → **Bulk Import** → **Instagram Export** tab → upload `saved_posts.json`
5. ReelMind extracts all reel URLs automatically → set project tags → **Import**

---

## 🗂️ File structure

```
REELS APP/
├── app/
│   ├── page.tsx              # Root page (composes all views)
│   ├── layout.tsx            # HTML root + toast provider
│   ├── globals.css           # Global styles + Tailwind
│   └── api/
│       ├── metadata/route.ts # Fetches reel OG metadata
│       ├── analyse/route.ts  # AI analysis via Groq
│       └── ideate/route.ts   # Multi-reel AI ideation
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx       # Navigation sidebar
│   ├── reels/
│   │   ├── ReelCard.tsx      # Grid card for a reel
│   │   ├── ReelDetailPanel.tsx # Right panel with reel details
│   │   └── AddReelModal.tsx  # 3-step add reel flow
│   ├── views/
│   │   ├── DashboardView.tsx # Main grid dashboard
│   │   ├── IdeateView.tsx    # Multi-reel AI ideation
│   │   └── TasksView.tsx     # Tasks & reminders
│   └── ui/
│       ├── Button.tsx
│       └── Badge.tsx
├── lib/
│   ├── types.ts              # All TypeScript types
│   ├── utils.ts              # Helpers, category/status configs
│   ├── store.ts              # Zustand global state
│   ├── ai/
│   │   └── groq.ts           # Groq API calls (free AI)
│   ├── db/
│   │   ├── reels.ts          # Supabase reel CRUD
│   │   └── tasks.ts          # Supabase task CRUD
│   ├── instagram/
│   │   └── oembed.ts         # Reel metadata fetching
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       └── server.ts         # Server Supabase client
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## 🗺️ Roadmap

### v0.2 — Coming next
- [ ] **Reminders** — Set a date, get an email/notification to act on a reel
- [ ] **Browser Extension** — Save reels with one click while browsing Instagram
- [ ] **Mobile PWA** — Add to home screen + share sheet support
- [ ] **Workspace** — Rich text notes per reel (like Notion)

### v0.3 — Growth features
- [ ] **Supabase Auth** — Multi-device sync with login
- [ ] **AI re-analysis** — Re-run AI on any reel
- [ ] **Trend detection** — "You keep saving productivity content — here's your pattern"
- [ ] **Export** — Export your idea library as Notion/Markdown
- [ ] **YouTube/TikTok** — Support other video platforms

---

## 🧠 The "fun AI workflow" story

> *"I was drowning in 200+ saved Instagram reels I never revisited. So I built ReelMind — paste a URL, and Llama 3 via Groq instantly extracts a summary, 3 ideas, and specific action items from the reel's content. The Ideate view lets me select 5 reels and ask 'what's my learning pattern this month?' and get a synthesised answer. It's turned my mindless saving habit into a personal knowledge system."*

---

## Tech stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Free |
| Database | Supabase (Postgres) | Free tier |
| AI | Groq API — Llama 3 8B | Free |
| Metadata | Instagram OG tags | Free |
| Deployment | Vercel | Free |

**Total cost: $0/month** ✅

---

Built by Palash · ReelMind v0.1
