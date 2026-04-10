# 📄 MVP Tech Stack & Data Strategy

## 🧠 Overview
Our MVP focuses on **speed, simplicity, and rapid validation**.  
Instead of building a full production system, we prioritize a **working prototype** that demonstrates the core idea with minimal complexity.

---

## 💻 Tech Stack

### Frontend
- **Next.js (React)**
  - Fast development
  - Supports both frontend and simple backend (API routes)
- **Tailwind CSS**
  - Rapid UI development
  - Consistent and clean design system

---

### Backend (Optional)
- **Next.js API Routes**
  - Used only if needed (e.g., future database integration)
  - Avoids separate backend setup

---

### Database Strategy

#### ✅ Phase 1 — MVP (Current)
- **Mock JSON data (in-code)**
- Managed using React state (`useState`)

Example:
```js
const tasks = [
  {
    id: 1,
    title: "CS Assignment",
    dueDate: "2026-04-09"
  },
  {
    id: 2,
    title: "Math Homework",
    dueDate: "2026-04-12"
  }
];
```

👉 Purpose:
- Fast development
- No setup required
- Focus on UI and core functionality

---

#### ✅ Phase 2 — Persistence (Optional)
- **localStorage**
  - Saves tasks in browser
  - Maintains state after refresh

---

#### ✅ Phase 3 — Full Backend (If time allows)
- **MongoDB**
- API integration for:
  - Task storage
  - User data (optional)

---

## ⚙️ Core Features (MVP)

1. **Task List UI**
   - Displays all tasks in a unified view

2. **Task Input**
   - Add tasks with title and due date

3. **Priority System**
   - Automatically assigns priority based on deadline:
     - 🔥 High: 1–2 days
     - ⚠️ Medium: 3–5 days
     - 🟢 Low: 6+ days

---

## 🔄 Data Flow

### Current (MVP)
```
Mock JSON → React State → UI Rendering
```

### Future (Extended)
```
Frontend → API → Database (MongoDB)
```

---

## 🚫 What We Are NOT Building (For MVP)

- Full authentication system
- Production-level backend
- Complex database schema
- External integrations (e.g., Canvas API, email parsing)

---

## 🎯 Key Principle

> Build the simplest version that demonstrates the core value.

- Prioritize **functionality over completeness**
- Focus on **user experience and interaction**
- Expand only if time allows

---

## 🚀 Summary

We will start with a **frontend-driven prototype using mock data**,  
then progressively enhance with **local storage and optional backend integration** if time permits.
