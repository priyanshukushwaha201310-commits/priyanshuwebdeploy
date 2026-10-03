const form = document.getElementById("fetchForm");
const input = document.getElementById("urlInput");
const btn = document.getElementById("fetchBtn");
const result = document.getElementById("result");
const error = document.getElementById("error");
const thumb = document.getElementById("thumb");
const title = document.getElementById("title");
const platform = document.getElementById("platform");
const downloadBtn = document.getElementById("downloadBtn");
const fallbackBtn = document.getElementById("fallbackBtn");
const copyBtn = document.getElementById("copyBtn");

let supabaseClient = null;
let currentUser = null;
let authMode = "login";
let currentData = null;

const $ = (id) => document.getElementById(id);

function showError(message) {
  error.textContent = message;
  error.classList.remove("hidden");
  result.classList.add("hidden");
}
function clearError() { error.classList.add("hidden"); }

async function initAuth() {
  try {
    const r = await fetch("/api/config");
    const config = await r.json();
    if (!r.ok || !config.ok) throw new Error(config.error || "Auth is not configured.");
    supabaseClient = window.supabase.createClient(config.url, config.key);
    const { data } = await supabaseClient.auth.getSession();
    setUser(data.session?.user || null);
    supabaseClient.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
  } catch (e) {
    console.warn("Supabase auth unavailable:", e.message);
    $("authBtn").textContent = "Login unavailable";
    $("authBtn").disabled = true;
  }
}

function setUser(user) {
  currentUser = user;
  const account = $("account");
  if (!user) {
    account.classList.add("hidden");
    $("authBtn").textContent = "Login / Sign up";
    $("adminBtn").classList.add("hidden");
    return;
  }
  account.classList.remove("hidden");
  $("authBtn").textContent = user.email || "Account";
  $("accountTitle").textContent = user.user_metadata?.display_name || "Your account";
  $("accountEmail").textContent = user.email || "";
  loadProfileRole();
}

async function loadProfileRole() {
  if (!currentUser) return;
  const { data } = await supabaseClient.from("profiles").select("role").eq("id", currentUser.id).maybeSingle();
  if (data?.role === "admin") $("adminBtn").classList.remove("hidden");
}

function openAuth(mode = "login") {
  authMode = mode;
  $("authModal").classList.remove("hidden");
  $("authTitle").textContent = mode === "login" ? "Login" : "Create account";
  $("authSubmit").textContent = mode === "login" ? "Login" : "Sign up";
  $("authName").classList.toggle("hidden", mode === "login");
  $("authSwitch").textContent = mode === "login" ? "Need an account? Sign up" : "Already have an account? Login";
}
function closeAuth() { $("authModal").classList.add("hidden"); }

$("authBtn").addEventListener("click", () => currentUser ? $("account").scrollIntoView({behavior:"smooth"}) : openAuth());
$("closeAuth").addEventListener("click", closeAuth);
$("authSwitch").addEventListener("click", () => openAuth(authMode === "login" ? "signup" : "login"));

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();
  const submit = $("authSubmit");
  submit.disabled = true;
  try {
    let response;
    if (authMode === "login") {
      response = await supabaseClient.auth.signInWithPassword({ email, password });
    } else {
      response = await supabaseClient.auth.signUp({ email, password, options: { data: { display_name: name } } });
    }
    if (response.error) throw response.error;
    if (authMode === "signup" && !response.data.session) {
      $("authMessage").textContent = "Account created. Check your email if confirmation is enabled, then log in.";
    } else {
      closeAuth();
    }
  } catch (e) {
    $("authMessage").textContent = e.message || "Authentication failed.";
  } finally {
    submit.disabled = false;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await supabaseClient?.auth.signOut();
  $("historyList").innerHTML = "";
  $("adminPanel").innerHTML = "";
});

async function authHeaders() {
  if (!supabaseClient) return {};
  const { data } = await supabaseClient.auth.getSession();
  return data.session ? { Authorization: "Bearer " + data.session.access_token } : {};
}

