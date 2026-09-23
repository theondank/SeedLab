import { WebSocketServer } from "ws";
import pool from "./config/database.js";

const wss = new WebSocketServer({ noServer: true });

export const setupWebSocket = (server) => {
  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeat));
};

const buildStatus = (plant) => ({
  online:
    Date.now() - new Date(plant.date_heure).getTime() < 5 * 60 * 1000,
  temperature: Number(plant.temperature),
  humidite: Number(plant.humidite),
  luminosite: Number(plant.luminosite),
  dernier_arrosage: Number(plant.dernier_arrosage),
  etat: plant.etat_plants,
  date_heure: plant.date_heure,
});

export const broadcastCapteur = async () => {
  try {
    const [[plant]] = await pool.query(
      "SELECT * FROM plants ORDER BY id DESC LIMIT 1",
    );
    if (!plant) return;

    broadcast({ type: "capteur:update", data: buildStatus(plant) });
  } catch (error) {
    console.error("Erreur broadcast capteur :", error);
  }
};

export const broadcast = (message) => {
  const raw = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(raw);
    }
  }
};