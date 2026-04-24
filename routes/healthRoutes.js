import express from "express";
import { downloadsDir, FFMPEG_EXE, hasCookies } from "../config/paths.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    platform: process.platform,
    downloadsDir,
    ffmpeg: FFMPEG_EXE,
    cookiesEnabled: hasCookies,
  });
});

export default router;