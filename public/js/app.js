// Element bindings
const urlInput = document.getElementById("url");
const fetchBtn = document.getElementById("fetchBtn");
const startBtn = document.getElementById("startBtn");
const formatSelect = document.getElementById("format");
const qualitySelect = document.getElementById("quality");
const chunkEnabledSelect = document.getElementById("chunkEnabled");
const chunkDurationSelect = document.getElementById("chunkDuration");

const previewCard = document.getElementById("previewCard");
const previewSkeleton = document.getElementById("previewSkeleton");
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

// New dynamic elements
const platformIconIndicator = document.getElementById("platformIconIndicator");
const platformBadge = document.getElementById("platformBadge");
const historyFilter = document.getElementById("historyFilter");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Active session state
let activeVideoData = null; // Stored metadata from fetch
let currentActiveJobId = null; // Track job shown in main status box
const activeJobs = new Map(); // jobId -> Job details

let detectedQualities = [];
let selectedQuality = "1080";

// --- Inline SVGs for Platform Icons ---
function getPlatformIconSvg(platform) {
  const playSvg = `<svg viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.522 3.54 12 3.54 12 3.54s-7.522 0-9.388.515A3.003 3.003 0 0 0 .502 6.163C0 8.029 0 12 0 12s0 3.971.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.866.515 9.388.515 9.388.515s7.522 0 9.388-.515a3.003 3.003 0 0 0 2.11-2.108C24 15.971 24 12 24 12s0-3.971-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
  const fbSvg = `<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
  const tiktokSvg = `<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.52-4.06-1.39-.77-.57-1.39-1.34-1.85-2.2v8.14c.07 1.93-.42 3.91-1.62 5.42-1.38 1.77-3.69 2.78-5.94 2.66-2.2-.08-4.43-1.12-5.74-2.92-1.49-1.99-1.88-4.78-1.04-7.1 1.02-2.88 3.86-4.94 6.94-4.88.08 1.5.03 3 .03 4.5-1.49-.07-3.08.57-3.87 1.83-.89 1.34-.84 3.23.16 4.49.95 1.25 2.69 1.83 4.21 1.48 1.45-.3 2.62-1.53 2.87-2.99.13-1.03.04-2.07.04-3.11V0h.03z"/></svg>`;

  if (platform === "YouTube") return playSvg;
  if (platform === "Facebook") return fbSvg;
  if (platform === "TikTok") return tiktokSvg;
  return "";
}

// --- Trigger Native Browser Download directly to User Storage ---
function triggerBrowserDownload(url) {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "");
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch {
      // ignore
    }
  }, 200);
}

// --- Platform Auto Detection ---
function detectPlatformFromUrl(url) {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
  if (/tiktok\.com|vm\.tiktok\.com/i.test(url)) return "TikTok";
  return null;
}

function updatePlatformUi() {
  const url = urlInput.value.trim();
  const platform = detectPlatformFromUrl(url);

  if (platform) {
    platformIconIndicator.className = `platform-icon-indicator detected ${platform.toLowerCase()}`;
    platformIconIndicator.innerHTML = getPlatformIconSvg(platform);

    // Toggle platform-specific UI fields
    const chunkField = document.getElementById("chunkField");
    const chunkDurationField = document.getElementById("chunkDurationField");
    const tiktokWatermarkField = document.getElementById("tiktokWatermarkField");

    if (platform === "TikTok") {
      if (chunkField) chunkField.style.display = "none";
      if (chunkDurationField) chunkDurationField.style.display = "none";
      if (tiktokWatermarkField) tiktokWatermarkField.style.display = "block";
    } else {
      if (chunkField) chunkField.style.display = "block";
      if (chunkDurationField) chunkDurationField.style.display = "block";
      if (tiktokWatermarkField) tiktokWatermarkField.style.display = "none";
    }
  } else {
    platformIconIndicator.className = "platform-icon-indicator";
    platformIconIndicator.innerHTML = "";
  }
}

// --- Toast notifications ---
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const iconSvg = {
    success: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    error: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    info: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
  }[type];

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-content">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// --- Helper formats ---
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

