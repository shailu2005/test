# 💕 Shailu & Bhavi — Our Little World

A beautiful, private long-distance relationship web app built with Next.js + Firebase Realtime Database, deployable to Vercel.

---

## ✨ Features

- 🏠 **Home** — Live love counter (days, hours, minutes, seconds together), mood preview, quick actions (hug, kiss, poke, location share), 1st anniversary countdown
- 💬 **Chat** — Real-time messages + love letters (sealed until opened), emoji reactions, special message types
- 🌸 **Moods** — 12 moods to set, emotion journal, quick "feel" buttons
- 📸 **Memories** — Add and preserve special moments with emoji, date, and notes
- 🗺️ **Map** — Real-time location tracking, animated distance line, fun distance facts
- ⭐ **Wishes** — Shared wishlist of things to do, places to visit, ways to love each other

---

## 🚀 Setup Guide

### Step 1 — Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `shailu-Bhavi-lovespace`
3. Disable Google Analytics (optional) → Create project
4. In the left sidebar: **Build → Realtime Database**
5. Click **Create Database** → choose a region → start in **test mode**
6. In the left sidebar: **Project Settings (⚙️)** → **General** → scroll to **Your apps**
7. Click the **Web** icon (`</>`) → register app → copy the config object

### Step 2 — Set up environment variables

Create a file called `.env.local` in the project root:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Step 3 — Firebase Database Rules (important for security!)

In Firebase Console → Realtime Database → Rules, paste:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ This is fine since only you two will know the URL. For extra security later, you can add Firebase Auth.

### Step 4 — Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 5 — Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to [https://vercel.com](https://vercel.com) → New Project → import your repo
3. In Vercel project settings → **Environment Variables**, add all the `NEXT_PUBLIC_*` variables from your `.env.local`
4. Deploy! 🎉

Share the Vercel URL with Bhavi and log in as yourselves 💕

---

## 💡 Tips

- Both of you can be online at the same time — everything updates live
- Location sharing requires browser permission (click Allow when asked)
- Love letters appear sealed until the other person taps to open them
- The mood tab shows what the other person is feeling right now

---

## 🛠️ Tech Stack

- **Next.js 14** (App Router)
- **Firebase Realtime Database** (live sync)
- **Tailwind CSS** (styling)
- **date-fns** (time formatting)
- **Framer Motion** (animations)
- **Vercel** (hosting)

---

Made with 💕 for Shailu & Bhavi. Together since Jan 20, 2026 🌸
