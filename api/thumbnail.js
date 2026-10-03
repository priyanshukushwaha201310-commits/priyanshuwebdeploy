const ALLOWED_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
  "vimeo.com", "www.vimeo.com",
  "dailymotion.com", "www.dailymotion.com", "dai.ly"
]);

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function hostOf(value) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return ""; }
}

function youtubeId(url) {
  const u = new URL(url);
  if (u.hostname.includes("youtu.be")) return u.pathname.split("/").filter(Boolean)[0] || "";
  if (u.pathname === "/watch") return u.searchParams.get("v") || "";
  const parts = u.pathname.split("/").filter(Boolean);
  if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
  return "";
}

function dailymotionId(url) {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  if (u.hostname === "dai.ly") return parts[0] || "";
  const idx = parts.indexOf("video");
  return idx >= 0 ? (parts[idx + 1] || "").split("_")[0] : "";
}

function safeUrl(raw) {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only HTTP/HTTPS URLs are supported.");
  if (!ALLOWED_HOSTS.has(u.hostname.toLowerCase())) throw new Error("This free version supports YouTube, Vimeo and Dailymotion URLs.");
  return u;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });

  const raw = typeof req.query?.url === "string" ? req.query.url.trim() : "";
  if (!raw) return json(res, 400, { error: "Please provide a video URL." });

  let u;
  try { u = safeUrl(raw); } catch (e) {
    return json(res, 400, { error: e.message });
  }

  const host = u.hostname.toLowerCase();

  try {
    if (host.includes("youtube") || host === "youtu.be") {
      const id = youtubeId(u);
      if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return json(res, 400, { error: "Could not find a valid YouTube video ID." });
      const base = `https://img.youtube.com/vi/${id}`;
      return json(res, 200, {
        ok: true, platform: "YouTube", id,
        title: "YouTube video",
        thumbnail: `${base}/maxresdefault.jpg`,
        fallbackThumbnail: `${base}/hqdefault.jpg`
      });
    }

    if (host.includes("vimeo.com")) {
      const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u.href)}`, {
        headers: { "User-Agent": "ThumbnailFetcher/1.0" }
      });
      if (!response.ok) return json(res, 404, { error: "Vimeo could not return thumbnail data for this URL." });
      const data = await response.json();
      return json(res, 200, {
        ok: true, platform: "Vimeo", id: String(data.video_id || ""),
        title: data.title || "Vimeo video",
        thumbnail: data.thumbnail_url,
        width: data.thumbnail_width,
        height: data.thumbnail_height
      });
    }

    if (host.includes("dailymotion.com") || host === "dai.ly") {
      const id = dailymotionId(u);
      if (!/^[A-Za-z0-9]+$/.test(id)) return json(res, 400, { error: "Could not find a valid Dailymotion video ID." });
      const dataUrl = `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(u.href)}&format=json`;
      const response = await fetch(dataUrl, { headers: { "User-Agent": "ThumbnailFetcher/1.0" } });
      if (!response.ok) return json(res, 404, { error: "Dailymotion could not return thumbnail data for this URL." });
      const data = await response.json();
      return json(res, 200, {
        ok: true, platform: "Dailymotion", id,
        title: data.title || "Dailymotion video",
        thumbnail: data.thumbnail_url
      });
    }
  } catch (e) {
    return json(res, 502, { error: "The video service could not be reached right now." });
  }

  return json(res, 400, { error: "Unsupported URL." });
};