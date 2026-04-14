# 📄 CampusFlow MVP Tech Stack & Product Strategy

## 🧠 Overview

Our MVP focuses on **speed, simplicity, and rapid validation**.
Instead of building a full production system, we prioritize a **working prototype** that demonstrates the core value of CampusFlow with minimal complexity.

CampusFlow is designed to help students reduce academic overload by:

* organizing scattered tasks and deadlines,
* highlighting what matters most,
* reducing planning friction,
* turning priorities into realistic daily actions.

Our goal is not just to show students their tasks, but to help them **act on them more effectively**.

---

## 💻 Tech Stack

### Frontend

* **Next.js (React)**

  * Fast development
  * Supports both frontend and lightweight backend (API routes)
* **Tailwind CSS**

  * Rapid UI development
  * Consistent and clean design system

### Backend (Optional)

* **Next.js API Routes**

  * Used only if needed (e.g., future persistence or AI integrations)
  * Avoids separate backend setup

---

## 🗂️ Data Strategy

### ✅ Phase 1 — MVP (Current)

* **Mock JSON data (in-code)**
* Managed using React state (`useState`)

### Example Task Structure

```js
const tasks = [
  {
    id: 1,
    title: "CS Assignment",
    course: "COM S 227",
    dueDate: "2026-04-09",
    difficulty: "high",
    estimatedHours: 5,
    type: "assignment",
    status: "in-progress"
  },
  {
    id: 2,
    title: "Math Homework",
    course: "MATH 165",
    dueDate: "2026-04-12",
    difficulty: "medium",
    estimatedHours: 2,
    type: "homework",
    status: "not-started"
  }
];
```

### Enhanced Task Data Model

Each task can include:

* course name
* due date
* perceived difficulty
* estimated time required
* task type (assignment / project / exam)
* task status (not started / in progress / completed)

### Purpose

* Fast development
* No setup required
* Focus on UI and core functionality
* Enable smarter task prioritization and planning support

---

### ✅ Phase 2 — Persistence (Optional)

* **localStorage**

  * Saves tasks in browser
  * Maintains state after refresh

---

### ✅ Phase 3 — Full Backend (If time allows)

* **MongoDB**
* API integration for:

  * Task storage
  * User profile / preferences
  * AI-powered recommendations

---

## ⚙️ Core Features (MVP)

### 1. Unified Academic Dashboard

CampusFlow provides a clean academic overview that brings all tasks into one place.

Includes:

* all active assignments
* upcoming exams / projects
* in-progress work

Purpose:

* reduce information overload
* centralize scattered academic responsibilities

---

### 2. Smart Priority System

CampusFlow highlights the most important task in a large featured card.

Priority is determined using:

* deadline proximity
* task difficulty
* estimated workload

Priority levels:

* 🔥 High: urgent / high effort
* ⚠️ Medium: moderate urgency
* 🟢 Low: low urgency

Purpose:

* reduce decision fatigue
* help students know what to focus on first

---

### 3. Personalized Dashboard Layout

Dashboard includes:

* 🎯 Featured Focus Task (most important now)
* 📌 In-Progress Tasks (currently active)
* 📅 Upcoming Exams / Projects (future awareness)

Purpose:

* improve clarity
* help students quickly understand their academic workload

---

### 4. AI-Assisted Daily Planner

CampusFlow extends the dashboard into a lightweight daily planning flow.

#### Daily Planner Flow

When users click the Daily Planner:

* urgent / high-priority tasks are highlighted first
* students select their available study time:

  * 1 hr
  * 1.5 hrs
  * 2 hrs
  * 2.5 hrs
  * etc.
* current courses appear as dropdown options
* existing assignments auto-populate
* users can add personal study goals manually

#### Smart Planning Support

CampusFlow recommends a draft study plan based on:

* available study time
* urgency of deadlines
* task difficulty
* estimated workload

Examples:

* urgent hard task
* moderate review task
* quick win task

Users can:

* accept suggestions
* reorder tasks
* remove / replace recommendations

Purpose:

* reduce planning friction
* help students turn priorities into realistic actions
* keep students in control while receiving guidance

---

### 5. Lightweight Weekly Planning Support (Optional MVP Extension)

CampusFlow offers simple weekly planning assistance.

Users can choose:

* **Manual Mode**: build their own weekly plan
* **Suggested Mode**: receive a recommended weekly focus list

Weekly suggestions consider:

* upcoming exams
* large projects
* task difficulty
* time remaining

Purpose:

* reduce procrastination
* improve long-term planning awareness
* prevent deadline pileups

Note:
This is a lightweight planning assistant, not a full calendar replacement.

---

### 6. Progress Tracking & Motivation System

To support consistency, CampusFlow includes simple progress motivation features.

Features:

* daily completion percentage
* weekly study progress tracking
* achievement badges for consistency

Examples:

* Daily Goal Completed
* 3-Day Planning Streak
* Ahead of Schedule

Purpose:

* encourage follow-through
* support healthy study habits
* improve long-term engagement

---

## 🔄 Data Flow

### Current (MVP)

```text
Mock JSON → React State → Dashboard / Planner UI Rendering
```

### Future (Extended)

```text
Frontend → API → Database → Personalized Recommendations
```

---

## 🚫 What We Are NOT Building (For MVP)

* Full authentication system
* Production-level backend
* Complex database schema
* Full autonomous AI scheduling
* Full calendar sync integrations (Canvas / email parsing)
* Large-scale gamification systems

---

## 🤖 AI-Ready Future Scope

This architecture is designed to support future AI-powered features such as:

* personalized workload recommendations
* deadline risk alerts
* weekly academic summaries
* adaptive study planning suggestions
* campus opportunity recommendations

---

## 🎯 Key Principle

> Build the simplest version that demonstrates the core value.

Our design philosophy:

* prioritize functionality over completeness
* reduce cognitive overload for students
* support action, not just information display
* keep users in control
* expand only if time allows

---

## 🚀 Summary

CampusFlow starts as a frontend-driven prototype using mock data,
focused on solving a real student problem: academic overload and planning friction.

By combining:

* smart task prioritization,
* clear dashboard design,
* lightweight AI-assisted daily planning,
* habit-supporting progress tracking,

CampusFlow helps students understand:

* what matters now,
* what matters soon,
* and how to realistically act on it.

Rather than asking students to plan from scratch,
CampusFlow turns academic priorities into guided, manageable action.
