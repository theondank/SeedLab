import pool from "../config/database.js";
import { broadcastCapteur } from "../ws.js";

/**
 * 1. LECTURE (Front-end) : GET /api/capteurs/status
 */
export const getStatusSensors = async (req, res) => {
  try {
    const [[plant]] = await pool.query(
      "SELECT * FROM plants WHERE temperature IS NOT NULL AND humidite IS NOT NULL ORDER BY id DESC LIMIT 1",
    );

    if (!plant) {
      return res.status(404).json({ message: "Aucune donnée disponible" });
    }

    const isOnline =
      Date.now() - new Date(plant.date_heure).getTime() < 5 * 60 * 1000;

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

    if (
      isNaN(temp) ||
      isNaN(hum) ||
      temp < -20 ||
      temp > 70 ||
      hum < 0 ||
      hum > 100
    ) {
      return res.status(400).json({ message: "Données de capteurs invalides veuillez controller vos capteurs" });
    }

    const needsWater = hum < 35;
    const etat = needsWater
      ? "arrosage requis"
      : temp > 32
        ? "chaleur excessive"
        : "etat ok";

    await pool.query(
      `UPDATE plants 
       SET temperature = ?, humidite = ?, debit_eau = ?, luminosite = ?, etat_plants = ?, date_heure = ?
       ORDER BY id DESC LIMIT 1`,
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
