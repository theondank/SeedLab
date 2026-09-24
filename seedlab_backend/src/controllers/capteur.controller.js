import fs from "fs/promises";
import path from "path";
import pool from "../config/database.js";
import { broadcastCapteur } from "../ws.js";

export const getStatusSensors = async (req, res) => {
  try {
    const [[plant]] = await pool.query(
      "SELECT * FROM plants WHERE temperature IS NOT NULL AND humidite IS NOT NULL ORDER BY id_plants DESC LIMIT 1",
    );

    if (!plant) {
      return res.status(404).json({ message: "Aucune donnée disponible" });
    }

    const isOnline = Date.now() - new Date(plant.date_heure).getTime() < 5 * 60 * 1000;

    return res.json({
      online: isOnline,
      temperature: Number(plant.temperature),
      humidite: Number(plant.humidite),
      luminosite: Number(plant.luminosite),
      dernier_arrosage: Number(plant.dernier_arrosage),
      etat: plant.etat_plants,
      date_heure: plant.date_heure,
    });
  } catch (error) {
    console.error("Erreur lecture capteurs :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateSensorData = async (req, res) => {
  try {
    const {
      api_key,
      temperature,
      humidite,
      debit_eau = 0,
      luminosite = 0,
    } = req.body;

    if (api_key !== process.env.SENSOR_API_KEY) {
      return res.status(401).json({ message: "Capteur non autorisé" });
    }

    const temp = Number(temperature);
    const hum = Number(humidite);

    if (isNaN(temp) || isNaN(hum) || temp < -20 || temp > 70 || hum < 0 || hum > 100) {
      return res.status(400).json({ message: "Données de capteurs invalides veuillez controller vos capteurs" });
    }

    const needsWater = hum < 35;
    const etat = needsWater ? "arrosage requis" : temp > 32 ? "chaleur excessive" : "etat ok";

    await pool.query(
      `UPDATE plants 
       SET temperature = ?, humidite = ?, debit_eau = ?, luminosite = ?, etat_plants = ?, date_heure = ?
       ORDER BY id_plants DESC LIMIT 1`,
      [temp, hum, debit_eau, luminosite, etat, new Date()],
    );

    void broadcastCapteur();
    return res.json({
      success: true,
      commands: {
        activer_pompe: needsWater,
        duree_secondes: needsWater ? 4 : 0,
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour capteurs :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getPlantPhoto = async (req, res) => {
  try {
    let photosDir = process.env.PHOTOS_DIR || "/home/admin/photos";

    try {
      await fs.access(photosDir);
    } catch {
      const localFallback = path.resolve(process.cwd(), "photos");
      try {
        await fs.access(localFallback);
        photosDir = localFallback;
      } catch {
        return res.status(404).json({
          success: false,
          message: `Dossier de photos introuvable : ${photosDir}`,
        });
      }
    }

    const entries = await fs.readdir(photosDir, { withFileTypes: true });
    const imageFiles = entries.filter((entry) => entry.isFile() && /\.(jpe?g)$/i.test(entry.name));

    if (imageFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune photo disponible dans le dossier",
      });
    }

    const filesWithStats = await Promise.all(
      imageFiles.map(async (file) => {
        const fullPath = path.join(photosDir, file.name);
        const stats = await fs.stat(fullPath);
        return {
          name: file.name,
          fullPath,
          mtime: stats.mtime,
          size: stats.size,
        };
      })
    );

    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const latestPhoto = filesWithStats[0];

    const imageBuffer = await fs.readFile(latestPhoto.fullPath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

    return res.json({
      success: true,
      filename: latestPhoto.name,
      date: latestPhoto.mtime,
      size: latestPhoto.size,
      mimeType: "image/jpeg",
      image: base64Image,
    });
  } catch (error) {
    console.error("Erreur récupération photo plante :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la photo",
    });
  }
};

