# Rook Auth Email Debugging

Use this checklist when signup succeeds in the UI but verification email does not arrive.

## Supabase Auth Settings

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL:
  - Local: `http://localhost:3000`
  - Production: `https://rook.nova65.com`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`
  - `https://rook.nova65.com/auth/callback`
  - Cloudflare Pages preview URL pattern, if previews are used

The app sends `emailRedirectTo` from the browser origin:

```ts
`${window.location.origin}/auth/callback?next=%2Fonboarding`
```

Every origin used for signup must be allowed by Supabase.

## Email Confirmation

In Supabase Dashboard -> Authentication -> Providers -> Email:

- Enable Email provider.
- Enable Confirm email if production verification is required.
- Set secure password requirements.
- Confirm that rate limits are not blocking repeated test signups.

If email confirmation is disabled, Supabase can return a session immediately. Rook routes that case directly into `/onboarding`.

## SMTP Setup

Supabase built-in email is rate-limited and should not be used for production delivery.

In Supabase Dashboard -> Project Settings -> Auth -> SMTP Settings:

- Enable custom SMTP.
- Use the sender domain you control.
- Verify SPF, DKIM, and DMARC for that domain.
- Send a test email from Supabase dashboard before testing Rook.
- Confirm the From address domain matches the authenticated SMTP domain.

Common failure signals:

- Signup returns an SMTP/provider error.
- Supabase Auth logs show email delivery failures.
- Messages land in spam due to missing DKIM or DMARC alignment.
- Cloudflare DNS proxy is enabled on mail verification records. Mail records should normally be DNS-only.

## Resend Setup

For Resend SMTP:

- Verify the sending domain in Resend.
- Add Resend DNS records exactly as provided.
- Use SMTP host `smtp.resend.com`.
- Use the Resend SMTP username/password from Resend, not the API key unless Resend explicitly labels it for SMTP.
- Configure the same From address in Supabase SMTP settings.

If using Resend API outside Supabase, keep `RESEND_API_KEY` server-only. The current Rook signup flow delegates verification delivery to Supabase Auth SMTP.

## Postmark Setup

For Postmark SMTP:

- Verify sender signature or domain.
- Use Postmark SMTP credentials for the server stream.
- Configure Supabase SMTP with Postmark host, port, username, and password.
- Keep transactional stream active.

## Cloudflare Domain Considerations

- `rook.nova65.com` must resolve to the deployed app.
- Supabase redirect allow-list must include the exact scheme and host.
- Cloudflare Access, WAF, or bot rules must not block `/auth/callback`.
- SPF/DKIM/DMARC records for the sender domain should be DNS-only, not proxied.
- If using Cloudflare Pages previews, add preview callback URLs or test only against production.

## Localhost Verification

1. Run `npm run dev`.
2. Open `http://localhost:3000/signup`.
3. Submit a real email address.
4. Confirm console diagnostics:
   - `[rook-auth:signup] starting`
   - `[rook-auth:signup] response`
   - `pendingConfirmation: true` when email confirmations are enabled
   - `redirectTarget` matches `http://localhost:3000/auth/callback?next=%2Fonboarding`
5. Click the verification email link.
6. Confirm `/auth/callback` exchanges the code and redirects to `/onboarding`.

## Production Verification

1. Open `https://rook.nova65.com/signup`.
2. Submit a real email address.
3. Confirm browser console logs show:
   - redirect target `https://rook.nova65.com/auth/callback?next=%2Fonboarding`
   - no Supabase Auth error
   - no immediate fake success if Supabase returns no user/session
4. Check Supabase Auth logs for the signup request.
5. Check SMTP provider activity logs for accepted delivery.
6. Click the email link and confirm redirect to `/onboarding`.

## Failure Triage

- `Invalid redirect URL`: add the exact callback URL in Supabase URL Configuration.
- `Email rate limit exceeded`: wait or increase limits with custom SMTP.
- `SMTP` or `provider` errors: fix Supabase SMTP credentials and sender domain verification.
- No user and no session in signup response: inspect Supabase Auth logs and provider settings.
- Existing email: use Log in or Resend verification from the signup screen.

Rook does not show a verification success state unless Supabase returns either a pending user confirmation or an active session.
