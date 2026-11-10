# Home Management Demo App

This Expo React Native app is configured as a standalone demo application. It runs 100% locally with an in-memory mock data store (`lib/mock-supabase.ts` and `lib/mock-data.ts`) with live reactive updates and zero external cloud backend or paid account dependencies.

## Stack and Workflow

- Expo SDK 56 / React Native 0.85, TypeScript 6, NativeWind v4, expo-router.
- Local in-memory data store with typed queries in `lib/mock-supabase.ts` and schema definitions in `lib/database.types.ts`.
- Run tests: `npm test`
- Run typecheck: `npm run typecheck`
- Format touched files: `npm run format`

## Client Conventions

- Import `supabase` from `@/lib/supabase`; use `useAuth()` from `@/lib/auth` and `useCurrentHome()` from `@/lib/use-current-home`.
- `useSupabaseQuery<T>(tables, enabled, load, deps)` provides reactive queries with table invalidation.
- Reminder mutations go through `lib/reminder-actions.ts` to coordinate notification and calendar sync.
- Parts lookup, tag scanning, and upkeep suggestions run locally with simulated offline results.
