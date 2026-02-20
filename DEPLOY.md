# Deploying ExpManager to expmanager.app

Follow these steps to put the app online with GitHub and your custom domain **expmanager.app**.

---

## 1. Put the project on GitHub

If the project is not yet a git repo:

```bash
cd ~/expmanager
git init
git add .
git commit -m "Initial commit"
```

Create a new repository on GitHub (e.g. **expmanager**), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

---

## 2. Deploy with Vercel (recommended)

**Use the correct Vercel project:** For expmanager.app, use the project **expmanager-sel7**. In Vercel, go to [Dashboard](https://vercel.com/dashboard) and open that project. Under **Settings → Git**, confirm the connected repository is your ExpManager repo (e.g. `steve760/expmanager`). Pushes to `main` will then deploy to this project and to **expmanager.app**.

1. Go to [vercel.com](https://vercel.com) and sign in with **GitHub**.
2. Click **Add New… → Project** and **import** your GitHub repo (or open the existing project **expmanager-sel7** if already created).
3. Leave the default settings:
   - **Framework Preset**: Vite  
   - **Build Command**: `npm run build`  
   - **Output Directory**: `dist`  
   - **Install Command**: `npm install`
4. **Environment variables** (if you use Supabase):  
   In the project settings, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL  
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key  
   (Use the same values as in your local `.env`.)  
   **Required for Supabase in production:** without these, the app uses browser localStorage only and data will not sync to Supabase. In Vercel, set the variables for **Production** (and optionally Preview). After adding or changing them, trigger a **new deployment** so the build picks them up. To verify which connection the app is using: open the app → click the **settings (gear)** icon → at the bottom you’ll see either **Data: Supabase** plus a project ref (matches your Supabase URL) or **Data: this device only** if the env vars were not in the build.
5. Click **Deploy**. You’ll get a URL like `your-project.vercel.app`.

**Supabase read/write in production:** The app loads state from Supabase on sign-in and saves after each change. If you see a red **Load failed** or **Save failed** banner in production, check: (1) `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel and a new deploy was run; (2) your Supabase project has the RPCs used for writes (`upsert_clients`, `upsert_projects`, etc.) and RLS policies that allow the authenticated user to SELECT from `clients`, `projects`, `journeys`, `phases`, `jobs`, `insights`, `opportunities`, `cell_comments`. Use **Retry load** to try loading again after fixing issues.

**Non-super-admin users:** A user who is not a super admin can only load and save data for **clients they’re a member of**. Add them via **Admin** → select client → add member (role **member** or **client_user**). Until they have at least one row in `organisation_members`, they’ll see no clients and nothing will persist to Supabase. Apply the migration `supabase/migrations/20250218000003_allow_members_upsert_clients.sql` so they can also save client metadata (name, etc.) for those clients.

**OpenAI chatbot (secure, recommended):** The app calls **`/api/chat`** (a Vercel serverless function) so the API key stays on the server. In Vercel **Settings → Environment variables** add:
- **`OPENAI_API_KEY`** (exact name, no `VITE_` prefix) = your OpenAI API key.  
Optional: **`OPENAI_BASE_URL`** (default `https://api.openai.com/v1`), **`OPENAI_MODEL`** (default `gpt-4o-mini`). Enable **Production** (and Preview if you want). **Redeploy** so the function gets the key. The key is never sent to the browser. Without it, the chat falls back to a rule-based assistant.  
For **local dev** only you can set **`VITE_OPENAI_API_KEY`** in `.env` to call OpenAI directly; production should use the server key only.

---

## 3. Use your custom domain (expmanager.app)

1. In the Vercel project, go to **Settings → Domains**.
2. Add **expmanager.app** (and optionally **www.expmanager.app**).
3. Vercel will show the DNS records you need. Usually:
   - **A record**: `76.76.21.21` (or the IP Vercel shows)  
   - Or **CNAME** for `www`: `cname.vercel-dns.com`
4. In your **domain registrar** (where you bought expmanager.app), open the DNS settings and add those records.  
   - For **apex** (expmanager.app): add the A record.  
   - For **www**: add the CNAME to `cname.vercel-dns.com` (or what Vercel shows).
5. Wait a few minutes (up to 48 hours). Vercel will issue SSL and your site will be live at **https://expmanager.app**.

---

## 4. Optional: Netlify instead of Vercel

If you prefer Netlify:

1. Sign in at [netlify.com](https://netlify.com) with GitHub and **Add new site → Import an existing project**.
2. Choose your repo. Use:
   - **Build command**: `npm run build`  
   - **Publish directory**: `dist`
3. Add env vars **Site settings → Environment variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Add a file **public/_redirects** with one line: `/* /index.html 200` (for SPA routing).
5. In **Domain settings**, add **expmanager.app** and follow Netlify’s DNS instructions at your registrar.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Push the app to a GitHub repository |
| 2 | Import the repo in Vercel (or Netlify) and deploy |
| 3 | Add env vars if you use Supabase |
| 4 | Add domain **expmanager.app** in the host and set DNS at your registrar |

After DNS propagates, the app will be live at **https://expmanager.app**.

---

## Which Vercel project is used?

- **Production (expmanager.app):** The project **expmanager-sel7** should be connected to your GitHub repo so that every push to `main` deploys to this project and to **expmanager.app**. Check **Vercel Dashboard → expmanager-sel7 → Settings → Git** and confirm the repository is correct.
- **CLI:** If you use `vercel` or `vercel --prod` from this repo, run `vercel link` and choose the team and project **expmanager-sel7** so the CLI deploys to the same project.

---

## Production still shows “Data: this device only”?

The app only sees Supabase if **both** env vars are present **at build time** (Vite bakes them in). Use this checklist in project **expmanager-sel7**:

1. **Settings → Environment Variables**
   - Add **`VITE_SUPABASE_URL`** (exact name) = your Supabase URL, e.g. `https://xxxxx.supabase.co`
   - Add **`VITE_SUPABASE_ANON_KEY`** (exact name) = your Supabase anon/public key
   - For each variable, enable **Production** (and Preview if you want). Names are case-sensitive.

2. **Redeploy**
   - Go to **Deployments**, open the **⋮** on the latest deployment → **Redeploy**.
   - If you just added or changed env vars, use **Redeploy** and consider **Clear cache and redeploy** so the new build definitely uses the new values.

3. **Confirm**
   - Open **https://expmanager.app** (or the deployment URL), open the **settings (gear)**. At the bottom you should see **Data: Supabase** and a project ref. If it still says “this device only”, the build didn’t get the vars—double-check names and that Production is enabled, then redeploy again.
