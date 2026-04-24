export function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return "--:--";

  const total = Number(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function extractQualities(formats = []) {
  const found = new Set();

  for (const format of formats) {
    const h = format.height;
    if (!h || format.vcodec === "none") continue;

    if (h >= 2160) found.add("2160");
    else if (h >= 1440) found.add("1440");
    else if (h >= 1080) found.add("1080");
    else if (h >= 720) found.add("720");
    else if (h >= 480) found.add("480");
    else if (h >= 360) found.add("360");
    else if (h >= 240) found.add("240");
    else if (h >= 144) found.add("144");
  }

  const sorted = [...found].sort((a, b) => Number(a) - Number(b));

  if (!sorted.includes("best")) {
    sorted.push("best");
  }

  return sorted;
}