# Rook Auth Email Setup

## Environment

Required on Cloudflare Pages and local `.env.local`:

```bash
RESEND_API_KEY=re_...
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Supabase SMTP

Configure Supabase Dashboard > Authentication > SMTP:

```text
Host: smtp.resend.com
Port: 465
Username: resend
Password: RESEND_API_KEY
Sender name: ROOK SIGNAL NETWORK
```

Set Authentication > URL Configuration:

```text
Site URL: NEXT_PUBLIC_SITE_URL
Redirect URLs:
NEXT_PUBLIC_SITE_URL/auth/callback
NEXT_PUBLIC_SITE_URL/feed
NEXT_PUBLIC_SITE_URL/login
```

## Templates

Paste the files in `supabase/email-templates/` into Supabase Auth email templates:

- `confirm-email.html`
- `magic-link.html`
- `password-reset.html`
- `invite-acceptance.html`
- `waitlist-approval.html`

## Deployment Notes

Apply `supabase/migrations/0016_rook_auth_email_onboarding_network.sql` before opening signup traffic. The migration adds auth observability, waitlist approval fields, invite attribution, and production operator bootstrap in the `auth.users` trigger.

Cloudflare Pages remains edge-safe. Runtime routes keep `export const runtime = "edge"` and use fetch-based Supabase clients only.

Health console:

```text
/admin/email-health
```
