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

1. Go to [vercel.com](https://vercel.com) and sign in with **GitHub**.
2. Click **Add New… → Project** and **import** your GitHub repo.
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
