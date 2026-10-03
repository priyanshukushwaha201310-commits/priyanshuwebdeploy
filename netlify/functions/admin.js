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

function token(event) {
  const value = event.headers?.authorization || event.headers?.Authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function getUser(accessToken) {
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: PUBLISHABLE_KEY, Authorization: "Bearer " + accessToken }
  });
  return r.ok ? r.json() : null;
}

async function isAdmin(userId) {
  const r = await fetch(
    SUPABASE_URL + "/rest/v1/profiles?select=role&id=eq." + encodeURIComponent(userId) + "&limit=1",
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: "Bearer " + SERVICE_ROLE_KEY } }
  );
  if (!r.ok) return false;
  const rows = await r.json();
  return rows[0]?.role === "admin";
}

exports.handler = async (event) => {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SERVICE_ROLE_KEY) {
    return json(500, { error: "Supabase backend is not configured." });
  }

  const accessToken = token(event);
  if (!accessToken) return json(401, { error: "Authentication required." });

  try {
    const user = await getUser(accessToken);
    if (!user?.id || !(await isAdmin(user.id))) {
      return json(403, { error: "Admin access required." });
    }

    const historyBase = SUPABASE_URL + "/rest/v1/thumbnail_history";
    const usersBase = SUPABASE_URL + "/rest/v1/profiles";

    if (event.httpMethod === "GET") {
      const [usersRes, historyRes] = await Promise.all([
        fetch(usersBase + "?select=id,email,display_name,role,created_at&order=created_at.desc", {
          headers: { apikey: SERVICE_ROLE_KEY, Authorization: "Bearer " + SERVICE_ROLE_KEY }
        }),
        fetch(historyBase + "?select=id,user_id,platform,created_at&order=created_at.desc&limit=100", {
          headers: { apikey: SERVICE_ROLE_KEY, Authorization: "Bearer " + SERVICE_ROLE_KEY }
        })
      ]);

      if (!usersRes.ok || !historyRes.ok) return json(502, { error: "Could not load admin data." });

      const users = await usersRes.json();
      const recent = await historyRes.json();
      const counts = {};
      for (const item of recent) counts[item.platform] = (counts[item.platform] || 0) + 1;

      return json(200, {
        ok: true,
        stats: {
          users: users.length,
          recentRequests: recent.length,
          platforms: counts
        },
        users,
        recent
      });
    }

    return json(405, { error: "GET only." });
  } catch {
    return json(502, { error: "Admin request failed." });
  }
};