// --- Quality chip rendering ---
function renderQualities(qualities = []) {
  detectedQualities = qualities.length ? qualities : ["720", "1080", "best"];
  qualitiesList.innerHTML = "";

  detectedQualities.forEach((q) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quality-chip";

    // Standardize chip label texts
    let label = q;
    if (q === "best") label = "Best Quality";
    else if (q === "original") label = "Original (Watermark-free)";
    else if (q === "hd") label = "HD Quality";
    else if (q === "sd") label = "SD Quality";
    else label = `${q}p`;

    // Append file size estimation if available
    if (activeVideoData && activeVideoData.estimated_sizes && activeVideoData.estimated_sizes[q]) {
      label += ` (~${activeVideoData.estimated_sizes[q]})`;
    }

    btn.textContent = label;
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
      : detectedQualities.includes("best")
        ? "best"
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
    
    let label = q;
    if (q === "best") label = "Best";
    else if (q === "original") label = "Original";
    else if (q === "hd") label = "HD";
    else if (q === "sd") label = "SD";
    else label = `${q}p`;
    
    option.textContent = label;
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
  const platform = detectPlatformFromUrl(urlInput.value.trim());

  qualitySelect.disabled = isMp3;
  
  if (platform === "TikTok") {
    chunkEnabledSelect.disabled = true;
    chunkDurationSelect.disabled = true;
  } else {
    chunkEnabledSelect.disabled = isMp3;
    chunkDurationSelect.disabled = isMp3 || !chunkEnabled;
  }

  const chips = qualitiesList.querySelectorAll(".quality-chip");
  chips.forEach((chip) => {
    chip.disabled = isMp3;
    chip.style.opacity = isMp3 ? "0.5" : "1";
    chip.style.pointerEvents = isMp3 ? "none" : "auto";
  });

  if (isMp3) {
    hint.textContent = "MP3 selected. Audio download does not use video quality or chunking.";
  } else if (platform === "TikTok") {
    hint.textContent = "TikTok MP4 selected. Video will be downloaded watermark-free.";
  } else if (chunkEnabled) {
    hint.textContent = "MP4 chunk mode is enabled. Final download will be a ZIP containing video parts.";
  } else {
    hint.textContent = "MP4 selected. Pick one of the available video qualities or enable chunking.";
  }
}

// --- Fetch Video Metadata ---
async function fetchVideoInfo() {
  const url = urlInput.value.trim();

  if (!url) {
    setStatus("Please enter a URL first.", "error");
    showToast("Please enter a URL first.", "error");
    return;
  }

  // Show skeleton loader and hide card during slide transition
  if (previewSkeleton) previewSkeleton.style.display = "block";
  previewCard.classList.remove("show");

  setStatus("Fetching video details...", "loading");
  fetchBtn.disabled = true;
  fetchBtn.textContent = "LOADING...";

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

    activeVideoData = data;

    // Populate data with nice slide animations
    thumbnail.src = data.thumbnail || "";
    durationBadge.textContent = data.duration || "--:--";
    videoTitle.textContent = data.title || "Unknown title";
    channelName.textContent = data.channel || "Unknown channel";
    viewCount.textContent = formatViews(data.view_count);
    uploadDate.textContent = formatDate(data.upload_date);

    videoDescription.textContent = data.description?.trim()
      ? data.description.slice(0, 180) + (data.description.length > 180 ? "..." : "")
      : "No description available.";

    // Expose platform badge
    if (platformBadge) {
      platformBadge.textContent = data.platform || "YouTube";
      platformBadge.className = `platform-badge show ${data.platform ? data.platform.toLowerCase() : "youtube"}`;
    }

    const qualities = Array.isArray(data.qualities) && data.qualities.length
      ? data.qualities
      : ["720", "1080", "best"];

    syncQualitySelect(qualities);
    syncChunkUi();

    // Trigger slide transition
    if (previewSkeleton) previewSkeleton.style.display = "none";
    previewCard.classList.add("show");

    setStatus("Video details loaded. Choose options and start download.", "success");
    showToast("Details loaded successfully!", "success");
  } catch (err) {
    console.error(err);
    if (previewSkeleton) previewSkeleton.style.display = "none";
    setStatus(err.message || "Failed to fetch info.", "error");
    showToast(err.message || "Failed to fetch details.", "error");
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = "GET INFO";
  }
}

// --- Download Queue implementation ---
function addJobToQueue(job) {
  activeJobs.set(job.jobId, job);
  renderQueue();
  pollJobProgress(job.jobId);
}

