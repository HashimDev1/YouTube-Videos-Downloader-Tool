import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { downloadsDir } from "./config/paths.js";
import healthRoutes from "./routes/healthRoutes.js";
import infoRoutes from "./routes/infoRoutes.js";
import downloadRoutes from "./routes/downloadRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", healthRoutes);
app.use("/api", infoRoutes);
app.use("/api", downloadRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});