# FDIE — Financial Decision Intelligence Engine

An expense tracker and spending-analytics web app with two experiences, chosen automatically by screen size:

- **Desktop (≥ 1024px wide — laptops, desktops, iPad landscape):** a dark fintech dashboard with a sidebar. Its views are Overview, Add Expense, Analytics, Simulate, Insights and OOP Concepts.
- **Mobile (< 1024px, phones and tablets):** a full-screen, native-style iOS app. It has a blurred tab bar with a centre add button and bottom sheets with a rupee keypad. It supports swipe-to-delete with undo, long-press menus, pull-to-refresh, push screens with edge-swipe-back, and scrubbable charts.

The layout switches live when the window crosses the breakpoint. Either layout can be forced with `?view=desktop` or `?view=mobile`, or with the "Switch to … view" control inside the app. On a desktop browser that is narrower than 1024px, the mobile app is shown inside a phone frame.

**No login, no sign-up, no OTP.** Every feature works anonymously. Data is stored only in the visitor's browser (`localStorage` key `fdie.v1`) and nothing is uploaded. Insights are rule-based heuristics, not financial advice.

## Stack
- Next.js 14 (App Router) with React 18 and TypeScript.
- No chart library: every chart is hand-built SVG.
- `next/font` for Inter, Manrope and JetBrains Mono.

## Project layout
```
src/lib/engine.ts        domain model: seed data, compute(), simulate(), insights(), validate()
src/lib/reports.ts       ReportGenerator base + HTML / Text / CSV subclasses (runtime polymorphism)
src/lib/store.ts         localStorage-backed store + useFDIE() hook
src/components/AppSwitch.tsx   picks desktop or mobile by viewport width
src/components/desktop/  desktop dashboard (views, charts, drawer, popovers)
src/components/mobile/   native-style mobile app (screens, sheets, gestures, charts)
```

## Develop
```bash
npm install
npm run dev        # http://localhost:3000
npm run selftest   # verifies the calculation engine
npm run build
```

## Deploy on Vercel
1. Push this repo to GitHub.
2. Go to https://vercel.com/new, import the repository (the Vercel GitHub app must have access to it), keep the detected **Next.js** preset, and click **Deploy**. No environment variables are needed.
3. After that, every push to `main` redeploys automatically.