function renderQueue() {
  const queueList = document.getElementById("queueList");
  const emptyQueue = document.getElementById("emptyQueue");
  if (!queueList) return;

  if (activeJobs.size === 0) {
    if (emptyQueue) emptyQueue.style.display = "block";
    return;
  } else {
    if (emptyQueue) emptyQueue.style.display = "none";
  }

  const existingCards = queueList.querySelectorAll(".queue-card");
  const activeIds = new Set(activeJobs.keys());

  // Render/Update cards
  activeJobs.forEach((job, jobId) => {
    let card = queueList.querySelector(`.queue-card[data-job-id="${jobId}"]`);
    if (!card) {
      card = document.createElement("div");
      card.className = "queue-card";
      card.dataset.jobId = jobId;
      queueList.appendChild(card);
    }

    const progress = job.progress || 0;
    const isFinished = job.status === "finished";
    const isError = job.status === "error";

    let actionHtml = "";
    if (isFinished) {
      actionHtml = `
        <a class="btn-icon download-btn-ready" href="/api/download/${jobId}" title="Download File">
          <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
        </a>
      `;
    } else if (isError) {
      actionHtml = `
        <button class="btn-icon" onclick="removeJobFromQueue('${jobId}')" title="Dismiss Error">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      `;
    } else {
      actionHtml = `
        <button class="btn-icon" onclick="removeJobFromQueue('${jobId}')" title="Cancel/Remove">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="queue-card-thumb-wrap">
        <img class="queue-card-thumb" src="${job.thumbnail || 'https://placehold.co/120x68?text=Video'}" alt="Thumb" onerror="this.src='https://placehold.co/120x68?text=Video'"/>
      </div>
      <div class="queue-card-details">
        <h4 class="queue-card-title">${job.title}</h4>
        <div class="queue-card-meta">
          <span class="queue-badge ${job.platform.toLowerCase()}">${job.platform}</span>
          <span>• ${job.format.toUpperCase()} (${job.quality})</span>
          <span>• Speed: ${job.speed || "0 KB/s"}</span>
          <span>• ETA: ${job.eta || "--:--"}</span>
          <span>• Size: ${job.fileSize || "Calculating..."}</span>
        </div>
        <div class="queue-card-progress-container">
          <div class="queue-card-bar-wrap">
            <div class="queue-card-bar" style="width: ${progress}%"></div>
          </div>
          <span class="queue-card-percent">${Math.round(progress)}%</span>
        </div>
      </div>
      <div class="queue-card-actions">
        ${actionHtml}
      </div>
    `;
  });

  // Clean obsolete cards
  existingCards.forEach(c => {
    if (!activeIds.has(c.dataset.jobId)) {
      c.remove();
    }
  });
}

window.removeJobFromQueue = function(jobId) {
  activeJobs.delete(jobId);
  if (currentActiveJobId === jobId) {
    currentActiveJobId = null;
    progressBar.style.width = "0%";
    statusPercent.textContent = "0%";
    setStatus("Waiting for a link...", "");
  }
  renderQueue();
  showToast("Item removed from queue.", "info");
};

// --- Sync Main Panel Status Box ---
function syncMainStatusBox(job) {
  const progress = job.progress || 0;
  progressBar.style.width = `${progress}%`;
  statusPercent.textContent = `${Math.round(progress)}%`;

  const statusMap = {
    queued: "Queued...",
    downloading: `Downloading video... (${job.speed || "0 KB/s"}, ETA: ${job.eta || "--:--"})`,
    splitting: "Splitting video into chunks...",
    archiving: "Preparing ZIP file...",
    finished: "Done.",
    error: job.error || "Download failed",
  };

  setStatus(
    statusMap[job.status] || `Status: ${job.status}`,
    job.status === "error" ? "error" : job.status === "finished" ? "success" : "loading"
  );

  if (job.status === "finished") {
    downloadLink.href = `/api/download/${job.jobId}`;
    downloadLink.classList.add("show");
    startBtn.disabled = false;
    startBtn.textContent = "DOWNLOAD AGAIN";
  } else if (job.status === "error") {
    downloadLink.classList.remove("show");
    startBtn.disabled = false;
    startBtn.textContent = "DOWNLOAD NOW";
  }
}

// --- Job Poller ---
function pollJobProgress(jobId) {
  const interval = setInterval(async () => {
    const job = activeJobs.get(jobId);
    if (!job || job.status === "finished" || job.status === "error") {
      clearInterval(interval);
      return;
    }

    try {
      const res = await fetch(`/api/progress/${jobId}`);
      if (!res.ok) {
        throw new Error("Job polling error");
      }
      const data = await res.json();

      const updatedJob = { ...job, ...data, jobId };
      activeJobs.set(jobId, updatedJob);
      renderQueue();

      if (currentActiveJobId === jobId) {
        syncMainStatusBox(updatedJob);
      }

      if (data.status === "finished") {
        clearInterval(interval);
        showToast(`Download ready! Saving to your storage...`, "success");
        
        // Trigger Chrome/browser download to user storage
        triggerBrowserDownload(`/api/download/${jobId}`);

        saveToHistory({
          title: job.title,
          thumbnail: job.thumbnail,
          platform: job.platform,
          format: job.format,
          quality: job.quality,
          fileSize: data.fileSize || job.fileSize || "Unknown",
          downloadUrl: `/api/download/${jobId}`
        });
      } else if (data.status === "error") {
        clearInterval(interval);
        showToast(`Download failed: ${data.error || job.title}`, "error");
      }
    } catch (err) {
      console.error(err);
      clearInterval(interval);
      activeJobs.set(jobId, { ...job, status: "error", error: "Lost connection to server." });
      renderQueue();
      if (currentActiveJobId === jobId) {
        setStatus("Lost connection to server.", "error");
        startBtn.disabled = false;
        startBtn.textContent = "DOWNLOAD NOW";
      }
      showToast("Progress checking failed.", "error");
    }
  }, 1000);
}

// --- History storage & rendering ---
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("download_history")) || [];
  } catch {
    return [];
  }
}

