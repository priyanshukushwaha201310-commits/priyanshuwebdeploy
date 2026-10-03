const SUPABASE_URL = process.env.SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function authToken(event) {
  const h = event.headers || {};
  const value = h.authorization || h.Authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function getUser(token) {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY || !token) return null;
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: "Bearer " + token
    }
  });
  if (!r.ok) return null;
  return r.json();
}

exports.handler = async (event) => {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SERVICE_ROLE_KEY) {
    return json(500, { error: "Supabase backend is not configured." });
  }

  const token = authToken(event);
  const user = await getUser(token);
  if (!user?.id) return json(401, { error: "Please sign in first." });

  const base = SUPABASE_URL + "/rest/v1/thumbnail_history";

  try {
    if (event.httpMethod === "GET") {
      const limitRaw = Number(event.queryStringParameters?.limit || 30);
      const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
      const r = await fetch(
        base + "?select=id,video_url,platform,title,thumbnail_url,created_at&user_id=eq." +
        encodeURIComponent(user.id) + "&order=created_at.desc&limit=" + limit,
        { headers: { apikey: SERVICE_ROLE_KEY, Authorization: "Bearer " + SERVICE_ROLE_KEY } }
      );
      const data = await r.json();
      if (!r.ok) return json(502, { error: "Could not load history." });
      return json(200, { ok: true, items: data });
    }

    if (event.httpMethod === "POST") {
      let body;
      try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON." }); }

      const video_url = String(body.video_url || "").trim();
      const platform = String(body.platform || "").trim();
      const title = String(body.title || "").trim().slice(0, 500);
      const thumbnail_url = String(body.thumbnail_url || "").trim();

      if (!video_url || !platform || !thumbnail_url) {
        return json(400, { error: "video_url, platform and thumbnail_url are required." });
      }

      const r = await fetch(base, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: "Bearer " + SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ user_id: user.id, video_url, platform, title, thumbnail_url })
      });

      if (!r.ok) return json(502, { error: "Could not save history." });
      return json(201, { ok: true });
    }

    if (event.httpMethod === "DELETE") {
      const id = String(event.queryStringParameters?.id || "");
      if (!/^\d+$/.test(id)) return json(400, { error: "Invalid history ID." });

      const r = await fetch(
        base + "?id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(user.id),
        {
          method: "DELETE",
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: "Bearer " + SERVICE_ROLE_KEY
          }
        }
      );
      if (!r.ok) return json(502, { error: "Could not delete history item." });
      return json(200, { ok: true });
    }

    return json(405, { error: "GET, POST and DELETE only." });
  } catch {
    return json(502, { error: "Database request failed." });
  }
};
