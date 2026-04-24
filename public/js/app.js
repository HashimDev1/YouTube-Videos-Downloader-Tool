const urlInput = document.getElementById("url");
const fetchBtn = document.getElementById("fetchBtn");
const startBtn = document.getElementById("startBtn");
const formatSelect = document.getElementById("format");
const qualitySelect = document.getElementById("quality");
const chunkEnabledSelect = document.getElementById("chunkEnabled");
const chunkDurationSelect = document.getElementById("chunkDuration");

const previewCard = document.getElementById("previewCard");
const thumbnail = document.getElementById("thumbnail");
const durationBadge = document.getElementById("durationBadge");
const videoTitle = document.getElementById("videoTitle");
const channelName = document.getElementById("channelName");
const viewCount = document.getElementById("viewCount");
const uploadDate = document.getElementById("uploadDate");
const videoDescription = document.getElementById("videoDescription");
const qualitiesList = document.getElementById("qualitiesList");

const statusEl = document.getElementById("status");
const statusPercent = document.getElementById("statusPercent");
const progressBar = document.getElementById("progressBar");
const downloadLink = document.getElementById("downloadLink");
const hint = document.getElementById("hint");

let pollInterval = null;
let detectedQualities = [];
let selectedQuality = "1080";

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = "status-text";

  if (type) {
    statusEl.classList.add(type);
  }
}

