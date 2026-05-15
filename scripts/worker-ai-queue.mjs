const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/cron/ai-queue`, {
  headers: secret ? { authorization: `Bearer ${secret}` } : {},
});

const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));

if (!response.ok || payload.ok === false) {
  process.exitCode = 1;
}
