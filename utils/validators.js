export const allowedFormats = ["mp4", "mp3"];

export const allowedQualities = [
  "144",
  "240",
  "360",
  "480",
  "720",
  "1080",
  "1440",
  "2160",
  "best",
];

export function isValidUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

export function isValidFormat(format) {
  return allowedFormats.includes(format);
}

export function isValidQuality(quality) {
  return allowedQualities.includes(quality);
}