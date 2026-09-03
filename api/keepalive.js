// Vercel cron target: keeps the Supabase project from being paused for inactivity.
// Free-tier projects are frozen after ~7 days with no requests, so this runs on a
// 5-6 day cadence (see the schedule in vercel.json) and issues one cheap read.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Supabase env vars are not configured' });
  }

  // Vercel signs cron invocations with CRON_SECRET when it is set. Reject anything
  // else so the endpoint cannot be hammered by the public internet.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const response = await fetch(`${url}/rest/v1/plots?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(502).json({ ok: false, status: response.status, body: body.slice(0, 500) });
    }

    const rows = await response.json();
    return res.status(200).json({ ok: true, rows: rows.length, at: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message });
  }
}
