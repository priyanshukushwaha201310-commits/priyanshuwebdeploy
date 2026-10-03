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

function showError(message) {
  error.textContent = message;
  error.classList.remove("hidden");
  result.classList.add("hidden");
}

function clearError() {
  error.classList.add("hidden");
}

async function fetchThumbnail(url) {
  clearError();
  btn.disabled = true;
  btn.textContent = "Fetching…";
  result.classList.add("hidden");

  try {
    const response = await fetch(`/api/thumbnail?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not fetch thumbnail.");

    platform.textContent = data.platform;
    title.textContent = data.title || "Video thumbnail";
    thumb.src = data.thumbnail;
    thumb.onerror = () => {
      if (data.fallbackThumbnail) {
        thumb.src = data.fallbackThumbnail;
      } else {
        showError("The thumbnail URL was returned, but the image could not be loaded.");
      }
    };
    downloadBtn.href = data.thumbnail;

    if (data.fallbackThumbnail) {
      fallbackBtn.href = data.fallbackThumbnail;
      fallbackBtn.classList.remove("hidden");
    } else {
      fallbackBtn.classList.add("hidden");
    }

    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(data.thumbnail);
      const old = copyBtn.textContent;
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => copyBtn.textContent = old, 1400);
    };

    result.classList.remove("hidden");
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    showError(e.message || "Something went wrong.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Fetch Thumbnail";
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  fetchThumbnail(input.value.trim());
});

document.querySelectorAll("[data-example]").forEach((el) => {
  el.addEventListener("click", () => {
    input.value = el.dataset.example;
    fetchThumbnail(input.value);
  });
});