import http from "http";
import pool from "../config/database.js";
import { broadcast } from "../ws.js";

const CAMERA_STREAM_URL =
  process.env.CAMERA_STREAM_URL || "http://10.0.3.94:81/stream";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5vl:3b";

let dernierDiagnostic = {
  etat: undefined,
  diagnostic: undefined,
  actions: [],
  image: undefined,
  capteurs: undefined,
  date: undefined,
  statut: "vide",
};
let analyseEnCours = false;

const grabJpegFrame = (url, timeoutMs = 15_000) =>
  new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        req.destroy();
        reject(new Error(`Caméra inaccessible (HTTP ${res.statusCode})`));
        return;
      }

      let buffer = Buffer.alloc(0);
      let began = false;

      const flush = (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        if (!began) {
          const start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
          if (start === -1) return;
          buffer = buffer.subarray(start);
          began = true;
        }

        const endIndex = buffer.indexOf(Buffer.from([0xff, 0xd9]), 2);
        if (endIndex !== -1) {
          req.destroy();
          resolve(buffer.subarray(0, endIndex + 2));
        }
      };

      res.on("data", flush);
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("Délai dépassé pendant la capture caméra"));
    });

    req.on("error", reject);
  });

const lireDerniereTelemetrie = async () => {
  const [[plant]] = await pool.query(
    "SELECT * FROM plants WHERE temperature IS NOT NULL AND humidite IS NOT NULL ORDER BY id_plants DESC LIMIT 1",
  );

  if (!plant) {
    return {
      temperature: undefined,
      humidite: undefined,
      luminosite: undefined,
      dernier_arrosage: undefined,
      etat: undefined,
    };
  }

  return {
    temperature: Number(plant.temperature),
    humidite: Number(plant.humidite),
    luminosite: Number(plant.luminosite),
    dernier_arrosage: Number(plant.dernier_arrosage),
    etat: plant.etat_plants,
  };
};

const appelerOllama = async (prompt, base64Image) => {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10 * 60 * 1000),
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      images: [base64Image],
      stream: false,
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama a répondu HTTP ${response.status}`);
  }

  return await response.json();
};

const extraireJson = (texte) => {
  const match = texte.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
};

export const analyser = async (req, res) => {
  if (analyseEnCours) {
    return res.json({ success: true, statut: "en_cours" });
  }

  analyseEnCours = true;
  dernierDiagnostic = {
    etat: undefined,
    diagnostic: undefined,
    actions: [],
    image: undefined,
    capteurs: undefined,
    date: undefined,
    statut: "en_cours",
  };
  broadcast({ type: "ia:diagnostic", data: dernierDiagnostic });

  res.json({ success: true, statut: "en_cours" });

  try {
    const image = await grabJpegFrame(CAMERA_STREAM_URL);
    const base64 = image.toString("base64");

    const capteurs = await lireDerniereTelemetrie();

    const prompt = [
      "Tu es un expert en agronomie pour une serre connectée (SeedLab).",
      "Analyse la photo de la plante et les données capteurs suivantes :",
      `- Température : ${capteurs.temperature ?? "inconnue"} °C`,
      `- Humidité du sol : ${capteurs.humidite ?? "inconnue"} %`,
      `- Luminosité : ${capteurs.luminosite ?? "inconnue"} lux`,
      `- Dernier arrosage : ${capteurs.dernier_arrosage ?? "inconnu"} s`,
      `- État actuel du bac : ${capteurs.etat ?? "inconnu"}`,
      "",
      "Décris l'état réel de la plante visible sur la photo (santé, couleur, flétrissement, parasites...)",
      "et donne des actions concrètes à réaliser.",
      'Réponds UNIQUEMENT en JSON avec le format suivant :',
      '{"etat": "etat ok" | "arrosage requis" | "chaleur excessive", "diagnostic": "texte détaillé en français", "actions": ["action 1", "action 2"]}',
    ].join("\n");

    const resultat = await appelerOllama(prompt, base64);
    const json = extraireJson(resultat.response ?? "");

    dernierDiagnostic = {
      etat:
        json.etat === "arrosage requis" || json.etat === "chaleur excessive"
          ? json.etat
          : json.etat || "etat ok",
      diagnostic: json.diagnostic || "L'IA n'a pas produit d'analyse lisible.",
      actions: Array.isArray(json.actions)
        ? json.actions.map((a) => String(a))
        : [],
      image: `data:image/jpeg;base64,${base64}`,
      capteurs,
      date: new Date().toISOString(),
      statut: "pret",
    };
  } catch (error) {
    console.error("Erreur analyse IA :", error);
    dernierDiagnostic = {
      ...dernierDiagnostic,
      statut: "erreur",
      diagnostic: error instanceof Error ? error.message : "Erreur inconnue lors de l'analyse.",
      date: new Date().toISOString(),
    };
  } finally {
    analyseEnCours = false;
    broadcast({ type: "ia:diagnostic", data: dernierDiagnostic });
  }
};

export const getDiagnostic = async (req, res) => {
  return res.json(dernierDiagnostic);
};