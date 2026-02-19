# Auth and permissions – implementation plan

One plan for getting the app on the internet with authentication, four roles, invite-only sign-up, and an admin area to manage permissions. Work through the phases in order.

---

## 1. Overview

| Goal | Approach |
|------|----------|
| **Auth** | Supabase Auth with **email + password** (no Google required). |
| **No open sign-up** | Disable public sign-up; new users only via invite or admin-created account. |
| **Organisations** | One organisation = one **client** (existing `clients` table). |
| **Roles** | Four roles: SuperAdmin, User, ClientAdmin, ClientUser (see below). |
| **Who manages access** | SuperAdmin globally; ClientAdmin for their client(s) only. |

---

## 2. The four roles

| Role | Stored in | Scope | Can do |
|------|-----------|--------|--------|
| **SuperAdmin** | `profiles.is_super_admin = true` | Global | Everything: all clients, all users, create any role (including ClientAdmin). |
| **User** | `organisation_members.role = 'member'` | Multiple clients | Work on multiple clients (view/edit journeys, etc.). Cannot manage users. |
| **ClientAdmin** | `organisation_members.role = 'admin'` | One or more clients | Full access to their client(s); **can create new users for that client only** (User or ClientUser). Cannot create ClientAdmin. |
| **ClientUser** | `organisation_members.role = 'client_user'` | **Single client** | Work on one client only. Cannot manage users. |

Rules:

- **SuperAdmin** is the only global role; everyone else is defined by rows in `organisation_members` (which client + which role).
- **ClientUser** must have **at most one** row in `organisation_members` (enforced in app or DB).
- **User** can have multiple rows (`role = 'member'`) for different clients.
- **ClientAdmin** can have one or more rows (`role = 'admin'`) for different clients; they can only invite User or ClientUser to those clients.

---

## 3. Data model (Supabase)

### 3.1 Tables to add

**`profiles`** (one row per auth user)

- `id` (uuid, PK, = `auth.users.id`)
- `email`, `full_name`
- `is_super_admin` (boolean, default false)
- `created_at`, `updated_at`

**`organisation_members`** (who can access which client, and as what role)

- `id` (uuid, PK)
- `user_id` (uuid, FK → `auth.users`)
- `organisation_id` (uuid, FK → `clients.id`) — organisation = client
- `role` — `'admin'` | `'member'` | `'client_user'`
- `created_at`
- Unique on `(user_id, organisation_id)`

### 3.2 Access rule

- **“My clients”** = clients the current user is allowed to see/edit.
- SuperAdmin: all clients.
- Everyone else: clients where they have a row in `organisation_members` (any role).
- All app data (clients, projects, journeys, phases, jobs, insights, opportunities, cell_comments) is then restricted by “my clients” (via RLS).

---

## 4. Phase 1 – Supabase setup

### 4.1 Disable public sign-up

- [ ] **Supabase Dashboard** → **Authentication** → **Providers** → **Email**.
- [ ] Turn **off** “Enable email signup” so people who find the URL cannot create an account.

### 4.2 Create `profiles`

- [ ] Run in **SQL Editor**:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "SuperAdmin can read all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));

create policy "SuperAdmin can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));
```

- [ ] Ensure a `profiles` row is created whenever a user is created (trigger on `auth.users`, or insert from your invite/backend when you create users).

### 4.3 Create `organisation_members`

- [ ] Run:

```sql
create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.clients(id) on delete cascade,
  role text not null check (role in ('admin', 'member', 'client_user')),
  created_at timestamptz not null default now(),
  unique(user_id, organisation_id)
);

create index idx_organisation_members_user_id on public.organisation_members(user_id);
create index idx_organisation_members_organisation_id on public.organisation_members(organisation_id);

alter table public.organisation_members enable row level security;
```

- [ ] RLS: users can read their own rows (`user_id = auth.uid()`); SuperAdmin can do everything; ClientAdmin can read/insert/update/delete only for organisations where they have `role = 'admin'`, and may only set `role = 'member'` or `'client_user'` (not `'admin'`).

### 4.4 Helper: “my client IDs”

- [ ] Run:

```sql
create or replace function public.user_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clients
  where exists (select 1 from public.profiles where id = auth.uid() and is_super_admin)
  union
  select organisation_id from public.organisation_members where user_id = auth.uid();
