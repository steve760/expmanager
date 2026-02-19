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
5. Click **Deploy**. You’ll get a URL like `your-project.vercel.app`.

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
