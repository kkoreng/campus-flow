# CampusFlow — Feature Overview

## Tech Stack

- **Next.js 16** — Frontend + API Routes (serverless)
- **Tailwind CSS v4** — Styling
- **OpenAI SDK** (`gpt-4o-mini`) — AI analysis
- **MongoDB** (production) / **JSON file** `data/db.json` (local dev) — Dual DB mode
- **localStorage** — Client-side caching for AI results

---

## Authentication

- Email + password registration and login
- Password hashed with `scrypt`
- Session stored in `localStorage` via `AuthContext`
- 3-step onboarding after registration:
  - Step 1: School, major, year, semester
  - Step 2: Completed courses
  - Step 3: Current courses + difficulty rating

---

## Dashboard Layout

- Full-screen sidebar layout (Linear/GitHub style)
- Sidebar: logo, navigation tabs, user info
- Topbar: active tab name, theme toggle, sign out
- Dark/light mode toggle
- 5 tabs: **Dashboard**, **Assignments**, **Events**, **Insights**, **Settings**

---

## Dashboard Tab

### User Header
- Avatar with initial, name, major · school

### AI Plan
- Runs on load, re-runs when assignments change (add/delete/toggle)
- Cached in `localStorage` (`campusflow_analysis_{userId}`)
- Cache invalidated when assignments or User Note changes
- TTL: 4 hours
- Manual refresh via Refresh ↺ button

**Focus Now** (hero card)
- Most urgent upcoming assignment based on deadline + course difficulty
- Shows: title, course, deadline, estimated time, what to do after

**AI Comment**
- 1–2 sentence personalized summary

**Up Next**
- Up to 4 upcoming assignments in priority order

**Keep an Eye On**
- Up to 3 items needing attention (exams, projects, heavy courses)

---

## Assignments Tab

### Active Assignments
- Due today or later, not yet completed
- Grouped by due date, sorted by urgency
- Due badges: Today / Tomorrow / Xd left
- Mark as completed (checkbox toggle)
- Delete assignment
- Filter: All / Pending / Done

### Past Assignments (auto-archived)
- Due date passed → automatically archived regardless of completed status
- Collapsed by default, expandable with "Past (N) — auto-archived"
- No overdue concept — past = done

### Add Assignment
- Title, course, type (homework/exam/project/quiz/lab/other), due date, due time

### Import ICS (Canvas)
- Paste Canvas ICS feed URL
- Deduplicates by title + date
- Auto-syncs on load if ICS URL is saved in profile

---

## Events Tab

- Add/view campus events
- Fields: title, date, time, location, category, description
- Categories: academic, career, social, sports, club, other

---

## Insights Tab

AI-powered personal academic analysis. Cached in `localStorage` (`campusflow_insights_{userId}`), TTL: 6 hours.

**Stats strip**
- On-time rate (marked done before deadline / total past assignments)
- Past (auto-archived count)
- Upcoming (active assignment count)
- Tracked (total)

**AI Study Profile**
- Profile headline: one punchy phrase summarizing academic style
- 2–3 sentence narrative analysis

**Behavior Tags**
- 3–5 short labels (e.g. "Last-minute finisher", "Strong on homeworks")

**Top Recommendation**
- Single most impactful action item right now

**Strengths / Needs Work**
- Data-backed positive patterns vs areas to improve (side by side)

**Course Health**
- Per-course status: Strong / Steady / At-risk / Critical
- Progress bar, done/pending counts, AI note per course

**Study Rhythm**
- Observation about overall study patterns

---

## Settings Tab

### Profile Card (view mode)
- Shows: major, school, term, courses done, Canvas ICS status
- Current semester courses with difficulty chips (color-coded)
- Edit button → switches to edit form

### Profile Edit Form
- School (SearchSelect autocomplete)
- Major (SearchSelect autocomplete)
- Year + semester
- Canvas ICS URL
- Completed courses (add/remove tags)
- Current courses + difficulty (easy/medium/hard, color-coded chips)
- Cancel / Save

### User Note (separate card)
- Free-text personal context for AI ("I tend to procrastinate...", "I work best in mornings...")
- Always factored into all AI recommendations
- Changing User Note invalidates AI analysis cache

### Account Card
- Name + email display
- Theme toggle
- Sign out

---

## AI Personalization

All AI analysis factors in:
- Upcoming assignments with days until due
- Course difficulty ratings (easy/medium/hard)
- Assignment type (exam, project, etc.)
- Early completion rate (on-time behavior)
- Heaviest upcoming workload per course
- **User Note** — always incorporated, highest personalization signal

Past-due assignments are excluded from Focus Now / Up Next. They may appear in Watch Out.

---

## Data Model

```ts
Assignment { id, title, course, dueDate, dueTime?, type, completed }
UserProfile { school, major, currentYear, currentSemester, completedCourses[], currentCourses[], userNote? }
CurrentCourse { name, difficulty: 'easy' | 'medium' | 'hard' }
CampusEvent { id, title, date, time?, location?, category, description? }
DbUser { id, name, email, passwordHash, profile, assignments[], events[], icsUrl? }
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/users/[id]` | Fetch user data |
| PATCH | `/api/users/[id]` | Save assignments or profile |
| POST | `/api/analyze` | AI plan (Focus Now, Up Next, Watch Out) |
| POST | `/api/insights` | AI personal insights report |
| GET | `/api/ics` | Proxy Canvas ICS feed |