$$;
```

### 4.5 RLS on existing tables

- [ ] Enable RLS on: `clients`, `projects`, `journeys`, `phases`, `jobs`, `insights`, `opportunities`, `cell_comments`.
- [ ] For each table, allow operations only when the row’s client (or client via project/journey/phase) is in `(select public.user_client_ids())`. Restrict **insert** on `clients` to SuperAdmin if only they should create clients.

### 4.6 First SuperAdmin

- [ ] Create a user in **Authentication → Users** (or via Admin API) and set password.
- [ ] Insert into `profiles`: set `is_super_admin = true` for that user’s id.

---

## 5. Phase 2 – App: sign-in and “my clients”

### 5.1 Sign-in only (no sign-up)

- [ ] Add a **sign-in page** (e.g. `/login`) with email + password → `supabase.auth.signInWithPassword()`.
- [ ] Optional: “Forgot password” → `supabase.auth.resetPasswordForEmail()`.
- [ ] Do **not** expose any “Sign up” link or form.
- [ ] Redirect unauthenticated users to sign-in; after sign-in, redirect into the app.

### 5.2 Load profile and “my clients”

- [ ] After auth, fetch **profile** (`profiles` where `id = auth.uid()`).
- [ ] If `is_super_admin`: “my clients” = all clients. Else: “my clients” = clients whose id is in `organisation_members.organisation_id` for `user_id = auth.uid()`.
- [ ] Store profile and “my clients” in app state (e.g. Zustand/context).

### 5.3 Use “my clients” everywhere

- [ ] Replace any “list all clients” with “list my clients”. Creating clients only for SuperAdmin (or ClientAdmin if you allow it). RLS already enforces; UI should only offer “my clients”.

---

## 6. Phase 3 – Admin area

### 6.1 Who sees Admin

- [ ] Show **Admin** (nav/menu) only if user is SuperAdmin or has at least one `organisation_members` row with `role = 'admin'`. User and ClientUser do not see it.
- [ ] Guard route (e.g. `/admin`) so only SuperAdmin or ClientAdmin can open it.

### 6.2 SuperAdmin

- [ ] **List all users** and their memberships (which client, which role).
- [ ] **Invite and assign any role**: ClientAdmin (`role = 'admin'`, one or more clients), User (`role = 'member'`, one or more clients), ClientUser (`role = 'client_user'`, **exactly one** client).
- [ ] **Revoke or change** membership/role. When assigning ClientUser, ensure the user ends up with only one org (remove other memberships first if needed).

### 6.3 ClientAdmin

- [ ] **List members** only for clients where current user has `role = 'admin'`.
- [ ] **Invite User or ClientUser** only for those clients (`role = 'member'` or `'client_user'`). If ClientUser, enforce single org (reject if user already has another).
- [ ] **Remove** a user from that client (delete `organisation_members` row). ClientAdmin cannot set `role = 'admin'`; only SuperAdmin can create ClientAdmins.

### 6.4 Invite flow (backend)

- [ ] Use either **Supabase** `auth.admin.inviteUserByEmail()` (from Edge Function or server with service role) or a **custom invite** (token in link, then backend creates user and inserts `profiles` + `organisation_members`). New users exist only via invite or admin; public sign-up stays off.

---

## 7. Phase 4 – Polish

- [ ] **Profile**: ensure every created user gets a `profiles` row (trigger or explicit insert in invite flow).
- [ ] **Logout**: button/link that calls `supabase.auth.signOut()` and redirects to sign-in.
- [ ] **Session**: handle expiry (e.g. redirect to sign-in on 401 or null session).
- [ ] **No access**: if a user has no memberships left, show “No access” (and optionally sign out).
- [ ] **ClientUser**: in app and/or DB, enforce at most one `organisation_members` row per user when `role = 'client_user'`.

---

## 8. Summary checklist

| # | What |
|---|------|
| 1 | Supabase: disable email signup; create `profiles` and `organisation_members`; add `user_client_ids()`; RLS on all data tables; create first SuperAdmin. |
| 2 | App: sign-in page only; load profile and “my clients”; use “my clients” for all client lists and data. |
| 3 | Admin: visible to SuperAdmin and ClientAdmin only; SuperAdmin can create any role; ClientAdmin can invite User/ClientUser for their client(s) only. |
| 4 | Invite: backend-only user creation (Supabase invite or custom); no public sign-up. |
| 5 | Enforce ClientUser = single client; profile sync; logout and session handling; “no access” when no orgs. |

Use this document as the single plan; tick items as you complete them.

---

## 9. Implementation notes (done in app)

### Create first SuperAdmin

1. In **Supabase Dashboard** → **Authentication** → **Users**, create a user (e.g. Add user → email + password), or use **Invite user**.
2. Copy the user’s **UUID** from the Users table.
3. In **SQL Editor** run:
   ```sql
   insert into public.profiles (id, email, full_name, is_super_admin)
   values ('<auth-users-uuid>', '<email>', '<name>', true);
   ```
4. That user can sign in and will have full access and see the Admin area.

### Disable public sign-up

- **Supabase Dashboard** → **Authentication** → **Providers** → **Email**.
- Turn **off** “Enable email signup” so only invited or admin-created users can have accounts.
