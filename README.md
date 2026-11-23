# Logbook 

A mobile-first Progressive Web App (PWA) for logging workouts, tracking volume progression, and managing gym routines.

Designed with a **dark-mode-first, minimalist interface and oversized touch targets** tailored for one-handed usability and sweaty gym environments.

---

##  Features

- **Local-First & Frictionless**: Uses Supabase Anonymous Sign-In on launch so users get an instant background UUID (`auth.uid()`). Zero data migration needed when upgrading to OAuth in V2.
- **Gym Ergonomics**:
  - Deep true-black palette (`#050508`) cuts overhead glare and saves OLED battery life.
  - Oversized 56px touch targets for rapid, error-free logging.
  - Bottom-heavy navigation placing all primary actions in natural thumb reach.
- **Active Rest Timer**: Background-safe rest timer calculating elapsed time via timestamps, complete with Web Audio API chime and haptic vibration cues.
- **Progressive Disclosure & Plate Calculator**: Tap any set number to reveal an Olympic barbell (20kg) plate breakdown, RPE selectors (6–10), and quick weight steppers.
- **Analytics & Progression**: Weight progression, estimated 1RM trendlines, and session volume charts powered by Recharts.
- **Offline Ready**: Full PWA support with service worker caching and web app manifest.

---

##  Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`)
- **PWA**: `vite-plugin-pwa`, Workbox
- **Backend & Auth**: Supabase (PostgreSQL, Anonymous Authentication, Row Level Security)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Celebrations**: Canvas Confetti

---

##  Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/mazev-erse/Logbook.git
cd Logbook
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the migration in [`supabase/complete_setup.sql`](supabase/complete_setup.sql).
3. In Supabase -> **Authentication** -> **Providers**, enable **Anonymous Sign-In**.
4. Create a `.env` file based on `.env.example`:

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
VITE_ADMIN_EMAIL=admin@example.com
```

> **Note**: The app runs out-of-the-box in local-first demo mode if no Supabase credentials are provided!

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. For the best experience, toggle device emulation in Chrome/Edge DevTools (`Ctrl + Shift + M`) to a mobile screen (e.g., iPhone 14 / Pixel 7).

### 4. Production Build

```bash
npm run build
npm run preview
```

---

## 📄 License

MIT
