# Home Management Demo

A mobile app (iOS & Android) for tracking household assets organized into home-specific categories, plus utility providers and maintenance reminders. Built with Expo, React Native, NativeWind, and an offline local demo data store.

## 🚀 Quick Start (Zero Config / Local Demo)

This demo app runs 100% locally with zero backend dependencies, API keys, or cloud services:

```bash
# 1. Install dependencies
npm install

# 2. Run the test suite & type checks
npm test
npm run typecheck

# 3. Start the app
npm run dev
# or run directly on iOS Simulator:
npm run ios
```

- **Pre-populated Demo Data**: Includes a realistic home, categories (HVAC, Kitchen & Laundry, Plumbing, Vehicles), assets (Carrier Heat Pump, Whirlpool Refrigerator, Rheem Water Heater, 2022 Honda CR-V), maintenance reminders, utilities, and expenses.
- **Zero Config Auth**: Automatically authenticates into a local demo account (`alex.demo@example.com`) with instant access to all features.
- **Full Interactivity**: Create, edit, complete, or delete assets, categories, expenses, and maintenance schedules in memory with live reactive UI updates.
- **Reset Demo Data**: Easily reset back to the initial demo state anytime from _Settings → Reset Demo Data_.
- **Local Parts Lookup & Tag Scanner**: Simulates parts and specifications lookup and equipment tag scanning locally without external AI quotas or keys.

---

## Product Scope & Main Flows

1. **Home Dashboard** — utility providers and upcoming/overdue maintenance reminders.
2. **Assets** — create home-scoped categories using Vehicle or General item forms; assets retain parts, expenses, documents, reminders, and reviewable upkeep.
3. **Reminders** — overdue/upcoming/snoozed/completed states, recurrence, local notifications, and device calendar sync.
4. **Parts Lookup** — simulated parts/spec results with vendor search links.
5. **Settings** — appearance (dark mode), calendar sync, notification preferences, reset demo data, and sign out.