function saveToHistory(item) {
  const history = loadHistory();
  // Filter duplicates
  const isDuplicate = history.some(h => h.title === item.title && h.format === item.format && h.quality === item.quality);
  if (isDuplicate) return;

  history.unshift({
    id: Date.now(),
    date: new Date().toLocaleString(),
    ...item
  });
  localStorage.setItem("download_history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const filter = historyFilter.value;
  const history = loadHistory();
  const filtered = filter === "all" ? history : history.filter(h => h.platform === filter);

  if (filtered.length === 0) {
    historyList.innerHTML = `<tr class="empty-row"><td colspan="7">No download history yet.</td></tr>`;
    return;
  }

  historyList.innerHTML = filtered.map(item => `
    <tr>
      <td>
        <span class="queue-badge ${item.platform.toLowerCase()}">${item.platform}</span>
      </td>
      <td>
        <div class="history-thumb-wrap">
          <img class="history-thumb" src="${item.thumbnail}" alt="thumbnail" onerror="this.src='https://placehold.co/120x68?text=Video'"/>
        </div>
      </td>
      <td>
        <div class="history-title" title="${item.title}">${item.title}</div>
      </td>
      <td>
        <strong>${item.format.toUpperCase()}</strong> (${item.quality === "best" ? "Best" : item.quality === "original" ? "Original" : item.quality + "p"})
      </td>
      <td>${item.fileSize || "Unknown"}</td>
      <td>${item.date.split(",")[0]}</td>
      <td>
        <a class="history-action-btn" href="${item.downloadUrl || '#'}" download>
          Download
        </a>
      </td>
    </tr>
  `).join("");
}

// --- Event Handlers ---
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

let autoFetchTimeout = null;

urlInput.addEventListener("input", () => {
  updatePlatformUi();
  clearTimeout(autoFetchTimeout);
  const val = urlInput.value.trim();
  if (detectPlatformFromUrl(val)) {
    autoFetchTimeout = setTimeout(() => {
      fetchVideoInfo();
    }, 400);
  }
});

urlInput.addEventListener("paste", () => {
  setTimeout(() => {
    updatePlatformUi();
    const value = urlInput.value.trim();
    if (value && detectPlatformFromUrl(value)) {
      fetchVideoInfo();
    }
  }, 100);
});

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    fetchVideoInfo();
  }
});

// Download button click
startBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  const format = formatSelect.value;
  const quality = qualitySelect.value;
  const chunk_enabled = format === "mp4" && chunkEnabledSelect.value === "true";
  const chunk_duration_seconds = Number(chunkDurationSelect.value);

  if (!url) {
    setStatus("Please enter a URL.", "error");
    showToast("Please enter a URL.", "error");
    return;
  }

  // Fallback metadata if not fetched
  const title = activeVideoData ? activeVideoData.title : "Video Link";
  const thumbnail = activeVideoData ? activeVideoData.thumbnail : "";
  const platform = detectPlatformFromUrl(url) || "YouTube";

  progressBar.style.width = "0%";
  statusPercent.textContent = "0%";
  setStatus("Starting download...", "loading");
  showToast("Queueing download...", "info");

  downloadLink.classList.remove("show");
  downloadLink.href = "#";

  startBtn.disabled = true;
  startBtn.textContent = "STARTING...";

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
        title,
        thumbnail,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to start download");
    }

    const jobId = data.jobId;
    currentActiveJobId = jobId;

    showToast("Download started!", "success");

    addJobToQueue({
      jobId,
      title,
      thumbnail,
      platform,
      format,
      quality,
      progress: 0,
      speed: "0 KB/s",
      eta: "--:--",
      fileSize: "Calculating...",
      status: "queued",
    });
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Something went wrong", "error");
    showToast(err.message || "Failed to start download.", "error");
    startBtn.disabled = false;
    startBtn.textContent = "DOWNLOAD NOW";
  }
});

// Clear history action
clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear your download history?")) {
    localStorage.removeItem("download_history");
    renderHistory();
    showToast("Download history cleared.", "info");
  }
});

historyFilter.addEventListener("change", renderHistory);

// Initial bootstrap
updatePlatformUi();
renderQualities(["720", "1080", "best"]);
syncChunkUi();
renderHistory();
renderQueue();