function formatViews(views) {
  if (!views && views !== 0) return "Views: N/A";

  const num = Number(views);

  if (Number.isNaN(num)) {
    return `Views: ${views}`;
  }

  return `Views: ${num.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "Upload: N/A";

  if (/^\d{8}$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);

    return `Upload: ${y}-${m}-${d}`;
  }

  return `Upload: ${value}`;
}

function renderQualities(qualities = []) {
  detectedQualities = qualities.length ? qualities : ["720", "1080", "best"];

  qualitiesList.innerHTML = "";

  detectedQualities.forEach((q) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quality-chip";
    btn.textContent = q === "best" ? "Best" : `${q}p`;
    btn.dataset.quality = q;

    if (q === selectedQuality) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      if (formatSelect.value === "mp3") return;

      selectedQuality = q;
      qualitySelect.value = q;
      renderQualities(detectedQualities);
    });

    qualitiesList.appendChild(btn);
  });

  if (!detectedQualities.includes(qualitySelect.value)) {
    selectedQuality = detectedQualities.includes("1080")
      ? "1080"
      : detectedQualities[0];

    qualitySelect.value = selectedQuality;
    renderQualities(detectedQualities);
  }
}

function syncQualitySelect(qualities = []) {
  const current = qualitySelect.value;

  qualitySelect.innerHTML = "";

  const finalQualities = qualities.length ? qualities : ["720", "1080", "best"];

  finalQualities.forEach((q) => {
    const option = document.createElement("option");
    option.value = q;
    option.textContent = q === "best" ? "Best" : `${q}p`;

    qualitySelect.appendChild(option);
  });

  if (finalQualities.includes(current)) {
    qualitySelect.value = current;
    selectedQuality = current;
  } else if (finalQualities.includes("1080")) {
    qualitySelect.value = "1080";
    selectedQuality = "1080";
  } else {
    qualitySelect.value = finalQualities[0];
    selectedQuality = finalQualities[0];
  }

  renderQualities(finalQualities);
}

function syncChunkUi() {
  const isMp3 = formatSelect.value === "mp3";
  const chunkEnabled = chunkEnabledSelect.value === "true";

  qualitySelect.disabled = isMp3;
  chunkEnabledSelect.disabled = isMp3;
  chunkDurationSelect.disabled = isMp3 || !chunkEnabled;

  const chips = qualitiesList.querySelectorAll(".quality-chip");

  chips.forEach((chip) => {
    chip.disabled = isMp3;
    chip.style.opacity = isMp3 ? "0.5" : "1";
    chip.style.pointerEvents = isMp3 ? "none" : "auto";
  });

  hint.textContent = isMp3
    ? "MP3 selected. Audio download does not use video quality or chunking."
    : chunkEnabled
      ? "MP4 chunk mode is enabled. Final download will be a ZIP containing video parts."
      : "MP4 selected. Pick one of the available video qualities or enable chunking.";
}

async function fetchVideoInfo() {
  const url = urlInput.value.trim();

  if (!url) {
    setStatus("Please enter a URL first.", "error");
    return;
  }

  setStatus("Fetching video details...", "loading");

  fetchBtn.disabled = true;
  fetchBtn.textContent = "Loading...";

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Could not fetch video details");
    }

    previewCard.classList.add("show");
    thumbnail.src = data.thumbnail || "";
    durationBadge.textContent = data.duration || "--:--";
    videoTitle.textContent = data.title || "Unknown title";
    channelName.textContent = data.channel || "Unknown channel";
    viewCount.textContent = formatViews(data.view_count);
    uploadDate.textContent = formatDate(data.upload_date);

    videoDescription.textContent = data.description?.trim()
      ? data.description.slice(0, 180) +
        (data.description.length > 180 ? "..." : "")
      : "No description available.";

    const qualities =
      Array.isArray(data.qualities) && data.qualities.length
        ? data.qualities
        : ["720", "1080", "best"];

    syncQualitySelect(qualities);
    syncChunkUi();

    setStatus(
      "Video details loaded. Choose options and start download.",
      "success",
    );
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Failed to fetch info.", "error");
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = "Get Info";
  }
}

formatSelect.addEventListener("change", () => {
  if (formatSelect.value === "mp3") {
    chunkEnabledSelect.value = "false";
  }

  syncChunkUi();
});

chunkEnabledSelect.addEventListener("change", syncChunkUi);
chunkDurationSelect.addEventListener("change", syncChunkUi);

qualitySelect.addEventListener("change", () => {
  selectedQuality = qualitySelect.value;
  renderQualities(detectedQualities);
});

fetchBtn.addEventListener("click", fetchVideoInfo);

urlInput.addEventListener("paste", () => {
  setTimeout(() => {
    const value = urlInput.value.trim();

    if (value) {
      fetchVideoInfo();
    }
  }, 150);
});

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    fetchVideoInfo();
  }
});

startBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  const format = formatSelect.value;
  const quality = qualitySelect.value;
  const chunk_enabled = format === "mp4" && chunkEnabledSelect.value === "true";
  const chunk_duration_seconds = Number(chunkDurationSelect.value);

  if (!url) {
    setStatus("Please enter a URL.", "error");
    return;
  }

  if (pollInterval) {
    clearInterval(pollInterval);
  }

  progressBar.style.width = "0%";
  statusPercent.textContent = "0%";

  setStatus("Starting download...", "loading");

  downloadLink.classList.remove("show");
  downloadLink.href = "#";

  startBtn.disabled = true;
  startBtn.textContent = "Starting...";

  try {
    const res = await fetch("/api/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        format,
        quality,
        chunk_enabled,
        chunk_duration_seconds,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to start download");
    }

    const jobId = data.jobId;

    pollInterval = setInterval(async () => {
      try {
        const progressRes = await fetch(`/api/progress/${jobId}`);
        const progressData = await progressRes.json();

        if (!progressRes.ok) {
          clearInterval(pollInterval);
          throw new Error(progressData.error || "Progress error");
        }

        const progress = progressData.progress || 0;

        progressBar.style.width = `${progress}%`;
        statusPercent.textContent = `${Math.round(progress)}%`;

        const statusMap = {
          queued: "Queued...",
          downloading: "Downloading video...",
          splitting: "Splitting video into chunks...",
          archiving: "Preparing ZIP file...",
          finished: "Done.",
          error: progressData.error || "Download failed",
        };

        setStatus(
          statusMap[progressData.status] || `Status: ${progressData.status}`,
          progressData.status === "error" ? "error" : "",
        );

        if (progressData.status === "finished") {
          clearInterval(pollInterval);

          progressBar.style.width = "100%";
          statusPercent.textContent = "100%";

          const doneMessage =
            progressData.mode === "chunked"
              ? "Chunked download ready. Click below to download the ZIP file."
              : "Download complete. Click below.";

          setStatus(doneMessage, "success");

          downloadLink.href = `/api/download/${jobId}`;
          downloadLink.classList.add("show");

          startBtn.disabled = false;
          startBtn.textContent = "Download Again";
        }

        if (progressData.status === "error") {
          clearInterval(pollInterval);

          setStatus(progressData.error || "Download failed", "error");

          startBtn.disabled = false;
          startBtn.textContent = "Download Now";
        }
      } catch (err) {
        console.error(err);

        clearInterval(pollInterval);

        setStatus(err.message || "Error checking progress", "error");

        startBtn.disabled = false;
        startBtn.textContent = "Download Now";
      }
    }, 1000);
  } catch (err) {
    console.error(err);

    setStatus(err.message || "Something went wrong", "error");

    startBtn.disabled = false;
    startBtn.textContent = "Download Now";
  }
});

renderQualities(["720", "1080", "best"]);
syncChunkUi();