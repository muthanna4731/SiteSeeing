import { timingSafeEqual } from 'node:crypto';

// Vercel cron target: keeps the Supabase project from being paused for inactivity.
// Free-tier projects are frozen after ~7 days with no requests, so this runs on a
// 5-6 day cadence (see the schedule in vercel.json) and issues one cheap read.

// Compare without leaking the secret through response timing.
function secretMatches(header, secret) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header || '');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export default async function handler(req, res) {
  // Fail closed. Without CRON_SECRET this route would be an open proxy that
  // anyone could use to drive traffic at the database, so refuse to serve it
  // at all rather than quietly running unauthenticated.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'CRON_SECRET is not configured' });
  }

  // Vercel signs cron invocations with `Authorization: Bearer $CRON_SECRET`.
  if (!secretMatches(req.headers.authorization, secret)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Supabase env vars are not configured' });
  }

  try {
    const response = await fetch(`${url}/rest/v1/plots?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });

    if (!response.ok) {
      // Log the upstream detail for debugging, but never echo it back -- the
      // response body can carry Supabase internals.
      console.error('keepalive upstream error', response.status, (await response.text()).slice(0, 500));
      return res.status(502).json({ ok: false, error: 'Upstream request failed' });
    }

    const rows = await response.json();
    return res.status(200).json({ ok: true, rows: rows.length, at: new Date().toISOString() });
  } catch (error) {
    console.error('keepalive request failed', error);
    return res.status(502).json({ ok: false, error: 'Upstream request failed' });
  }
}
