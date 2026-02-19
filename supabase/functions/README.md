# Edge Functions

## invite-user

Allows SuperAdmins to invite new users by email from the Admin panel. Creates the auth user, profile row, and optionally adds them to a client with a role.

### Deploy (from project root)

The project includes the Supabase CLI as a dev dependency. One-time setup:

1. **Log in** (opens browser):
   ```bash
   npx supabase login
   ```

2. **Link your project** (use the project ref from Supabase Dashboard → Project Settings → General):
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Deploy the function**:
   ```bash
   npm run deploy:invite-user
   ```
   Or: `npx supabase functions deploy invite-user`

The function uses `SUPABASE_SERVICE_ROLE_KEY` (set automatically when deploying). Do not expose the service role key in the client.

### Invite emails not arriving?

Supabase’s **default** email provider does not reliably send to arbitrary addresses (it’s limited and some inboxes block `supabase.io`). To deliver invite emails to new users:

1. In **Supabase Dashboard** go to **Project Settings** → **Authentication** → **SMTP**.
2. Enable **Custom SMTP** and configure a provider (e.g. [Resend](https://resend.com), [SendGrid](https://sendgrid.com), [Brevo](https://brevo.com), or AWS SES).
3. Use a verified sender address/domain from that provider.

See [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [Not receiving Auth emails](https://supabase.com/docs/guides/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw).

#### Using Gmail

1. **Turn on 2-Step Verification** for your Google account (Google Account → Security).
2. **Create an App Password**: Google Account → Security → 2-Step Verification → App passwords → generate one for “Mail” / “Other (Supabase)”.
3. In **Supabase** → **Project Settings** → **Authentication** → **SMTP**, set:
   - **Sender email:** your Gmail address (e.g. `you@gmail.com`)
   - **Sender name:** e.g. `ExpManager`
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** your full Gmail address
   - **Password:** the 16-character App Password (no spaces)
4. Save. Invite emails will be sent via Gmail.

Gmail has sending limits (e.g. 500/day for personal accounts). For many invites, consider a dedicated provider (Resend, SendGrid, etc.).

### How the app calls it

The app sends a POST request to `https://<project-ref>.supabase.co/functions/v1/invite-user` with:

- **Headers:** `Authorization: Bearer <user access token>`, `Content-Type: application/json`
- **Body:** `{ "email": "...", "full_name": "...", "organisation_id": "...", "role": "member" }`

The function verifies the caller is a SuperAdmin (via `profiles.is_super_admin`) then calls `auth.admin.inviteUserByEmail()` and upserts profile + organisation_members.