async function saveHistory(data, sourceUrl) {
  if (!currentUser) return;
  try {
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({
        video_url: sourceUrl, platform: data.platform,
        title: data.title, thumbnail_url: data.thumbnail
      })
    });
  } catch {}
}

async function fetchThumbnail(url) {
  clearError();
  btn.disabled = true;
  btn.textContent = "Fetching…";
  result.classList.add("hidden");
  try {
    const response = await fetch("/api/thumbnail?url=" + encodeURIComponent(url));
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not fetch thumbnail.");
    currentData = data;
    platform.textContent = data.platform;
    title.textContent = data.title || "Video thumbnail";
    thumb.src = data.thumbnail;
    thumb.onerror = () => data.fallbackThumbnail ? (thumb.src = data.fallbackThumbnail) :
      showError("The thumbnail URL was returned, but the image could not be loaded.");
    downloadBtn.href = data.thumbnail;
    if (data.fallbackThumbnail) {
      fallbackBtn.href = data.fallbackThumbnail;
      fallbackBtn.classList.remove("hidden");
    } else fallbackBtn.classList.add("hidden");
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(data.thumbnail);
      const old = copyBtn.textContent; copyBtn.textContent = "Copied ✓";
      setTimeout(() => copyBtn.textContent = old, 1400);
    };
    await saveHistory(data, url);
    result.classList.remove("hidden");
    result.scrollIntoView({behavior:"smooth", block:"start"});
  } catch (e) {
    showError(e.message || "Something went wrong.");
  } finally {
    btn.disabled = false; btn.textContent = "Fetch Thumbnail";
  }
}

async function loadHistory() {
  if (!currentUser) return openAuth();
  const r = await fetch("/api/history?limit=50", {headers: await authHeaders()});
  const data = await r.json();
  if (!r.ok) return showError(data.error || "Could not load history.");
  $("historyList").innerHTML = data.items.length ? data.items.map(item =>
    '<div class="history-item"><img src="' + item.thumbnail_url + '" alt=""><div><strong>' +
    escapeHtml(item.title || item.platform) + '</strong><small>' + escapeHtml(item.platform) +
    ' • ' + new Date(item.created_at).toLocaleString() + '</small><a href="' +
    escapeAttr(item.video_url) + '" target="_blank" rel="noreferrer">Open video</a></div><button data-history-id="' +
    item.id + '">Delete</button></div>').join("") : '<p class="hint">No saved thumbnails yet.</p>';
  document.querySelectorAll("[data-history-id]").forEach(b => b.onclick = () => deleteHistory(b.dataset.historyId));
}
async function deleteHistory(id) {
  await fetch("/api/history?id=" + encodeURIComponent(id), {method:"DELETE", headers: await authHeaders()});
  loadHistory();
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }

async function loadAdmin() {
  const r = await fetch("/api/admin", {headers: await authHeaders()});
  const data = await r.json();
  if (!r.ok) return showError(data.error || "Admin access required.");
  const p = data.stats.platforms || {};
  $("adminPanel").classList.remove("hidden");
  $("adminPanel").innerHTML = '<div class="admin-grid"><div><b>' + data.stats.users +
    '</b><span>Users</span></div><div><b>' + data.stats.recentRequests +
    '</b><span>Recent requests</span></div><div><b>' + Object.keys(p).length +
    '</b><span>Platforms</span></div></div><h3>Users</h3><div class="admin-users">' +
    data.users.map(u => '<div><span>' + escapeHtml(u.email || "") + '</span><small>' +
    escapeHtml(u.role) + ' • ' + new Date(u.created_at).toLocaleDateString() + '</small></div>').join("") +
    '</div>';
}
$("historyBtn").addEventListener("click", loadHistory);
$("adminBtn").addEventListener("click", loadAdmin);

form.addEventListener("submit", e => { e.preventDefault(); fetchThumbnail(input.value.trim()); });
document.querySelectorAll("[data-example]").forEach(el => el.addEventListener("click", () => {
  input.value = el.dataset.example; fetchThumbnail(input.value);
}));
initAuth();
