import express from "express";
import { getProvider } from "../services/providers/index.js";
import { isValidUrl } from "../utils/validators.js";

const router = express.Router();

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

    return res.status(500).json({
      error:
        error.message ||
        "Could not fetch details. The platform may be blocking this server.",
    });
  }
});

export default router;