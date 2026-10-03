const ALLOWED_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
  "vimeo.com", "www.vimeo.com",
  "dailymotion.com", "www.dailymotion.com", "dai.ly"
]);

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    },
    body: JSON.stringify(body)
  };
}

function youtubeId(url) {
  if (url.hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || "";
  }
  if (url.pathname === "/watch") return url.searchParams.get("v") || "";
  const parts = url.pathname.split("/").filter(Boolean);
  if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
  return "";
}

function dailymotionId(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "dai.ly") return parts[0] || "";
  const idx = parts.indexOf("video");
  return idx >= 0 ? (parts[idx + 1] || "").split("_")[0] : "";
}

function safeUrl(raw) {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Only HTTP/HTTPS URLs are supported.");
  }
  if (!ALLOWED_HOSTS.has(u.hostname.toLowerCase())) {
    throw new Error("This free version supports YouTube, Vimeo and Dailymotion URLs.");
  }
  return u;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return response(405, { error: "GET only" });

  const raw = typeof event.queryStringParameters?.url === "string"
    ? event.queryStringParameters.url.trim()
    : "";

  if (!raw) return response(400, { error: "Please provide a video URL." });

  let u;
  try {
    u = safeUrl(raw);
  } catch (e) {
    return response(400, { error: e.message });
  }

  const host = u.hostname.toLowerCase();

  try {
    if (host.includes("youtube") || host === "youtu.be") {
      const id = youtubeId(u);
      if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
        return response(400, { error: "Could not find a valid YouTube video ID." });
      }
      const base = `https://img.youtube.com/vi/${id}`;
      return response(200, {
        ok: true,
        platform: "YouTube",
        id,
        title: "YouTube video",
        thumbnail: `${base}/maxresdefault.jpg`,
        fallbackThumbnail: `${base}/hqdefault.jpg`
      });
    }

    if (host.includes("vimeo.com")) {
      const upstream = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u.href)}`,
        { headers: { "User-Agent": "ThumbFetch/1.0" } }
      );
      if (!upstream.ok) {
        return response(404, { error: "Vimeo could not return thumbnail data for this URL." });
      }
      const data = await upstream.json();
      return response(200, {
        ok: true,
        platform: "Vimeo",
        id: String(data.video_id || ""),
        title: data.title || "Vimeo video",
        thumbnail: data.thumbnail_url,
        width: data.thumbnail_width,
        height: data.thumbnail_height
      });
    }

    if (host.includes("dailymotion.com") || host === "dai.ly") {
      const id = dailymotionId(u);
      if (!/^[A-Za-z0-9]+$/.test(id)) {
        return response(400, { error: "Could not find a valid Dailymotion video ID." });
      }
      const dataUrl =
        `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(u.href)}&format=json`;
      const upstream = await fetch(dataUrl, {
        headers: { "User-Agent": "ThumbFetch/1.0" }
      });
      if (!upstream.ok) {
        return response(404, {
          error: "Dailymotion could not return thumbnail data for this URL."
        });
      }
      const data = await upstream.json();
      return response(200, {
        ok: true,
        platform: "Dailymotion",
        id,
        title: data.title || "Dailymotion video",
        thumbnail: data.thumbnail_url
      });
    }
  } catch {
    return response(502, {
      error: "The video service could not be reached right now."
    });
  }

  return response(400, { error: "Unsupported URL." });
};
