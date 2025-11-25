# 💪 Bekah Builder

A modern, mobile-first Progressive Web App for tracking workouts, built for Bekah.

---

## ✨ Features

### 🏋️ Smart Workout Tracking
- **Progressive overload tracking** - Automatically shows your last performance for every exercise
- **Rep range guidance** - Real-time color-coded feedback (red/green/orange) for hitting target ranges
- **Exercise notes** - Save form cues, machine settings, and tips for each exercise
- **Exercise swaps** - Choose variations (e.g., push-ups vs DB bench) before each workout
- **Superset support** - Paired exercises with optimized rest periods

### ⏱️ Built-in Timers
- **Rest timer** - Customizable intervals (60s, 120s, 180s) with audio notifications
- **Duration tracking** - Stopwatch for time-based exercises (e.g., dead hangs) with millisecond precision

### 📊 Progress & History
- **Calendar view** - Visual workout history with workout types and rest days
- **Trophy room** - Personal records for every exercise
- **Exercise history** - Complete lift history with collapsible exercise groups
- **Star system** - Earn gold stars for workouts, silver stars for rest days

### 🎁 Reward Shop
- Redeem stars for rewards (kisses, massages, date nights, etc.)
- Point-based system (gold = 3 pts, silver = 1 pt)

### 📱 Progressive Web App
- **Install to home screen** - Works like a native app on iOS and Android
- **Offline support** - Works without internet after first load
- **Persistent storage** - Data saved reliably, especially on iOS
- **Auto-update notifications** - Toast alerts when new version is available

### 💾 Data Management
- **Compressed backups** - Export data as `.bbk` files (gzip compressed .json format)
- **iOS-friendly sharing** - Native share sheet for easy backup to Files, Notes, or iCloud
- **5-workout reminders** - Automatic backup prompts every 5 completed workouts

### 🎨 User Experience
- **Mobile-optimized UI** - Pink gradient theme, clean design, smooth animations
- **Confetti celebrations** - Color-coded celebrations (pink for workouts, blue for rest, etc.)
- **Encouragement messages** - Fun motivational quotes during workouts
- **Pre-workout cardio tracking** - Optional cardio logging (stairmaster, rowing, running)

---

## 🚀 Technology

- **React + TypeScript** - Type-safe component architecture
- **Vite** - Fast build tooling and HMR
- **Tailwind CSS** - Utility-first styling, mobile-first responsive design
- **Lucide React** - Beautiful icon library
- **localStorage** - Client-side data persistence
- **Compression Streams API** - Native gzip compression for backups
- **Service Workers** - PWA offline caching and update management

---

## 🎯 Workout Programs

Three full-body workout routines (A/B/C rotation) with a lower-body focus, optimized for efficiency with antagonist supersets.

Plus support for:
- Hot yoga sessions
- Rest days
- Custom workouts

---

## 📦 Installation

### For Users (PWA)
1. Visit the app in Safari (iOS) or Chrome (Android)
2. Tap "Share" → "Add to Home Screen"
3. Launch from home screen like a native app

---