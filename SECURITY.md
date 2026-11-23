# Security Policy & Audit Log

This file documents the security posture of the Mazeverse Gym Tracker PWA and serves as a chronological log of all security-related actions, patches, and database configurations applied to the project.

## Security Architecture
- **Authentication:** Supabase Auth (JWT with cross-tab and visibility sync).
- **Database Access:** Strictly governed by PostgreSQL Row Level Security (RLS). No public table access is permitted without explicit policies.
- **Frontend:** React + Vite, strictly typed with TypeScript. Vulnerability scans (`npm audit`) are monitored.
- **API Secret Isolation:** Service role keys are restricted strictly to backend Supabase Edge Functions. Frontend only utilizes the scoped anonymous public key.

---

## Security Action Log

### [2026-10-11] Full Application & API Security Audit
- **Dependency Audit:** Executed `npm audit` — **0 vulnerabilities found** across all production and development dependencies.
- **API Security & Secret Isolation:**
  - Verified `SUPABASE_SERVICE_ROLE_KEY` is not bundled into frontend client output.
  - Hardened external USDA nutrition API integration to support configurable `VITE_USDA_API_KEY` from environment variables, preventing rate-limit DoS on public demo keys.
  - Verified `.env` is omitted from Git repository indexing via `.gitignore`.
- **Database Authorization Hardening (Admin RPC):**
  - **Issue Identified:** `supabase/admin_dashboard_rpc.sql` was executing with `SECURITY DEFINER` without validating whether the caller's email matched the designated administrator.
  - **Remediation:** Enforced strict database-level check: `IF caller_email IS NULL OR lower(caller_email) NOT IN ('admin@example.com') THEN RAISE EXCEPTION 'Access Denied'`. This prevents privilege escalation / horizontal authorization bypass. (Configured per environment with authorized admin email list).
- **Row Level Security (RLS) Review:**
  - `workouts`, `workout_sets`, `workout_exercises`: Protected with `auth.uid() = user_id`.
  - `diet_logs`: Protected with `auth.uid() = user_id`.
  - `active_recovery_logs`: Protected with `auth.uid() = user_id`.
  - `body_metrics`: Protected with `auth.uid() = user_id`.
  - `bangladeshi_foods`: Read-only reference table with RLS enabled; mutation prohibited from public clients.

### [2026-10-08] Dependency Security Patch
- **Action:** Executed `npm audit fix`.
- **Details:** Upgraded dependencies to patch 2 vulnerabilities:
  - Fixed `serialize-javascript` (Cross-Site Scripting / XSS).
  - Fixed `source-map-js` (Denial of Service / DoS via event-loop).
- **Result:** 0 active vulnerabilities in the NPM ecosystem.

### [2026-10-02] Active Recovery, Diet & Supplement RLS Policies
- **Action:** Enforced RLS on new feature tables.
- **Details:** Created strict SELECT, INSERT, UPDATE, and DELETE policies for `diet_logs` and `supplement_logs` ensuring users can only access and modify rows where `auth.uid() = user_id`.

### [2026-09-25] Supabase Security Dashboard Remediation
- **Action:** Secured PostgreSQL Views and Functions.
- **Details:** 
  - Altered the `exercise_rankings` SQL View to include `WITH (security_invoker = true)`. This forces the view to respect the RLS policies of the underlying `workout_sets` table, preventing privilege escalation.
  - Updated the `check_workout_grace_period` function with `SET search_path = public` to prevent schema modification injection attacks, resolving a Supabase dashboard security warning.
