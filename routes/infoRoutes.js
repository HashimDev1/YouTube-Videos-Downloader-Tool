import express from "express";
import { getProvider } from "../services/providers/index.js";
import { isValidUrl } from "../utils/validators.js";

const router = express.Router();

function getFriendlyInfoError(message = "") {
  const lower = message.toLowerCase();

  if (
    lower.includes("video is unavailable") ||
    lower.includes("this video has been removed") ||
    lower.includes("private video")
  ) {
    return "This video is unavailable, private, or has been deleted.";
  }

  if (
    lower.includes("sign in to confirm") ||
    lower.includes("confirm you’re not a bot") ||
    lower.includes("confirm you're not a bot")
  ) {
    return "YouTube bot verification triggered. Cloud server IP may be temporarily blocked.";
  }

  if (
    lower.includes("failed to extract any player response") ||
    lower.includes("player response")
  ) {
    return "Could not retrieve video details from YouTube. The video may be restricted or unavailable.";
  }

  if (lower.includes("copyright") || lower.includes("account terminated")) {
    return "This video is unavailable due to copyright or account termination.";
  }

  if (lower.includes("geo-restricted") || lower.includes("not available in your country")) {
    return "This video is not available in the server's region.";
  }

  return message
    .replace(/^Failed to retrieve metadata:\s*/i, "")
    .replace(/^ERROR:\s*\[.*?\]\s*/i, "")
    .trim() || "Could not fetch details. The platform may be temporarily blocking requests.";
}

router.post("/info", async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const provider = getProvider(url);
  if (!provider) {
    return res.status(400).json({
      error: "Unsupported platform. Please enter a valid YouTube, Facebook, or TikTok URL.",
    });
  }

  try {
    const info = await provider.getInfo(url);
    return res.json(info);
  } catch (error) {
    console.error("Info error:", error.message);

    const friendlyError = getFriendlyInfoError(error.message);
    return res.status(500).json({
      error: friendlyError,
    });
  }
});

export default router;