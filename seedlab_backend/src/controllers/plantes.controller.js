import pool from "../config/database.js";

const mapPlant = (plant) => ({
  id: plant.id,
  nom: plant.nom,
  temperature: Number(plant.temperature),
  humidite: Number(plant.humidite),
  luminosite: Number(plant.luminosite),
  etat: plant.etat_plants,
  dernier_arrosage: Number(plant.dernier_arrosage),
  date_heure: plant.date_heure,
});

export const listPlants = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM plants WHERE temperature IS NULL AND humidite IS NULL ORDER BY id DESC",
    );

    return res.json({ plantes: rows.map(mapPlant) });
  } catch (error) {
    console.error("Erreur liste plantes :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const createPlant = async (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom || !String(nom).trim()) {
      return res.status(400).json({ message: "Le nom de la plante est requis" });
    }

    const [result] = await pool.query(
      "INSERT INTO plants (nom, etat_plants) VALUES (?, ?)",
      [String(nom).trim(), "etat ok"],
    );

    const [[plant]] = await pool.query(
      "SELECT * FROM plants WHERE id = ?",
      [result.insertId],
    );

    return res.status(201).json({ plante: mapPlant(plant) });
  } catch (error) {
    console.error("Erreur création plante :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};