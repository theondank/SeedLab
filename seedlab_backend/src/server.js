import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";

import pool from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import capteurRoutes from "./routes/capteur.routes.js";
import plantesRoutes from "./routes/plantes.routes.js";
import iaRoutes from "./routes/ia.routes.js";
import { setupWebSocket } from "./ws.js";
import { demarrerAnalysePeriodique } from "./controllers/ia.controller.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api", (req, res) => {
  res.json({
    message: "API is running",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS connected");

    res.json({
      success: true,
      database: rows[0],
    });
  } catch (error) {
    console.error("Erreur MySQL :", error);

    res.status(500).json({
      success: false,
      message: "Connexion MySQL impossible",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/capteurs", capteurRoutes);
app.use("/api/plantes", plantesRoutes);
app.use("/api/ia", iaRoutes);


const server = createServer(app);
setupWebSocket(server);
demarrerAnalysePeriodique();

server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
